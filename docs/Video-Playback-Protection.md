# Recorded video protection

All recorded lectures use the same protection path, including existing uploads. No per-student video copy or database migration is required.

1. Admin creates a recorded class, requests `POST /admin/classes/{id}/video-upload`, and uploads the MP4 directly to private S3 using the returned, size-constrained form (up to 2 GiB; form expires after 15 minutes).
2. `POST /admin/classes/{id}/video-confirm` checks object length and content type before publishing. This is upload confirmation, **not** transcoding, malware scanning or codec validation. Upload browser-compatible H.264/AAC MP4s; adaptive HLS processing is a separate future pipeline.
3. `GET /learning/classes/{id}/playback` checks authentication, enrollment, course publication and the sequential lecture viewing window. It returns a CloudFront URL valid for at most **900 seconds**, shortened if the viewing window ends sooner, plus the authenticated database user UUID as `watermark.student_id` and `AI4Impact` as company.
4. The player displays the two-line watermark and randomly changes its position every 25 seconds without repeating the immediate previous position. Measured bounds keep the full label inside the stage on narrow and fullscreen layouts. Missing identity fails playback closed.
5. The existing player renews its URL and playback session before expiry, preserving position and playing/paused state. Repeated enrollment/window checks apply to renewals and progress heartbeats. A URL remains a bearer credential until expiry; revocation is not instantaneous for an already-issued URL.
6. Web fullscreen expands the entire stage/controls, preserving the overlay. A viewport fallback covers browsers without element fullscreen. Native uses an app modal with the same overlay rather than the bare OS video fullscreen. Picture-in-picture/external playback controls are disabled because those surfaces would omit the overlay.

## Limits

This is a visible player watermark and private signed delivery, not DRM, a burned-in student watermark or forensic watermarking. A technical viewer can modify a browser or record/copy authorized bytes. The student UUID identifies the account, not proof of who made a recording. No emails or passwords are displayed in the video. Do not log signed media URLs or playback tokens.

Private S3 encryption, public-access blocking and CloudFront origin access control remain in Terraform. The upload flow reuses existing infrastructure; no new standing AWS service is introduced. Native device/simulator playback needs a separate release and device QA; web deployment does not update installed apps.

## QA

- Backend coverage: verified watermark identity, 15-minute cap, shorter access-window expiry, denied enrollment before signing.
- Browser coverage: real MP4 decoding, watermark containment/movement, full-stage fullscreen, URL/session renewal and playback controls. Existing profile/exam/public certificate regressions remain enabled.
- A separate gated live test uses synthetic Cognito accounts and the user-supplied London Diaries MP4. Credentials are kept in a local permission-restricted file, never committed.

## Scrubbing, speeds and watch credit

Web uses an accessible HTML range slider supporting mouse dragging, touch scrubbing and keyboard seeking (arrows ±10 seconds, Page Up/Down ±30, Home/End). Native has an adjustable touch responder. Dragging previews locally and commits once at release; the ±10-second controls remain. Speeds are 0.75×, 1×, 1.25×, 1.5×, 1.75× and 2×.

The client serializes a final `watch` event at the old position, then a `seek` event at the target. The server resets its baseline for seek events without awarding credit; legitimate watching is bounded by elapsed server time × 2 plus a two-second tolerance, with a 60-second gap cap. Played content ranges are merged, so replayed sections count once. Session renewal flushes pending watching and reconnect/resume establishes a no-credit baseline if needed. Old clients that omit the event continue to use the watch path. No schema migration is required.

Playback position, unique watched content, and completed lectures are distinct. For a 22:39 video, 4% watched is about 54 seconds of unique content, even if the learner seeks to 11:54. A lecture still completes after 90% is watched. Course completion remains based on completed lectures; the UI labels it explicitly. Existing learner progress is retained.
