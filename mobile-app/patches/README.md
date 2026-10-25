# Temporary compatibility patches

`npm ci` applies these version-specific patches through `patch-package --error-on-fail`.
They must be reviewed or removed when the pinned dependency versions change.

- `expo-video+3.0.16.patch` consumes expected browser play cancellation/autoplay-policy failures. Genuine media failures still become player error events. It changes only the web implementation; native player files are untouched.
- `metro+0.83.3.patch` passes image bytes to image-size 2.x. The patched image-size version removes the vulnerable parsers, but no longer accepts the path strings used by this Metro version. Exporting the app verifies the compatibility path against its actual assets.

The image-size/PostCSS overrides and Axios updates address available dependency fixes without changing the Expo SDK generation. The remaining audit chain is `expo` → `@expo/cli` / `@expo/code-signing-certificates` → `node-forge`; npm lists no patched node-forge release. These packages operate in the Expo development/build tooling, not the exported student JavaScript runtime. Do not accept npm's suggested incompatible Expo downgrade to clear that report. Recheck upstream advisories on the next dependency update.
