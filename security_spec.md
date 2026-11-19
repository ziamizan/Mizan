# Digital Proof of Help — Security Specification

## 1. Data Invariants
1. **Unique Ownership**: A `help_requests` document can only be created with `requesterId == request.auth.uid`, `status == 'REQUESTED'`, and `helperId == null`.
2. **Self-Acceptance Ban**: A requester cannot accept their own help request (`existing().requesterId != request.auth.uid`).
3. **Self-Confirmation Ban**: A helper cannot confirm their own completed assistance; only `requesterId == request.auth.uid` may transition `AWAITING_CONFIRMATION` to `COMPLETED_CONFIRMED`, `COMPLETED_UNCONFIRMED`, or `ISSUE_REPORTED`.
4. **Proof Generation Prerequisite**: A `digital_proofs` document may only be created atomically alongside a valid requester confirmation (`getAfter(help_requests/{requestId}).data.status == 'COMPLETED_CONFIRMED'`).
5. **No Duplicate Confirmations**: `help_confirmations` uses `{requestId}` as its document ID and forbids updating once `confirmationStatus == 'CONFIRMED'`.
6. **Terminal State Locking**: Once `help_requests.status` is `COMPLETED_CONFIRMED` or `CANCELLED`, non-admin updates are rejected.
7. **PII Isolation**: `digital_proofs` contains zero email addresses, mobile numbers, or home addresses. `users/{userId}/private/info` is strictly readable only by `userId` or verified admin.
8. **Immutable Audit Trail**: `audit_logs` forbids `update` and `delete` for all users including admins.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Identity Spoofing on Request Creation**: `create /help_requests/HC-99999` with `requesterId: "other-uid"`.
2. **Pre-Assigned Helper on Creation**: `create /help_requests/HC-99999` with `status: "COMPLETED_CONFIRMED"`.
3. **Helper Self-Acceptance**: `update /help_requests/HC-10024` by `requesterId` setting `helperId: requesterId, status: "ACCEPTED"`.
4. **Helper Self-Confirmation**: `update /help_requests/HC-10024` by `helperId` transitioning `AWAITING_CONFIRMATION -> COMPLETED_CONFIRMED`.
5. **Cross-User Confirmation**: `create /help_confirmations/HC-10024` by a third user UID who is neither `requesterId` nor `helperId`.
6. **Manual Proof Fabrication**: `create /digital_proofs/DPH-2026-99999` when parent `help_requests/HC-10024` is still `REQUESTED` or `IN_PROGRESS`.
7. **Duplicate Confirmation Overwrite**: `create` or `update /help_confirmations/HC-10024` when `confirmationStatus == "CONFIRMED"` already exists.
8. **Shadow Field Injection**: `create /help_requests/HC-99999` including unexpected field `isAdminApproved: true`.
9. **Resource Poisoning / Oversized String**: `create /help_requests/HC-99999` with `title` length > 140 or document ID > 128 chars.
10. **PII Blanket Read**: `get /users/other-uid/private/info` by an authenticated non-owner non-admin user.
11. **Admin Email Spoofing**: Request claiming `email: "ziamizan001@gmail.com"` with `email_verified: false`.
12. **Audit Log Tampering**: `update` or `delete /audit_logs/log-1` even by an admin.
