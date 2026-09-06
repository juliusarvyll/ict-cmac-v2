# CMAC / PMAC implementation review

Branch: `codex/cmac-pmac-workflow-hardening`. Existing work is preserved in the first commit; subsequent commits address this review. Runtime logs and local credentials are excluded.

Each item records the observed gap, necessary change, and verification. Checked items are implemented, not a claim of production deployment.

- [x] 1. Poll privacy: activity summaries exposed individual choices even when results were hidden. Exclude vote audit entries from workspace, activity and notification feeds; keep choices in the authorized results flow.
- [x] 2. Poll archival: archiving an open poll bypassed the close-role restriction. Require closing before archival, including an atomic server guard.
- [x] 3. Current account access: read paths trusted stale JWT roles. Resolve active account and current role from the database for authenticated reads.
- [x] 4. Attachment access: public storage bypassed parent-record authorization. Use authenticated, record-scoped downloads and private storage, including legacy URL protection.
- [x] 5. Reverification: protected project/event actions lacked the client retry dialog. Use the existing reverification flow and surface errors.
- [x] 6. Director rechecks: an old check prevented a fresh review after project changes. Record fresh checks and evaluate the latest check.
- [x] 7. Assignment conflicts: declined duties still reserved a member's time. Exclude declined coverage from overlap checks.
- [x] 8. Coverage reporting: assigned roles were counted as confirmed coverage. Count Yes responses for readiness and distinguish pending assignments.
- [x] 9. Notification state: browser-global dismissals leaked between accounts and failures were hidden. Scope dismissal/read behavior and report failures.
- [x] 10. Completed-event staffing: assignments/responses could change after completion. Lock staffing once the event is completed.
- [x] 11. Attendance dates: recording dates displaced attendance into the wrong reporting month. Attribute attendance to its event date.
- [x] 12. Empty attendance: no records appeared as a perfect rate. Display no data rather than 100%.
- [x] 13. Notification completeness: early query caps hid unread items and limited the badge. Add pagination and a full count within the feed's retention window.
- [x] 14. Regression coverage: expand automated tests around authorization, privacy and workflow behavior; run the full suite, lint, type checks and production build where available.
- [x] 15. Delivery evidence: free-text wrap-up alone marked work delivered. Require a usable output link before delivery is reported, without erasing historical records.

## Verification and per-change review

| Task | Short review: change and why it was necessary | Verification |
| --- | --- | --- |
| 1. Poll privacy | Result hiding only covered the votes array. Historical vote summaries bypassed it through activity feeds. Vote audit entries are now excluded from public workspace/activity/notification feeds, and new summaries no longer record the choice. Stored audit history is retained. | Poll workspace serialization test; notification policy tests. |
| 2. Poll archive | Archive was a separate state-changing action without the close policy. Open polls must now be closed first, and an atomic status guard prevents an open-state race during archival. UI uses the same restriction. | All poll-manager roles rejected for open archival; workspace permission test. |
| 3. Account access | JWT identity/role values outlived database changes. Server reads now validate active accounts and use current database roles. Deleted identities cannot be rebound to another account by reused email. | Disabled-user, deleted-user and changed-role tests; request action tests. |
| 4. Attachments | Public URLs were protected only by login, not the parent record. New storage is private; downloads authorize the current event/poll/member record. Old links are rewritten through the protected route. Invalid storage paths are rejected; failed database uploads clean up their newly written file. | Unauthorized/authorized legacy download tests; traversal tests; production route compilation. |
| 5. Reverification | Protected server actions returned a verification error but project forms and event approvals did not invoke the existing dialog/retry mechanism. They now do, with cancellation/network errors returned to the form. | Successful retry, ordinary error, cancellation and network-error tests. |
| 6. Director review | Any historical check caused the action to return early. Fresh checks are now retained as new audit entries, and closure validation uses the latest check. | Repeated-review server-action test and latest-check/invalidation tests. |
| 7. Assignment conflicts | Conflict and workload-warning queries did not filter declined responses. No responses now stop reserving that member's time; Yes and pending duties still count. | Assignment action checks both query filters. |
| 8. Coverage reports | Role presence was confused with acceptance. Coverage percentages, missing-role exports and understaffing summaries now require Yes. The table distinguishes confirmed from assigned duties. | Mixed Yes/No/pending reporting fixture. |
| 9. Notification state | Local storage used one dismissal key for every account and optimistic UI ignored structured server errors. Read/dismiss now uses per-user database receipts; failed saves are visible in both top bar and dashboard. Old browser dismissals are intentionally not imported. | Receipt scoping/pagination tests; lint/type/build checks. |
| 10. Completed staffing | Completed events shared staffing permissions with approved events. Staffing and member responses are now locked, including mutation guards. Attendance correction permissions remain unchanged; wrap-up permission is separate so final output can still be recorded. | Completed-event mutation rejection, response compare-and-set and separate wrap-up permission tests. |
| 11. Attendance dates | Reporting used entry timestamps, putting late-entered attendance in the wrong month. Analytics, reliability windows and performance exports now use event dates; audit timestamps are retained. | Late-entered attendance trend test and query assertion. |
| 12. No attendance data | Empty denominators defaulted to a perfect rate. Reports, exports and suggestions now show No data. Unknown history is no longer called reliable; suggestion scoring uses a neutral prior rather than a perfect score. | Empty-history report test; type checks across consumers. |
| 13. Notification completeness | Small per-source limits were applied before receipts, hiding older unread items. Read state now applies before pagination; ten-item pages have a full unread count and mark-all covers the current feed, not only the visible page. | 35-item pagination and older-unread-behind-read-items tests. |
| 14. Regression tests | Existing tests mostly covered helpers and authorization preflight. Added server-action, route and serialization regression tests, including a modeled competing-response write. These are mocked integration boundaries, not a claim of real-database race testing. | Full Vitest suite, ESLint, TypeScript, Next.js production build. Final command results below. |
| 15. Delivery evidence | Any nonempty text set Delivered. A completed event now requires a shareable HTTP(S) output link in Delivered Outputs. Interim notes remain savable. Localhost, numeric-IP, credential-bearing and non-HTTP URLs are not accepted as evidence. | Link-validation tests and actual fulfillment-sync tests for notes-only vs output-link cases. |

