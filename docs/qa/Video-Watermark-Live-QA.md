# Video watermark deployment and live QA — 5 November 2026

Implementation: [PR #44](https://github.com/AI4Impact-New/SimpleApp-Event/pull/44), merged as `62c93efe7b1ae4f4dced6dddf62f4e43baf086a5` after all four CI jobs passed.

Deployment verified:

- Learning Lambda update succeeded, published version `1`; deployed ZIP checksum verified.
- Student Amplify app `d26ztc5gxt79re`, deployment `7`, succeeded. Hosted `release.json` confirms the clean merged commit above.
- Student portal: https://main.d26ztc5gxt79re.amplifyapp.com. The `learn.ai4impact.in` domain association is currently FAILED; use the Amplify URL until DNS/domain setup is repaired separately.
- QA course: `7bc5bb12-bf7c-4bee-a0db-374fdc4a7c1c`, **QA — Video Watermark Demo**.
- Recorded class: `95e3e8a6-c2b8-4086-bc4b-e367cb4dbb0d`, **London Diaries — Protected Video Test**.
- Supplied H.264/AAC 1080p MP4: 409,430,264 bytes, 1,358.298 seconds (metadata rounded up to 1,359 seconds). Upload size and single-part ETag match the local source; S3 encryption is AES256.
- Requested existing operator account enrolled and playback verified through the registration/learning handlers using authorized AWS CLI/SDK invocation. No existing password was read or reset.

## Verification

Local: 216 backend tests passed, 11 resilience tests passed, typecheck and web export passed, seven student browser regressions passed. The 37 database integration tests passed in GitHub CI. Existing admin/landing regression checks also passed in CI.

Deployed headless Playwright: **2/2 passed in 10.6 seconds**, at 390×844 and 1440×1000. No API or video responses were mocked. Verified:

- Anonymous playback request denied (401), authenticated unenrolled account denied (403), enrolled account granted playback (200).
- Signed CloudFront range download returns 206 with the requested bytes; removing the signature returns 403.
- Actual Cognito login and My learning → course → lecture navigation.
- Actual MP4 decoding/playback and pause, seeking near the end of the full uploaded file (byte-range delivery).
- Correct student UUID and company watermark; random movement after 25 seconds; watermark remains visible in full-stage fullscreen.
- Automatic renewal hits the deployed API, replaces the actual UI session, preserves the watermark, and allows playback afterward. Only the browser timer was accelerated; this is not a 15-minute wall-clock soak test.

Additional direct live checks: anonymous S3 object download denied (403); a correctly signed, already-expired CloudFront URL denied (403). Local browser regressions cover the viewport fullscreen fallback and fail-closed behavior when the server omits watermark identity.

## Boundaries

Visible overlay and signed delivery are deterrents, not DRM or forensic watermarking. Installed native apps require a new app build and physical-device QA. The existing seven-day lecture access window applies to this demo. No new database migration, transcoder, DRM provider or always-running media service was deployed.

The gated live test requires a local `QA_VIDEO_STATE` fixture and `QA_STUDENT_URL`; production writes are not enabled in CI. Fixture credentials are never committed. Live test selectors account for the lowercase web navigation label and retained React Navigation screens.

## Scrubbing and 2× update — 5 November 2026

[PR #48](https://github.com/AI4Impact-New/SimpleApp-Event/pull/48) merged as `dbf00d2362fb4d1e31e8f83ead85a555335a2e70` after all CI jobs passed. Learning Lambda published version `2` and student Amplify deployment `9` succeeded; the hosted manifest confirms this clean commit. No database migration or progress reset was performed.

Validation: **262 backend tests passed**, including all 38 isolated PostgreSQL integration tests; **12 resilience tests**, typecheck/export, and **11 local browser regressions** passed. Browser coverage includes mouse drag, touch drag, keyboard Home/End, ±10-second controls, 2× selection, restored watch progress, and unchanged watch credit after seeking.

**3/3 deployed Playwright cases passed in 28.1 seconds**, with real Cognito/API/CloudFront/MP4 responses. Mobile and desktop video cases passed. An additional real-clock case seeks into unwatched content, plays at 2×, verifies new watched seconds are saved, explicitly drags back inside the watched segment, replays it, verifies no duplicate credit, and reloads to verify persistence. Only the earlier URL-renewal cases accelerate browser timers; the watch-credit case uses actual playback and server elapsed time.

The replay test waits for the seek to settle and uses an explicit thumb drag on a desktop viewport for precise segment selection. Clicking inside the native range thumb may only grab it, which cannot be assumed to replay a prior segment. Final pre-seek flushing can persist the remaining sub-second tail of legitimate watching; replay is compared with the persisted baseline after that flush.

The existing operator account, enrollment and historical progress are retained. Playback position and watched content remain separate: seeking to 11:54 does not mean 11:54 has been watched. Course-level percentages represent completed lectures and are now labeled accordingly.
