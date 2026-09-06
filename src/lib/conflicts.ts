import type { PmacEventStatus, Prisma, RequestStatus } from "@prisma/client"
import { differenceInCalendarDays, isSameDay, max, min } from "date-fns"

import { prisma } from "@/lib/prisma"
import { sanitizeSingleLineText } from "@/lib/sanitization"

interface ConflictCheckInput {
  startDate: string
  startTime?: string
  endDate?: string
  endTime?: string
  eventVenue?: string
  currentRequestId?: string
}

interface BookingRecord {
  eventTitle: string
  eventDate: Date
  endDate: Date | null
  startTime: string | null
  endTime: string | null
  status: RequestStatus | PmacEventStatus
  eventVenue: string
}

interface ConflictCard {
  title: string
  startTime: string | null
  endTime: string | null
  status: BookingRecord["status"]
  venue: string
  date: string
}

export interface ConflictCheckResult {
  hasConflict: boolean
  conflicts: ConflictCard[]
  sameDayEvents: ConflictCard[]
}

const EMPTY_RESULT: ConflictCheckResult = {
  hasConflict: false,
  conflicts: [],
  sameDayEvents: [],
}

function toMinutes(value: string | null | undefined, fallback: number) {
  if (!value) return fallback

  const [hours, minutes] = value.split(":").map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return fallback
  }

  return (hours * 60) + minutes
}

function getWindowForDay(
  day: Date,
  startDate: Date,
  endDate: Date,
  startTime?: string | null,
  endTime?: string | null
) {
  const isStartDay = isSameDay(day, startDate)
  const isEndDay = isSameDay(day, endDate)

  if (isStartDay && isEndDay) {
    return {
      start: toMinutes(startTime, 0),
      end: toMinutes(endTime, 1439),
    }
  }

  if (isStartDay) {
    return {
      start: toMinutes(startTime, 0),
      end: 1439,
    }
  }

  if (isEndDay) {
    return {
      start: 0,
      end: toMinutes(endTime, 1439),
    }
  }

  return {
    start: 0,
    end: 1439,
  }
}

function hasTimeOverlapForSharedDay(
  requestStart: Date,
  requestEnd: Date,
  requestStartTime: string | undefined,
  requestEndTime: string | undefined,
  booking: BookingRecord
) {
  const toLocalDay = (value: Date) => {
    const day = new Date(value)
    day.setHours(0, 0, 0, 0)
    return day
  }
  const normalizedRequestStart = toLocalDay(requestStart)
  const normalizedRequestEnd = toLocalDay(requestEnd)
  const bookingStart = toLocalDay(booking.eventDate)
  const bookingEnd = toLocalDay(booking.endDate ?? booking.eventDate)
  const overlapStart = max([normalizedRequestStart, bookingStart])
  const overlapEnd = min([normalizedRequestEnd, bookingEnd])

  if (overlapStart > overlapEnd) {
    return false
  }

  if (differenceInCalendarDays(overlapEnd, overlapStart) > 0) {
    return true
  }

  const requestWindow = getWindowForDay(
    overlapStart,
    normalizedRequestStart,
    normalizedRequestEnd,
    requestStartTime,
    requestEndTime
  )
  const bookingWindow = getWindowForDay(
    overlapStart,
    bookingStart,
    bookingEnd,
    booking.startTime,
    booking.endTime
  )

  return requestWindow.start < bookingWindow.end && requestWindow.end > bookingWindow.start
}

function toConflictCard(booking: BookingRecord): ConflictCard {
  return {
    title: booking.eventTitle,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    venue: booking.eventVenue,
    date: booking.eventDate.toLocaleDateString(),
  }
}

export async function findRequestConflicts({
  startDate,
  startTime,
  endDate,
  endTime,
  eventVenue,
  currentRequestId,
}: ConflictCheckInput, database: Pick<Prisma.TransactionClient, 'serviceRequest' | 'pmacEvent'> = prisma): Promise<ConflictCheckResult> {
  if (!startDate) return EMPTY_RESULT

  const requestStart = new Date(startDate)
  const requestEnd = endDate?.trim() ? new Date(endDate) : new Date(startDate)
  const normalizedVenue = sanitizeSingleLineText(eventVenue, {
    fieldName: 'Venue',
    maxLength: 191,
  })

  const [requestBookings, manualPmacEvents] = await Promise.all([
    database.serviceRequest.findMany({
      where: {
        deletedAt: null,
        id: currentRequestId ? { not: currentRequestId } : undefined,
        OR: [
          { eventDate: { gte: requestStart, lte: requestEnd } },
          { endDate: { gte: requestStart, lte: requestEnd } },
          {
            AND: [
              { eventDate: { lte: requestStart } },
              { endDate: { gte: requestEnd } },
            ],
          },
        ],
        status: { in: ["DIRECTOR_APPROVED", "COORDINATOR_APPROVED", "PENDING"] },
      },
      select: {
        eventTitle: true,
        eventDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        status: true,
        eventVenue: true,
      },
    }),
    database.pmacEvent.findMany({
      where: {
        sourceType: 'MANUAL',
        status: { in: ['PENDING_APPROVAL', 'APPROVED'] },
        startDateTime: { lt: new Date(requestEnd.getTime() + (24 * 60 * 60 * 1000)) },
        endDateTime: { gt: requestStart },
      },
      select: {
        title: true,
        startDateTime: true,
        endDateTime: true,
        status: true,
        venue: true,
      },
    }),
  ])

  const overlappingBookings: BookingRecord[] = [
    ...requestBookings,
    ...manualPmacEvents.map((event) => {
      const eventDate = new Date(event.startDateTime)
      const endDate = new Date(event.endDateTime)
      eventDate.setHours(0, 0, 0, 0)
      endDate.setHours(0, 0, 0, 0)

      return {
        eventTitle: event.title,
        eventDate,
        endDate,
        startTime: event.startDateTime.toTimeString().slice(0, 5),
        endTime: event.endDateTime.toTimeString().slice(0, 5),
        status: event.status,
        eventVenue: event.venue,
      }
    }),
  ]

  const conflicts = overlappingBookings.filter((booking) => {
    if (normalizedVenue && booking.eventVenue.trim().toLocaleLowerCase() !== normalizedVenue.toLocaleLowerCase()) {
      return false
    }

    return hasTimeOverlapForSharedDay(
      requestStart,
      requestEnd,
      startTime,
      endTime,
      booking
    )
  })

  return {
    hasConflict: conflicts.length > 0,
    conflicts: conflicts.map(toConflictCard),
    sameDayEvents: overlappingBookings.map(toConflictCard),
  }
}
