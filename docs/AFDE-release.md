# AFDE marketing release

AFDE is discoverable on the marketing website. Its backend course is not yet in the
published billing catalog, so `demoCheckoutEnabled: false` routes both course CTAs
to the existing guidance form. AFDE is available in the form's interest selector.
The listed marketing fee is not a live backend quote.

Before enabling AFDE demo checkout:

1. Prepare and publish the backend course with slug `azure-fabric-data-engineering`.
2. Configure the approved marked price/discount; verify `/billing/catalog` returns it.
3. Verify the authenticated student portal offers the correct AFDE course and can
   create, cancel and complete an AFDE demo order with the correct invoice.
4. Enable the track's `demoCheckoutEnabled` flag in `landing-page/src/content/site.ts`.

Demo completion does not collect money or grant enrollment.

Validation on 26 October 2026: production build/typecheck and changed-file ESLint
passed. Headless Chromium at 390px and 1440px verified both AFDE guidance links,
interest selection, absence of AFDE checkout links, unchanged FDE checkout links,
and no page errors or horizontal overflow. Full-project ESLint reports the existing
`react-hooks/set-state-in-effect` violation in `src/app/(site)/verify/verifier.tsx:37`.
