# AI4Impact frontend and backend handoff

17 November 2026

## What changed

Learning Studio now has a publish flow for the course ZIP preview in the Admin Console. Go to **Learning Studio → select a course → Content → Choose ZIP file**. Review the module and lecture titles, order and files, then select **Publish content**. Recorded lectures are appended to the existing course and use the existing private player and sequential viewing rules. The service preserves module resources and lecture attachments. An entry with files and no MP4 appears as a resource-only lesson in the content API and stays outside lecture completion counts.

Files upload directly to private S3. The server checks the expected sizes and content types before publishing the records in a single database transaction. Keep the tab open. If an upload fails, select **Publish content** again on the same preview to retry with the same import ID. This release supports up to 40 files per import, MP4 recordings up to 2 GiB each, and resource files up to 100 MiB each. Starting over after a reload creates a new import. If a publish response is lost, retry in the same tab before starting over.

## Recent frontend changes and backend status

| Area | Backend status and frontend action |
| --- | --- |
| Learning Studio content and admin editors, PR #67 | Manual classes, live scheduling, video uploads, reopening a learner's viewing window, assessments, progress and certificates already have APIs. Bulk ZIP publish is the new addition in this change. |
| Student onboarding, PR #70 | Existing assisted onboarding APIs cover the profile, Cognito account and invitation, pro forma quote and quote email. The agreed instalment plan is saved through the Payments Ledger. The pro forma quote is a demo artefact. For real collection, use the plan's payment link and verified Razorpay checkout. |
| Certificate verification and trainer profiles, PR #71 | Certificate verification uses the existing public certificate endpoint. Trainer profiles are website content. |
| Landing navigation and trainer expansion, PRs #72 and #73 | Navigation and content changes. They require no new APIs. |
| Student web event layouts and checkout, PR #61, with portal redeploy in PR #74 | Event details, joining, live polls, event attachments, attendance and leaderboards use existing APIs. Standard course checkout uses the existing Razorpay verification flow. |
| Student course key facts and catalogue, open PR #76 | The revised course editor sends key facts through the existing `highlights` field in `POST /courses` and `PUT /courses/{id}`. The catalogue reads those highlights. PR #76 remains separate from ZIP publishing. |
| Programme+ tab and learner ID, PR #61 | Profile and course enrollment APIs already supply the learner identity and course. Programme+ scheduling, entitlements and career APIs already exist. The separately priced Programme+ add-on checkout remains a placeholder. It needs an approved product and price, purchase eligibility, verified payment-to-entitlement mapping and refund policy. Standard course checkout must not be reused as the add-on purchase. |

## API contract

Use the API base URL and bearer ID token for the environment being tested. Define `API`, `ADMIN_TOKEN`, `STUDENT_TOKEN`, `COURSE_ID`, `IMPORT_ID` and `RESOURCE_ID` locally. The Admin Console already implements the first three steps.

1. Stage the reviewed manifest. Use a new UUID for the import and a distinct UUID for each file. Retry the same manifest under the same import ID. The server returns `{"status":"uploading","uploads":[{"id":"…","url":"…","fields":{…}}]}`. Once published, the same stage request returns `status: "published"` and an empty upload list.

```bash
curl --fail-with-body -X PUT "$API/admin/courses/$COURSE_ID/content-imports/$IMPORT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  --data-binary @manifest.json
```

```json
{
  "modules": [{
    "title": "Foundations",
    "resources": [{
      "id": "00000000-0000-4000-8000-000000000001",
      "name": "Syllabus.pdf",
      "size": 1200
    }],
    "lectures": [{
      "title": "SQL basics",
      "video": {
        "id": "00000000-0000-4000-8000-000000000002",
        "name": "SQL basics.mp4",
        "size": 540000,
        "duration_seconds": 78
      },
      "resources": []
    }]
  }]
}
```

2. For each upload, send a multipart POST to the returned S3 URL. Add every returned form field and append the file last. Use the actual file size in bytes. Send the bearer token only to the API, never to S3. Repeat the stage request to refresh expired upload forms.
3. Publish after the files upload. A missing or mismatched object returns HTTP 409. Repeated successful requests return `{"status":"published"}`.

```bash
curl --fail-with-body -X POST "$API/admin/courses/$COURSE_ID/content-imports/$IMPORT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{}'
```

4. In the Student Portal curriculum, load the published outline. Map each lecture with an `id` to the existing class list and player to preserve progress and lock states. Render an `id: null` entry as resource-only. Module and lecture resources contain `id`, `filename` and `size_bytes`. A course with no imported content returns `{"modules":[]}`.

```bash
curl --fail-with-body "$API/learning/courses/$COURSE_ID/content" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

5. On download, request a fresh link and open the returned `url`. The link expires after 300 seconds. Students must have access to the course. Use the course workspace for these resources, separate from event attachments.

```bash
curl --fail-with-body "$API/learning/courses/$COURSE_ID/content/$RESOURCE_ID" \
  -H "Authorization: Bearer $STUDENT_TOKEN"
```

## Release and QA

- Apply migration `026_course_content_import.sql` to dev, deploy the Learning Lambda, then release the Admin build. Learner-side rendering for the imported resource outline still needs to be wired into the Student Portal.
- The Admin production build and five focused Playwright tests passed locally. PostgreSQL integration verified a missing upload blocks publication, concurrent publish requests do not duplicate content, and an unenrolled user cannot request the download. S3 calls in the integration test and browser checks were simulated.
- Before production, use a dev course and a real ZIP containing an MP4, one lecture attachment and one module resource. Verify private S3 upload and download, retry after a failed upload, ordering, playback for an enrolled learner and access denial for an unenrolled learner. Confirm the Student Portal shows the module and lecture resources.
- This change does not include a cleanup job for abandoned imports. Before enabling at scale, decide how long to retain unpublished uploads and monitor S3 storage and request usage. [AWS S3 presigned URL documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
