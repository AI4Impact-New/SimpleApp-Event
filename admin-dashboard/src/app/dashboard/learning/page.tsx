'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, BookOpen, GraduationCap, Film, Award, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { learning, LearningOverview, errorMessage } from '@/services/learning';
import type { Course } from '@/types/course';

export default function LearningStudio() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<LearningOverview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { const [catalog, overview] = await Promise.all([api.getCourses(), learning.overview()]); setCourses(catalog); setStats(overview); }
    catch (error) { setError(errorMessage(error)); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const cards = [
    { label: 'Courses', value: stats?.courses, icon: BookOpen, color: 'bg-blue-50 text-blue-700' },
    { label: 'Enrolments', value: stats?.enrolled_learners, icon: GraduationCap, color: 'bg-violet-50 text-violet-700' },
    { label: 'Ready recordings', value: stats?.published_recordings, icon: Film, color: 'bg-amber-50 text-amber-700' },
    { label: 'Certificates', value: stats?.valid_certificates, icon: Award, color: 'bg-emerald-50 text-emerald-700' },
  ];
  return <div className="space-y-7">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary-600">AI4Impact / Teaching</p><h1 className="text-3xl font-bold tracking-tight text-gray-950">Learning Studio</h1><p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">Turn your course plan into a learning experience. Publish recordings, create assessments, and follow every learner through completion.</p></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />Refresh</button>
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button onClick={() => void load()} className="ml-3 font-semibold underline">Retry</button></div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(card => <div key={card.label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5"><div className={`rounded-xl p-3 ${card.color}`}><card.icon size={21} /></div><div><p className="text-sm text-gray-500">{card.label}</p><p className="mt-1 text-2xl font-semibold text-gray-950">{loading ? '—' : card.value ?? 0}</p></div></div>)}</div>
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><div><h2 className="font-semibold text-gray-900">Your courses</h2><p className="mt-1 text-sm text-gray-500">Choose a course to manage its learning content.</p></div><label className="sr-only" htmlFor="course-search">Search courses</label><input id="course-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search courses…" className="w-full rounded-lg border px-3 py-2 text-sm sm:w-64" /></div>
      {loading ? <div className="p-12 text-center text-sm text-gray-500">Loading your teaching workspace…</div> : courses.length === 0 ? <div className="p-12 text-center"><BookOpen className="mx-auto mb-3 text-primary-500" size={36} /><h3 className="font-semibold text-gray-900">Build your first learning journey</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">Create a course, then add its classes and assessments here.</p><Link href="/dashboard/courses/new" className="mt-5 inline-flex rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700">Create a course</Link></div> : <div className="divide-y">{courses.filter(course => course.title.toLowerCase().includes(search.toLowerCase())).map(course => <Link key={course.id} href={`/dashboard/learning/${course.id}`} className="group flex items-center gap-4 p-5 transition-colors hover:bg-blue-50/40"><div className="hidden rounded-xl bg-gray-50 p-3 text-primary-600 sm:block"><BookOpen size={22} /></div><div className="min-w-0 flex-1"><h3 className="font-semibold text-gray-900">{course.title}</h3><p className="mt-1 truncate text-sm text-gray-500">{course.short_description || 'Manage lectures, exams, and learner progress'}</p></div><span className={`hidden rounded-full px-3 py-1 text-xs font-medium sm:inline ${course.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{course.status}</span><ArrowUpRight size={20} className="shrink-0 text-gray-400 group-hover:text-primary-600" /></Link>)}{search && !courses.some(course => course.title.toLowerCase().includes(search.toLowerCase())) && <p className="p-8 text-center text-sm text-gray-500">No courses match your search.</p>}</div>}
    </section>
  </div>;
}
