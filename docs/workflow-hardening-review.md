# CMAC / PMAC implementation review

Branch: `codex/cmac-pmac-workflow-hardening`. Existing work is preserved in the first commit; subsequent commits address this review. Runtime logs and local credentials are excluded.

Each item records the observed gap, necessary change, and verification. Checked items are implemented, not a claim of production deployment.

- [ ] 1. Poll privacy: activity summaries exposed individual choices even when results were hidden. Exclude vote audit entries from workspace, activity and notification feeds; keep choices in the authorized results flow.
- [ ] 2. Poll archival: archiving an open poll bypassed the close-role restriction. Require closing before archival, including an atomic server guard.
- [ ] 3. Current account access: read paths trusted stale JWT roles. Resolve active account and current role from the database for authenticated reads.
- [ ] 4. Attachment access: public storage bypassed parent-record authorization. Use authenticated, record-scoped downloads and private storage, including legacy URL protection.
- [ ] 5. Reverification: protected project/event actions lacked the client retry dialog. Use the existing reverification flow and surface errors.
- [ ] 6. Director rechecks: an old check prevented a fresh review after project changes. Record fresh checks and evaluate the latest check.
- [ ] 7. Assignment conflicts: declined duties still reserved a member's time. Exclude declined coverage from overlap checks.
- [ ] 8. Coverage reporting: assigned roles were counted as confirmed coverage. Count Yes responses for readiness and distinguish pending assignments.
- [ ] 9. Notification state: browser-global dismissals leaked between accounts and failures were hidden. Scope dismissal/read behavior and report failures.
- [ ] 10. Completed-event staffing: assignments/responses could change after completion. Lock staffing once the event is completed.
- [ ] 11. Attendance dates: recording dates displaced attendance into the wrong reporting month. Attribute attendance to its event date.
- [ ] 12. Empty attendance: no records appeared as a perfect rate. Display no data rather than 100%.
- [ ] 13. Notification completeness: early query caps hid unread items and limited the badge. Add pagination and a full count within the feed's retention window.
- [ ] 14. Regression coverage: expand automated tests around authorization, privacy and workflow behavior; run the full suite, lint, type checks and production build where available.
- [ ] 15. Delivery evidence: free-text wrap-up alone marked work delivered. Require a usable output link before delivery is reported, without erasing historical records.

## Verification and per-change review

Results are recorded below as each task is completed.
