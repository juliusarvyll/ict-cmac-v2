-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SECRETARY', 'CMAC_COORDINATOR', 'ICT_DIRECTOR', 'PMAC_DIRECTOR', 'PMAC_ASSISTANT_DIRECTOR', 'PMAC_SECRETARY', 'PMAC_EXECUTIVE', 'PMAC_MEMBER');

-- CreateEnum
CREATE TYPE "PmacClubRole" AS ENUM ('DIRECTOR', 'ASSISTANT_DIRECTOR', 'SECRETARY', 'EXECUTIVE', 'MEMBER');

-- CreateEnum
CREATE TYPE "PmacMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PmacExecutiveTitle" AS ENUM ('HEAD_PHOTOGRAPHER', 'HEAD_VIDEOGRAPHER', 'HEAD_GRAPHIC_DESIGNER', 'HEAD_JOURNALIST', 'TECHNICAL_HEAD', 'PUBLIC_RELATIONS_OFFICER');

-- CreateEnum
CREATE TYPE "PmacSpecialty" AS ENUM ('PHOTOGRAPHY', 'VIDEOGRAPHY', 'GRAPHIC_DESIGN', 'JOURNALISM', 'TECHNICAL_SUPPORT', 'ALL_AROUND');

-- CreateEnum
CREATE TYPE "PmacEventStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PmacEventSourceType" AS ENUM ('MANUAL', 'CMAC_REQUEST');

-- CreateEnum
CREATE TYPE "PmacEventDutyRole" AS ENUM ('PHOTOGRAPHER', 'VIDEOGRAPHER', 'JOURNALIST', 'GRAPHIC_DESIGNER', 'ALL_AROUND');

-- CreateEnum
CREATE TYPE "PmacAvailabilityStatus" AS ENUM ('PENDING', 'YES', 'NO');

-- CreateEnum
CREATE TYPE "PmacAttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "PmacPollType" AS ENUM ('GENERAL', 'EVENT', 'SCHEDULE_PREFERENCE', 'OFFICER_DECISION');

-- CreateEnum
CREATE TYPE "PmacPollStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PmacProjectStatus" AS ENUM ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PmacProjectMilestoneStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PmacProjectLinkType" AS ENUM ('REFERENCE', 'SUBMISSION');

-- CreateEnum
CREATE TYPE "PmacPollResultsVisibility" AS ENUM ('IMMEDIATE', 'AFTER_CLOSE');

-- CreateEnum
CREATE TYPE "PmacVoteChoice" AS ENUM ('YES', 'NO', 'ABSTAIN');

-- CreateEnum
CREATE TYPE "PmacActivityEntityType" AS ENUM ('EVENT', 'POLL', 'MEMBER', 'ACCOUNT', 'ATTACHMENT', 'REPORT', 'PROJECT');

-- CreateEnum
CREATE TYPE "School" AS ENUM ('SNAHS', 'SBAHM', 'SITE', 'SASTE', 'MEDICINE', 'BEU', 'UNIVERSITY', 'HR');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('CMAC', 'PMAC');

-- CreateEnum
CREATE TYPE "CampusType" AS ENUM ('IN_CAMPUS', 'OFF_CAMPUS');

-- CreateEnum
CREATE TYPE "DocumentationType" AS ENUM ('PHOTO', 'VIDEO', 'BOTH');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'COORDINATOR_APPROVED', 'DIRECTOR_APPROVED', 'REVISION_REQUESTED', 'WITHDRAWN', 'CANCELLED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PmacFulfillmentStatus" AS ENUM ('NOT_APPLICABLE', 'RELEASED', 'ACKNOWLEDGED', 'STAFFING', 'READY', 'EVENT_COMPLETED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SECRETARY',
    "school" "School",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "passwordUpdatedAt" TIMESTAMP(3),
    "pmacMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacMember" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "clubRole" "PmacClubRole" NOT NULL DEFAULT 'MEMBER',
    "status" "PmacMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "executiveTitle" "PmacExecutiveTitle",
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT,
    "course" TEXT,
    "courseOrDepartment" TEXT,
    "notes" TEXT,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmacMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacMemberSpecialty" (
    "memberId" TEXT NOT NULL,
    "specialty" "PmacSpecialty" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PmacMemberSpecialty_pkey" PRIMARY KEY ("memberId","specialty")
);

