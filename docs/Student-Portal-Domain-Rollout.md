# Student portal domain and branding rollout

Canonical student login: **https://learn.ai4impact.in/login**. Published privacy policy: **https://www.ai4impact.in/privacy/**. Company attribution: **Samagyaan Data solutions**; the product name remains AI4Impact.

## DNS handoff

Authoritative nameservers for `ai4impact.in` are GoDaddy (`ns05.domaincontrol.com`, `ns06.domaincontrol.com`). There is no Route 53 hosted zone in the application account, so AWS access cannot publish these records.

Add/update these CNAMEs in GoDaddy, TTL 1800 (30 minutes, GoDaddy minimum):

| Host/name (GoDaddy appends ai4impact.in) | Target |
| --- | --- |
| `learn` | `d3m5uzmpvashck.cloudfront.net` |
| `_432ceaf584cbb6d0b4e85ee8be389429.learn` | `_39ed1858707b652d94d3888b553512bd.wzccmgtwzk.acm-validations.aws` |

On 6 November 2026 AWS rejected retries of the expired/failed attachment. The first owner-approved recreation failed while the old routing CNAME was still published. For the clean retry, the owner removed only `learn`; its absence was confirmed on both authoritative servers and public resolvers while the certificate-validation record remained intact. The owner-approved clean recreation reached `PENDING_DEPLOYMENT` without an error and issued the routing target above.

The new destination passed HTTPS/HTTP 200 checks on four returned edge addresses and a Playwright login-form/privacy-link check using a test-only hostname resolver override. These preflight checks do not prove public DNS readiness. Publish the new `learn` CNAME and verify normal public HTTPS and AWS completion before changing any links. The app, main branch, existing Amplify login and published links remain intact. Re-read the association before future DNS changes; recreating an attachment can change the routing target.

The association is tracked in `aws_amplify_domain_association.student` using ID `d26ztc5gxt79re/learn.ai4impact.in`. Recreating it preserves this Terraform resource ID. DNS remains externally managed.

After DNS is published, an ordinary verification retry can be attempted with:

```sh
aws --profile jm --region ap-south-1 amplify update-domain-association \
  --app-id d26ztc5gxt79re --domain-name learn.ai4impact.in \
  --sub-domain-settings '[{"branchName":"main","prefix":""}]'
```

If AWS rejects this with an expired/unsuccessful verification error and explicitly requires re-adding the domain, do not repeatedly retry or change other domains. Recreating the failed attachment needs owner approval because a new routing CNAME may be issued.

If the recreated association instead reports an incorrectly configured DNS record pointing to another CloudFront distribution, update GoDaddy to the newly issued `learn` target first and then retry the existing association. Do not repeatedly recreate it; that can issue yet another target.

Then verify DNS, Amplify AVAILABLE status, HTTPS with a valid certificate, `/login`, direct lecture URLs, and static assets. The route must serve the student portal, not the marketing site.

Only after HTTPS succeeds, set `student_portal_custom_domain_ready=true` in the private production Terraform variables, review/apply the landing/admin branch environment changes, and rebuild both apps. This sets `NEXT_PUBLIC_STUDENT_PORTAL_URL=https://learn.ai4impact.in`. The flag defaults to false, keeping the working origin active during DNS setup. Until DNS/certificate verification is complete, retain the working origin value in the deployed environment so Student login goes directly to its working `/login` page.

## Branding and app configuration

Current tracked source, configuration, documentation, filenames and fresh application bundles are scanned for legacy company attribution. Native identifiers are `com.samagyaan.ai4impact`; the iOS project/target is `AI4Impact`. This requires matching native signing/provisioning and a fresh mobile build. Web deployment does not update installed native apps. Xcode project/plist syntax is validated; a full signed native build requires Xcode and mobile provisioning.

Generated Terraform plans were removed from source control and ignored. Existing public course-certificate labels were updated in place with an optimistic-write guard and a private backup; no historical issued certificates matched the legacy provider. Existing accounts, course access and watch progress are preserved.

Privacy entry points open the published website policy, preserving unfinished forms. New consent submissions identify the published policy date as `2026-10-01`; existing consent records are retained.

Video controls use Settings → Playback speed with a selected checkmark, keyboard navigation, outside-click/Escape dismissal and fullscreen support. All six speeds and the existing watch-credit rules are preserved.
