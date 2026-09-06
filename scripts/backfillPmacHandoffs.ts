import { Prisma } from '@prisma/client'

import { syncPmacEventFromServiceRequest } from '../src/lib/pmacRequestSync'
import { syncRequestFulfillmentFromPmacEvent } from '../src/lib/pmacFulfillment'
import { prisma } from '../src/lib/prisma'

async function main() {
  const requests = await prisma.serviceRequest.findMany({
    where: {
      serviceType: 'PMAC',
      status: 'DIRECTOR_APPROVED',
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  })

  for (const request of requests) {
    await prisma.$transaction(async (tx) => {
      await syncPmacEventFromServiceRequest(tx, request, {
        id: request.directorId,
        name: 'CMAC-PMAC Reconciliation',
        role: 'ICT_DIRECTOR',
      })
      await syncRequestFulfillmentFromPmacEvent(tx, request.id, {
        id: request.directorId,
        name: 'CMAC-PMAC Reconciliation',
        role: 'ICT_DIRECTOR',
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  }

  console.log(`Reconciled ${requests.length} approved CMAC request(s) routed to PMAC.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