-- CreateTable
CREATE TABLE "PmacProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "branch" "PmacExecutiveTitle" NOT NULL,
    "status" "PmacProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "outputSummary" TEXT,
    "outputSubmittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "launchedById" TEXT NOT NULL,
    "headMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmacProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacProjectAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmacProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "PmacProjectMilestoneStatus" NOT NULL DEFAULT 'TODO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmacProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacProjectLink" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "PmacProjectLinkType" NOT NULL DEFAULT 'REFERENCE',
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmacProjectLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "venue" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "status" "PmacEventStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "PmacEventSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceRequestId" TEXT,
    "sourceLabel" TEXT,
    "sourceSchool" "School",
    "sourceDocumentationType" "DocumentationType",
    "sourceCampusType" "CampusType",
    "sourceNeedsSameDayEdit" BOOLEAN NOT NULL DEFAULT false,
    "sourceNeedsSameDayPhoto" BOOLEAN NOT NULL DEFAULT false,
    "handoffAcknowledgedAt" TIMESTAMP(3),
    "handoffAcknowledgedById" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvalRemarks" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deliveredOutputs" TEXT,
    "issuesEncountered" TEXT,
    "attachmentAuditNotes" TEXT,
    "wrapUpNotes" TEXT,
    "wrapUpUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmacEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacEventAssignment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "assignmentRole" "PmacEventDutyRole" NOT NULL,
    "availabilityResponse" "PmacAvailabilityStatus" NOT NULL DEFAULT 'PENDING',
    "assignmentNotes" TEXT,
    "assignedById" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmacEventAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacAttendance" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "PmacAttendanceStatus" NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmacAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacPoll" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "PmacPollType" NOT NULL DEFAULT 'GENERAL',
    "status" "PmacPollStatus" NOT NULL DEFAULT 'DRAFT',
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "linkedEventId" TEXT,
    "resultsVisibility" "PmacPollResultsVisibility" NOT NULL DEFAULT 'AFTER_CLOSE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmacPoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "voterMemberId" TEXT NOT NULL,
    "selectedOption" "PmacVoteChoice" NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmacVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacAttachment" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "pollId" TEXT,
    "memberId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmacAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmacActivityLog" (
    "id" TEXT NOT NULL,
    "entityType" "PmacActivityEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventId" TEXT,
    "pollId" TEXT,
    "projectId" TEXT,
    "memberId" TEXT,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "changes" JSONB,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PmacActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "eventTitle" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "eventVenue" TEXT NOT NULL,
    "school" "School" NOT NULL,
    "serviceType" "ServiceType",
    "documentationType" "DocumentationType" NOT NULL,
    "campusType" "CampusType" NOT NULL DEFAULT 'IN_CAMPUS',
    "letterUrl" TEXT,
    "eventDetails" TEXT,
    "letterContent" TEXT,
    "needsSameDayEdit" BOOLEAN NOT NULL DEFAULT false,
    "needsSameDayPhoto" BOOLEAN NOT NULL DEFAULT false,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "coordinatorNote" TEXT,
    "directorNote" TEXT,
    "secretaryId" TEXT NOT NULL,
    "coordinatorId" TEXT,
    "coordinatorApprovedAt" TIMESTAMP(3),
    "directorId" TEXT,
    "directorApprovedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "pmacFulfillmentStatus" "PmacFulfillmentStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "pmacFulfillmentUpdatedAt" TIMESTAMP(3),
    "pmacFulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestLetterAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestLetterAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" "Role" NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationReceipt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_pmacMemberId_key" ON "User"("pmacMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "PmacMember_executiveTitle_key" ON "PmacMember"("executiveTitle");

-- CreateIndex
CREATE UNIQUE INDEX "PmacMember_email_key" ON "PmacMember"("email");

-- CreateIndex
CREATE INDEX "PmacMember_clubRole_status_idx" ON "PmacMember"("clubRole", "status");

-- CreateIndex
CREATE INDEX "PmacMember_department_status_idx" ON "PmacMember"("department", "status");

-- CreateIndex
CREATE INDEX "PmacMember_executiveTitle_status_idx" ON "PmacMember"("executiveTitle", "status");

-- CreateIndex
CREATE INDEX "PmacMemberSpecialty_specialty_idx" ON "PmacMemberSpecialty"("specialty");

-- CreateIndex
CREATE INDEX "PmacProject_branch_status_idx" ON "PmacProject"("branch", "status");

-- CreateIndex
CREATE INDEX "PmacProject_headMemberId_status_idx" ON "PmacProject"("headMemberId", "status");

-- CreateIndex
CREATE INDEX "PmacProject_startDate_targetDate_idx" ON "PmacProject"("startDate", "targetDate");

-- CreateIndex
CREATE INDEX "PmacProject_launchedById_createdAt_idx" ON "PmacProject"("launchedById", "createdAt");

-- CreateIndex
CREATE INDEX "PmacProjectAssignment_memberId_createdAt_idx" ON "PmacProjectAssignment"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "PmacProjectAssignment_assignedById_createdAt_idx" ON "PmacProjectAssignment"("assignedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PmacProjectAssignment_projectId_memberId_key" ON "PmacProjectAssignment"("projectId", "memberId");

-- CreateIndex
CREATE INDEX "PmacProjectMilestone_projectId_dueDate_idx" ON "PmacProjectMilestone"("projectId", "dueDate");

-- CreateIndex
CREATE INDEX "PmacProjectMilestone_status_dueDate_idx" ON "PmacProjectMilestone"("status", "dueDate");

-- CreateIndex
CREATE INDEX "PmacProjectLink_projectId_type_idx" ON "PmacProjectLink"("projectId", "type");

-- CreateIndex
CREATE INDEX "PmacProjectLink_addedById_createdAt_idx" ON "PmacProjectLink"("addedById", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PmacEvent_sourceRequestId_key" ON "PmacEvent"("sourceRequestId");

-- CreateIndex
CREATE INDEX "PmacEvent_status_startDateTime_idx" ON "PmacEvent"("status", "startDateTime");

-- CreateIndex
CREATE INDEX "PmacEvent_createdById_status_idx" ON "PmacEvent"("createdById", "status");

-- CreateIndex
CREATE INDEX "PmacEvent_sourceType_startDateTime_idx" ON "PmacEvent"("sourceType", "startDateTime");

-- CreateIndex
CREATE INDEX "PmacEventAssignment_memberId_availabilityResponse_idx" ON "PmacEventAssignment"("memberId", "availabilityResponse");

-- CreateIndex
CREATE INDEX "PmacEventAssignment_eventId_assignmentRole_idx" ON "PmacEventAssignment"("eventId", "assignmentRole");

-- CreateIndex
CREATE UNIQUE INDEX "PmacEventAssignment_eventId_memberId_assignmentRole_key" ON "PmacEventAssignment"("eventId", "memberId", "assignmentRole");

-- CreateIndex
CREATE INDEX "PmacAttendance_eventId_status_idx" ON "PmacAttendance"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PmacAttendance_eventId_memberId_key" ON "PmacAttendance"("eventId", "memberId");

-- CreateIndex
CREATE INDEX "PmacPoll_status_opensAt_closesAt_idx" ON "PmacPoll"("status", "opensAt", "closesAt");

-- CreateIndex
CREATE INDEX "PmacPoll_createdById_status_idx" ON "PmacPoll"("createdById", "status");

-- CreateIndex
CREATE INDEX "PmacPoll_linkedEventId_idx" ON "PmacPoll"("linkedEventId");

-- CreateIndex
CREATE INDEX "PmacVote_voterId_votedAt_idx" ON "PmacVote"("voterId", "votedAt");

-- CreateIndex
CREATE INDEX "PmacVote_voterMemberId_votedAt_idx" ON "PmacVote"("voterMemberId", "votedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PmacVote_pollId_voterId_key" ON "PmacVote"("pollId", "voterId");

-- CreateIndex
CREATE INDEX "PmacAttachment_eventId_createdAt_idx" ON "PmacAttachment"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "PmacAttachment_pollId_createdAt_idx" ON "PmacAttachment"("pollId", "createdAt");

-- CreateIndex
CREATE INDEX "PmacAttachment_memberId_createdAt_idx" ON "PmacAttachment"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "PmacAttachment_uploadedById_createdAt_idx" ON "PmacAttachment"("uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "PmacActivityLog_entityType_entityId_createdAt_idx" ON "PmacActivityLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "PmacActivityLog_entityType_createdAt_idx" ON "PmacActivityLog"("entityType", "createdAt");

-- CreateIndex
CREATE INDEX "PmacActivityLog_action_createdAt_idx" ON "PmacActivityLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "PmacActivityLog_archivedAt_createdAt_idx" ON "PmacActivityLog"("archivedAt", "createdAt");

-- CreateIndex
CREATE INDEX "PmacActivityLog_createdAt_idx" ON "PmacActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "PmacActivityLog_eventId_createdAt_idx" ON "PmacActivityLog"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "PmacActivityLog_pollId_createdAt_idx" ON "PmacActivityLog"("pollId", "createdAt");

-- CreateIndex
CREATE INDEX "PmacActivityLog_projectId_createdAt_idx" ON "PmacActivityLog"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "PmacActivityLog_memberId_createdAt_idx" ON "PmacActivityLog"("memberId", "createdAt");

-- CreateIndex
CREATE INDEX "PmacActivityLog_actorId_createdAt_idx" ON "PmacActivityLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRequest_status_deletedAt_eventDate_idx" ON "ServiceRequest"("status", "deletedAt", "eventDate");

-- CreateIndex
CREATE INDEX "ServiceRequest_secretaryId_status_createdAt_idx" ON "ServiceRequest"("secretaryId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RequestLetterAttachment_requestId_key" ON "RequestLetterAttachment"("requestId");

-- CreateIndex
CREATE INDEX "RequestLetterAttachment_uploadedById_createdAt_idx" ON "RequestLetterAttachment"("uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "RequestLetterAttachment_requestId_idx" ON "RequestLetterAttachment"("requestId");

-- CreateIndex
CREATE INDEX "NotificationReceipt_userId_readAt_idx" ON "NotificationReceipt"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationReceipt_userId_notificationId_key" ON "NotificationReceipt"("userId", "notificationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pmacMemberId_fkey" FOREIGN KEY ("pmacMemberId") REFERENCES "PmacMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacMemberSpecialty" ADD CONSTRAINT "PmacMemberSpecialty_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PmacMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacProject" ADD CONSTRAINT "PmacProject_launchedById_fkey" FOREIGN KEY ("launchedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacProject" ADD CONSTRAINT "PmacProject_headMemberId_fkey" FOREIGN KEY ("headMemberId") REFERENCES "PmacMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacProjectAssignment" ADD CONSTRAINT "PmacProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PmacProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacProjectAssignment" ADD CONSTRAINT "PmacProjectAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PmacMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacProjectAssignment" ADD CONSTRAINT "PmacProjectAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacProjectMilestone" ADD CONSTRAINT "PmacProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PmacProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacProjectLink" ADD CONSTRAINT "PmacProjectLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PmacProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacProjectLink" ADD CONSTRAINT "PmacProjectLink_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacEvent" ADD CONSTRAINT "PmacEvent_sourceRequestId_fkey" FOREIGN KEY ("sourceRequestId") REFERENCES "ServiceRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacEvent" ADD CONSTRAINT "PmacEvent_handoffAcknowledgedById_fkey" FOREIGN KEY ("handoffAcknowledgedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacEvent" ADD CONSTRAINT "PmacEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacEvent" ADD CONSTRAINT "PmacEvent_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacEventAssignment" ADD CONSTRAINT "PmacEventAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PmacEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacEventAssignment" ADD CONSTRAINT "PmacEventAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PmacMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacEventAssignment" ADD CONSTRAINT "PmacEventAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacAttendance" ADD CONSTRAINT "PmacAttendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PmacEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacAttendance" ADD CONSTRAINT "PmacAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PmacMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacAttendance" ADD CONSTRAINT "PmacAttendance_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacPoll" ADD CONSTRAINT "PmacPoll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacPoll" ADD CONSTRAINT "PmacPoll_linkedEventId_fkey" FOREIGN KEY ("linkedEventId") REFERENCES "PmacEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacVote" ADD CONSTRAINT "PmacVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "PmacPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacVote" ADD CONSTRAINT "PmacVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacVote" ADD CONSTRAINT "PmacVote_voterMemberId_fkey" FOREIGN KEY ("voterMemberId") REFERENCES "PmacMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacAttachment" ADD CONSTRAINT "PmacAttachment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PmacEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacAttachment" ADD CONSTRAINT "PmacAttachment_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "PmacPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacAttachment" ADD CONSTRAINT "PmacAttachment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PmacMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacAttachment" ADD CONSTRAINT "PmacAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacActivityLog" ADD CONSTRAINT "PmacActivityLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "PmacEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacActivityLog" ADD CONSTRAINT "PmacActivityLog_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "PmacPoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacActivityLog" ADD CONSTRAINT "PmacActivityLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PmacProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacActivityLog" ADD CONSTRAINT "PmacActivityLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "PmacMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmacActivityLog" ADD CONSTRAINT "PmacActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_secretaryId_fkey" FOREIGN KEY ("secretaryId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestLetterAttachment" ADD CONSTRAINT "RequestLetterAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestLetterAttachment" ADD CONSTRAINT "RequestLetterAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ServiceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationReceipt" ADD CONSTRAINT "NotificationReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Preserve case-insensitive email uniqueness from the MySQL deployment.
CREATE UNIQUE INDEX "User_email_case_insensitive_key" ON "User" (lower("email"));
CREATE UNIQUE INDEX "PmacMember_email_case_insensitive_key" ON "PmacMember" (lower("email"));
