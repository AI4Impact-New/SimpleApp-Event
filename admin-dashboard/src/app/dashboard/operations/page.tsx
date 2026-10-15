"use client";
import { useState, useEffect } from "react";
import api from "@/services/api";
import { errorMessage } from "@/services/learning";
type Readiness = {
  database: string;
  published_courses: number;
  recordings_needing_upload: number;
  courses_without_classes: number;
  new_enquiries: number;
  pending_push_jobs: number;
  failed_push_jobs: number;
  push_configured: boolean;
  expo_project_id: string | null;
};
export default function Operations() {
  const [data, setData] = useState<Readiness | null>(null),
    [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      setData(
        await api.learningRequest<Readiness>(
          "GET",
          "/admin/operations/readiness",
        ),
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="space-y-6">
      <header className="flex justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Launch readiness</h1>
          <p className="mt-2 text-sm text-gray-600">
            Check course setup and notification readiness before release.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="rounded-lg border bg-white px-4 py-2"
        >
          Refresh
        </button>
      </header>
      {error && (
        <p role="alert" className="bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Database", data.database],
              ["Published courses", data.published_courses],
              ["Courses without classes", data.courses_without_classes],
              ["Recordings needing upload", data.recordings_needing_upload],
              ["New enquiries", data.new_enquiries],
              ["Failed push jobs", data.failed_push_jobs],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border bg-white p-5">
                <h2 className="text-sm text-gray-600">{label}</h2>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </article>
            ))}
          </div>
          <section className="rounded-xl border bg-white p-5">
            <h2 className="font-semibold">Native push notifications</h2>
            <p className="mt-2 text-sm">
              {data.push_configured
                ? "Project configured. Physical-device delivery still requires acceptance testing."
                : "Not activated. The mobile team must provide the real Expo/EAS project UUID and configure a device build."}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              {data.expo_project_id || "No project UUID configured"} ·{" "}
              {data.pending_push_jobs} pending jobs
            </p>
          </section>
          <section className="rounded-xl border bg-white p-5 space-y-3">
            <h2 className="font-semibold">Before launch</h2>
            <ul className="list-disc pl-5 text-sm space-y-2">
              <li>Upload real recordings and publish approved assessments.</li>
              <li>
                Approve completion, attendance and retry rules per course.
              </li>
              <li>
                Assign named staff through Admin Users → Marketing-only access.
              </li>
              <li>
                Confirm the operational alert subscription and test
                physical-device push.
              </li>
              <li>
                Keep checkout in demo mode until a separate payment release is
                approved.
              </li>
            </ul>
            <a
              className="inline-block text-primary-700 underline text-sm"
              href="https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#dashboards/dashboard/pilearn-operations"
              target="_blank"
              rel="noreferrer"
            >
              Open AWS operations dashboard
            </a>
          </section>
        </>
      )}
    </div>
  );
}
