type AttendanceScopeRecord = {
  eventId: string
  memberId: string
}

export function getPmacAttendanceRecordKey(record: AttendanceScopeRecord) {
  return `${record.eventId}:${record.memberId}`
}

export function validatePmacAttendanceEvent(
  event: { status: string; startDateTime: Date },
  now = new Date(),
) {
  if (event.status !== 'APPROVED' && event.status !== 'COMPLETED') {
    return 'Attendance can only be recorded for approved or completed PMAC events.'
  }

  if (event.startDateTime.getTime() > now.getTime()) {
    return 'Attendance can only be recorded after the event begins.'
  }

  return null
}

export function validatePmacAttendanceSubmission(
  records: AttendanceScopeRecord[],
  assignedMemberKeys?: ReadonlySet<string>,
) {
  if (!records.length) {
    return 'Add at least one attendance record before saving.'
  }

  if (records.length > 500) {
    return 'Attendance can be saved for up to 500 members at a time.'
  }

  const recordKeys = records.map(getPmacAttendanceRecordKey)
  if (new Set(recordKeys).size !== recordKeys.length) {
    return 'Each assigned member can only appear once per event.'
  }

  if (assignedMemberKeys && recordKeys.some(key => !assignedMemberKeys.has(key))) {
    return 'Attendance can only be recorded for members who confirmed their event assignment.'
  }

  return null
}
