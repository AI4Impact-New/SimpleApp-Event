'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { learning, LearningClass, Exam, Learner, Certificate, CompletionRules, errorMessage } from '@/services/learning';
import { ContentPanel } from '@/components/learning/ContentPanel';
import { ExamsPanel } from '@/components/learning/ExamsPanel';
import { LearnersPanel, CompletionPanel, CertificatesPanel } from '@/components/learning/ManagementPanels';

const tabs = ['Content', 'Assessments', 'Learners', 'Completion', 'Certificates'] as const;
export default function CourseLearningStudio() {
  const id = useParams()?.id as string;
  const [tab, setTab] = useState<typeof tabs[number]>('Content'); const [title, setTitle] = useState('');
  const [classes, setClasses] = useState<LearningClass[]>([]); const [exams, setExams] = useState<Exam[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]); const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [rules, setRules] = useState<CompletionRules | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const [course, lectures, assessments, people, issued, config] = await Promise.all([api.getCourse(id), learning.classes(id), learning.exams(id), learning.learners(id), learning.certificates(), learning.rules(id)]);
      setTitle(course.title); setClasses(lectures); setExams(assessments); setLearners(people); setCertificates(issued.filter(value => value.course_id === id)); setRules(config);
    } catch (error) { setError(errorMessage(error)); throw error; } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { if (id) void load().catch(() => {}); }, [id, load]);
  return <div className="space-y-6"><header><Link className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary-600" href="/dashboard/learning"><ArrowLeft size={16} />Learning Studio</Link><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-primary-600">Course workspace</p><h1 className="text-2xl font-bold tracking-tight text-gray-950">{title || 'Loading course…'}</h1></div><div className="flex gap-2"><Link className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm" href={`/dashboard/courses/${id}`}><BookOpen size={16} />Course details</Link><button aria-label="Refresh course workspace" onClick={() => void load().catch(() => {})} className="rounded-lg border bg-white p-2 hover:bg-gray-50"><RefreshCw size={18} /></button></div></div></header>{error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}<button onClick={() => void load().catch(() => {})} className="ml-3 underline">Retry</button></p>}<div className="overflow-x-auto border-b border-gray-200"><nav className="flex min-w-max gap-5" aria-label="Course workspace tabs">{tabs.map(value => <button key={value} onClick={() => setTab(value)} className={`border-b-2 px-1 py-3 text-sm font-medium ${tab === value ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>{value}{value === 'Learners' && learners.length ? ` (${learners.length})` : ''}</button>)}</nav></div>{loading ? <div className="rounded-xl border bg-white p-12 text-center text-sm text-gray-500">Loading course workspace…</div> : !error && <>{tab === 'Content' && <ContentPanel courseId={id} classes={classes} refresh={load} />}{tab === 'Assessments' && <ExamsPanel courseId={id} exams={exams} refresh={load} />}{tab === 'Learners' && <LearnersPanel courseId={id} learners={learners} classes={classes} refresh={load} />}{tab === 'Completion' && rules && <CompletionPanel courseId={id} rules={rules} refresh={load} />}{tab === 'Certificates' && <CertificatesPanel certificates={certificates} refresh={load} />}</>}</div>;
}
