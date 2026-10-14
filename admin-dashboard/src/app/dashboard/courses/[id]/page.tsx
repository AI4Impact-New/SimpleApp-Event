'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useCourse, useCourseRegistrations } from '@/hooks/useCourses';
import { Loader2, ArrowLeft, Pencil, Video, VideoIcon, MapPin, Calendar } from 'lucide-react';
import type { CoursePhase, CourseCertificate, CourseClass, CourseRegistration } from '@/types/course';

type Tab = 'overview' | 'plan' | 'registrations';

function isClassPlanned(cl: CourseClass): boolean {
  if (cl.class_type === 'recorded') return !!cl.recording_material_id;
  if (cl.class_type === 'online') return !!(cl.start_time && cl.zoom_link);
  if (cl.class_type === 'in_person') return !!(cl.start_time && cl.location);
  return false;
}

export default function CourseViewPage() {
  const params = useParams();
  const id = params?.id as string;
  const [tab, setTab] = useState<Tab>('overview');
  const { data: course, isLoading, error } = useCourse(id);
  const { data: registrations = [] } = useCourseRegistrations(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-20 shadow-sm">
        <Loader2 className="animate-spin text-primary-500" size={32} aria-hidden />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Failed to load course. <Link href="/dashboard/courses" className="underline">Back to courses</Link>
      </div>
    );
  }

  const highlights = course.highlights ?? [];
  const phases = course.phases ?? [];
  const benefits = course.benefits ?? [];
  const audience = course.audience ?? [];
  const careerOutcomes = course.career_outcomes ?? [];
  const certificate = course.certificate as CourseCertificate | null | undefined;
  const classes = (course.classes ?? []) as CourseClass[];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'plan', label: 'Plan & Schedule' },
    { key: 'registrations', label: 'Registrations' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/courses"
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={18} />
            Courses
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{course.title}</h1>
        </div>
        <div className="flex gap-2"><Link href={`/dashboard/learning/${id}`} className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">Learning Studio</Link><Link
          href={`/dashboard/courses/${id}/edit`}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <Pencil size={18} />
          Edit
        </Link></div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                tab === t.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'overview' && (
        <div className="space-y-8">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Overview</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  course.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {course.status}
              </span>
              <span className="text-sm text-gray-500">Display order: {course.display_order ?? 0}</span>
            </div>
            {course.short_description && (
              <p className="text-gray-600 mb-2">{course.short_description}</p>
            )}
            {course.full_description && (
              <div className="mt-2 text-gray-600 whitespace-pre-wrap">{course.full_description}</div>
            )}
          </section>

          {highlights.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Highlights</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {highlights.map((h: { label: string; value: string }, i: number) => (
                  <div key={i} className="flex flex-col">
                    <dt className="text-sm font-medium text-gray-500">{h.label}</dt>
                    <dd className="text-gray-900">{h.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {phases.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Phases / Modules</h2>
              <div className="space-y-4">
                {phases.map((phase: CoursePhase, i: number) => (
                  <div key={phase.id ?? i} className="border-l-2 border-primary-200 pl-4">
                    <h3 className="font-medium text-gray-900">{phase.title}</h3>
                    {phase.subtitle && <p className="text-sm text-gray-600 mt-0.5">{phase.subtitle}</p>}
                    {phase.phase_items && phase.phase_items.length > 0 && (
                      <ul className="mt-2 list-disc list-inside text-sm text-gray-600 space-y-1">
                        {phase.phase_items.map((item: { text: string; item_type?: string }, j: number) => (
                          <li key={j}>
                            <span className="text-gray-500">[{item.item_type ?? 'item'}]</span> {item.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {benefits.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Benefits</h2>
              <ul className="space-y-2">
                {benefits.map((b: { title: string; description?: string }, i: number) => (
                  <li key={i}>
                    <span className="font-medium text-gray-900">{b.title}</span>
                    {b.description && <p className="text-sm text-gray-600 mt-0.5">{b.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {audience.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Who should attend</h2>
              <ul className="space-y-2">
                {audience.map((a: { title: string; description?: string }, i: number) => (
                  <li key={i}>
                    <span className="font-medium text-gray-900">{a.title}</span>
                    {a.description && <p className="text-sm text-gray-600 mt-0.5">{a.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {careerOutcomes.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Career outcomes</h2>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                {careerOutcomes.map((c: { text: string }, i: number) => (
                  <li key={i}>{c.text}</li>
                ))}
              </ul>
            </section>
          )}

          {certificate && (certificate.title || certificate.provider || certificate.description) && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Certificate</h2>
              {certificate.title && <p className="font-medium text-gray-900">{certificate.title}</p>}
              {certificate.provider && <p className="text-sm text-gray-600">Provider: {certificate.provider}</p>}
              {certificate.description && <p className="mt-2 text-gray-600">{certificate.description}</p>}
            </section>
          )}
        </div>
      )}

      {tab === 'plan' && (
        <div className="space-y-6">
          {phases.length > 0 && (
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Phases & sub-points</h2>
              <div className="space-y-4">
                {phases.map((phase: CoursePhase, pi: number) => (
                  <div key={phase.id ?? pi} className="border-l-2 border-primary-200 pl-4">
                    <h3 className="font-medium text-gray-900">{phase.title}</h3>
                    {phase.subtitle && <p className="text-sm text-gray-600 mt-0.5">{phase.subtitle}</p>}
                    {phase.phase_items && phase.phase_items.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {phase.phase_items.map((item: { text: string; item_type?: string }, j: number) => (
                          <li key={j} className="flex items-center justify-between gap-2 text-sm text-gray-600">
                            <span><span className="text-gray-400 font-mono">#{j + 1}</span> {item.text}</span>
                            <span className="text-xs text-gray-400">[{item.item_type ?? 'item'}]</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Classes / Sessions</h2>
            <p className="text-sm text-gray-500 mb-4">Click a class to view details (recorded: player, online: Zoom + .ics, in-person: venue).</p>
            {classes.length === 0 ? (
              <p className="text-gray-500">No classes added yet. Edit course to add classes.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {classes.map((cl, i) => {
                  const planned = isClassPlanned(cl);
                  return (
                    <li key={cl.id ?? i} className="py-3 first:pt-0">
                      <Link
                        href={`/dashboard/courses/${id}/classes/${cl.id}`}
                        className="flex items-center justify-between gap-4 hover:bg-gray-50 rounded-lg p-2 -mx-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-gray-400 font-mono text-sm shrink-0">{i + 1}.</span>
                          <span className="font-medium text-gray-900 truncate">{cl.title}</span>
                          <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                            cl.class_type === 'recorded' ? 'bg-purple-100 text-purple-800' :
                            cl.class_type === 'online' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {cl.class_type === 'in_person' ? 'In person' : cl.class_type}
                          </span>
                          <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${planned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {planned ? 'Planned' : 'Unplanned'}
                          </span>
                        </div>
                        {cl.duration_minutes != null && (
                          <span className="text-sm text-gray-500 shrink-0">{cl.duration_minutes} min</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === 'registrations' && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrations & Enquiries</h2>
          {registrations.length === 0 ? (
            <p className="text-gray-500">No registrations yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(registrations as CourseRegistration[]).map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{r.name ?? '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{r.email ?? '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{r.user_type ?? '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.status === 'registered' ? 'bg-green-100 text-green-800' :
                          r.status === 'interested' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500 max-w-xs truncate">{r.notes ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