## Scope and rollout cautions

- The baseline commit preserves the pre-existing changes from this workspace. Subsequent commits isolate this review; local runtime logs and credentials are not included.
- No database data was deleted or backfilled by this review. No new schema fields are needed for these hardening changes. The baseline contains earlier schema work: review that schema diff and back up the database before deploying it.
- New uploads need persistent writable storage at `private/uploads/pmac`. Compose now provides a named volume. Legacy files remain in `public/uploads/pmac`; retain/back up those files and ensure all legacy requests pass through Next.js, not a direct static server/CDN.
- Notification count means the complete current operational feed, not all historical audit logs. CMAC audit notifications retain 30 days; PMAC general activity retains 24 hours, responses/project activity seven days, and active task reminders retain their existing date rules. Older audit history remains in the audit views. No source is truncated to a small item count before read-state processing. Feed generation still loads eligible candidates in memory; a materialized inbox would be a separate scalability project.
- Existing browser-only dismissals are not migrated because their owning account is unknown. Previously dismissed unread items may reappear once; marking them read now persists correctly per account.
- Delivery URLs are validated syntactically and are not fetched by the server. A link is evidence of an output location, not proof of recipient access or acknowledgment. Historical Delivered records are not silently rewritten; the stricter rule applies when fulfillment is synchronized again.
- Browser visual acceptance and real-database concurrency testing remain manual review steps, not completed automated checks.

## Manual acceptance for your review

1. As a coordinator/other poll manager, confirm an open poll cannot be archived to bypass closure; only its creator, director or secretary can close it. Check before-close poll payloads do not contain another member's choice.
2. Disable/change a test user's role in another session; confirm their next protected read uses current access. Test both authorized and unrelated-member attachment downloads, including an old URL.
3. Let reverification expire, then launch/update a project and approve/reject an event. Check password cancellation leaves the form intact and the save can be retried.
4. Mark a project checked, edit a milestone, then check it again as director. The assigned head should be able to close after the fresh review and required outputs/milestones.
5. Decline coverage; assign that member elsewhere at the same time. Complete an event and verify staffing/coverage responses are locked while permitted attendance corrections and final wrap-up remain available.
6. Use an account with more than ten notifications. Check pages, unread count, mark-all, and account switching. Simulate a failed save: it must not silently disappear.
7. Check a member with no attendance, and attendance entered this month for an earlier event. Confirm No data and the correct event month.
8. Save notes-only wrap-up on a completed imported event: it should remain Event Completed. Add a shareable final output link: it should become Delivered. Verify the requester can open that link.

## Final verification

- `npm test`: passed, **166 tests / 36 files**.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npx next build`: passed, including production compilation, TypeScript and generation of 39 pages. There is a non-fatal Turbopack file-tracing warning associated with the attachment upload route; investigate artifact tracing before adopting standalone packaging.
- `npm run build`: its Prisma-generation prerequisite was blocked by Windows `EPERM` on the engine DLL held by the running app. The existing generated client was used for the successful direct Next.js build. The running server was not stopped. Retry the standard command after stopping it during deployment validation.
- `git diff --check`: passed (Git emitted Windows line-ending warnings, not whitespace errors).
- No browser visual run or real-database concurrency test was performed in this review. Use the manual acceptance checklist above before merging.
