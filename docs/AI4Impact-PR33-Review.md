# Learner app integration review - PR 33

The release adds Expo/EAS build configuration, safe-area containers, explicit video controls, course pricing and interest state, calendar file export, certificate scanning/navigation, clearer API errors and session/store handling. Authentication and backend entitlement checks remain authoritative.

Review corrections:

- Use React Navigation's `usePreventRemove` for unsaved profile changes, with confirmed dispatch and a successful-save bypass. The native-stack swipe/back path must use the supported hook.
- Expose the API response `Date` header through HTTP API CORS so the browser exam timer can calculate the same server/device clock offset as native clients.
- Parse deep links against exact owned HTTPS hosts or the app's registered native schemes, exact paths and UUIDs; arbitrary URL substrings do not navigate the app.

Validation includes TypeScript, the web export and resilience tests (offline playback recovery, named web alert actions, push rotation, stable Cognito user IDs, live times, strict deep links and exam clock offsets). Browser acceptance checks cover actual retained-QA login, profile navigation/discard and public verification. These are not physical-device acceptance claims.

The default pilot registration switch hides self-service access-granting registration in the UI. It is not a new backend authorization boundary. Production staff enrolment and future verified-payment integration remain the approved access paths; live payment integration is still deferred.

Native acceptance remains: iOS/Android builds and signing, APNs/FCM delivery with a real EAS project, camera permission/scanning on devices, landscape fullscreen, safe areas, background/resume and native calendar/PDF share sheets. EAS build configuration does not by itself prove those paths work. No store release or paid cloud build is initiated by this review.
