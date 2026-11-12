'use client';
import { useState } from 'react';
import { AlertCircle, Check, ChevronDown, ClipboardCheck, ClipboardPaste, Copy, Pencil, Plus, Trash2, X } from 'lucide-react';
import { learning, Exam, ExamQuestion, errorMessage } from '@/services/learning';
import { EditorView } from '@/components/ui/EditorView';

const button = 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50';
const secondary = 'inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50';
const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';
const letter = (index: number) => String.fromCharCode(97 + index);
const newQuestion = (): ExamQuestion => ({ question: '', options: [{ id: 'a', label: '' }, { id: 'b', label: '' }, { id: 'c', label: '' }, { id: 'd', label: '' }], correct_option_id: 'a', points: 1 });
const blankExam = (): Partial<Exam> => ({ title: '', description: '', published: false, time_limit_seconds: 1800, max_attempts: 3, pass_percentage: 70, questions: [newQuestion()] });

/** Problems that would stop a learner from taking the exam, one per question. */
function issuesOf(question: ExamQuestion): string[] {
  const issues: string[] = [];
  if (!question.question.trim()) issues.push('question text');
  if (question.options.some(option => !option.label.trim())) issues.push('empty option');
  return issues;
}

/**
 * Bulk paste format (one blank line between questions):
 *   1. What does ADF orchestrate?
 *   A) Databases
 *   *B) Data pipelines        ← "*" marks the correct answer (or add "Answer: B")
 */
export function parseQuestions(text: string): ExamQuestion[] {
  return text.split(/\n\s*\n/).map(block => block.split('\n').map(line => line.trim()).filter(Boolean)).filter(lines => lines.length >= 3).map(lines => {
    const answerLine = lines.find(line => /^answer\s*[:\-]/i.test(line));
    const optionLines = lines.slice(1).filter(line => line !== answerLine && /^\*?\s*[a-h]\s*[).:\-]\s*/i.test(line));
    const starred = optionLines.findIndex(line => line.startsWith('*'));
    const answered = answerLine?.match(/[:\-]\s*([a-h])\b/i)?.[1]?.toLowerCase();
    const options = optionLines.slice(0, 8).map((line, index) => ({ id: letter(index), label: line.replace(/^\*?\s*[a-h]\s*[).:\-]\s*/i, '') }));
    return {
      question: lines[0].replace(/^(q\s*)?\d+\s*[).:\-]\s*/i, ''),
      options,
      correct_option_id: answered && options.some(o => o.id === answered) ? answered : letter(Math.max(starred, 0)),
      points: 1,
    };
  }).filter(question => question.options.length >= 2);
}

function NumberSetting({ label, value, onChange, min, max, suffix }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number; suffix: string }) {
  return <label className="flex flex-col gap-1 text-xs font-medium text-gray-500">{label}
    <span className="flex items-center rounded-lg border border-gray-300 bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
      <input type="number" required min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} className="w-full min-w-0 rounded-lg bg-transparent px-3 py-2 text-sm font-normal text-gray-900 focus:outline-none" />
      <span className="pr-3 text-sm font-normal text-gray-400">{suffix}</span>
    </span>
  </label>;
}

function QuestionCard({ question, index, open, onOpen, onChange, onDuplicate, onRemove, canRemove }: {
  question: ExamQuestion; index: number; open: boolean; onOpen: () => void; onChange: (update: Partial<ExamQuestion>) => void;
  onDuplicate: () => void; onRemove: () => void; canRemove: boolean;
}) {
  const issues = issuesOf(question);
  const correct = question.options.find(option => option.id === question.correct_option_id);
  const setOptions = (options: ExamQuestion['options'], correctIndex = question.options.findIndex(o => o.id === question.correct_option_id)) => {
    const relettered = options.map((option, i) => ({ ...option, id: letter(i) }));
    onChange({ options: relettered, correct_option_id: letter(Math.min(Math.max(correctIndex, 0), relettered.length - 1)) });
  };
  const addOption = (focus = true) => {
    if (question.options.length >= 8) return;
    setOptions([...question.options, { id: '', label: '' }]);
    if (focus) setTimeout(() => document.getElementById(`q${index}-opt${question.options.length}`)?.focus());
  };

  if (!open) return <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left hover:border-gray-300 hover:shadow-sm">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600">{index + 1}</span>
    <span className={`min-w-0 flex-1 truncate text-sm ${question.question ? 'text-gray-900' : 'italic text-gray-400'}`}>{question.question || 'Untitled question'}</span>
    {issues.length > 0 ? <span className="inline-flex shrink-0 items-center gap-1 text-xs text-amber-700"><AlertCircle size={14} />Incomplete</span>
      : <span className="hidden shrink-0 items-center gap-1 text-xs text-emerald-700 sm:inline-flex"><Check size={14} />{correct?.id.toUpperCase()}</span>}
    <span className="shrink-0 text-xs text-gray-400">{question.points} pt{question.points === 1 ? '' : 's'}</span>
    <ChevronDown size={16} className="shrink-0 text-gray-400" />
  </button>;

  return <fieldset className="rounded-xl border border-primary-300 bg-white p-4 shadow-sm ring-1 ring-primary-100">
    <legend className="sr-only">Question {index + 1}</legend>
    <div className="flex items-start gap-3">
      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-600 text-xs font-semibold text-white">{index + 1}</span>
      <textarea aria-label={`Question ${index + 1} text`} required rows={2} placeholder="Type the question…" value={question.question}
        onChange={event => onChange({ question: event.target.value })} className={`${field} resize-y text-[15px]`} />
    </div>
    <p className="mb-2 mt-4 pl-10 text-xs text-gray-500">Click a letter to mark the correct answer. Press Enter to add another option.</p>
    <ol className="space-y-2 pl-10">
      {question.options.map((option, optionIndex) => {
        const isCorrect = option.id === question.correct_option_id;
        return <li key={optionIndex} className="flex items-center gap-2">
          <button type="button" aria-label={`Question ${index + 1} correct answer ${option.id.toUpperCase()}`} aria-pressed={isCorrect} onClick={() => onChange({ correct_option_id: option.id })}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition ${isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 bg-white text-gray-500 hover:border-emerald-400 hover:text-emerald-600'}`}>
            {isCorrect ? <Check size={15} /> : option.id.toUpperCase()}
          </button>
          <input id={`q${index}-opt${optionIndex}`} aria-label={`Question ${index + 1} option ${option.id.toUpperCase()}`} required placeholder={`Option ${option.id.toUpperCase()}`} value={option.label}
            onChange={event => setOptions(question.options.map((value, i) => i === optionIndex ? { ...value, label: event.target.value } : value))}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); if (optionIndex === question.options.length - 1) addOption(); else document.getElementById(`q${index}-opt${optionIndex + 1}`)?.focus(); } }}
            className={`${field} ${isCorrect ? 'border-emerald-300 bg-emerald-50/40' : ''}`} />
          <button type="button" aria-label={`Remove option ${option.id.toUpperCase()}`} disabled={question.options.length <= 2}
            onClick={() => { const current = question.options.findIndex(o => o.id === question.correct_option_id); setOptions(question.options.filter((_, i) => i !== optionIndex), current > optionIndex ? current - 1 : current === optionIndex ? 0 : current); }}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:invisible"><X size={15} /></button>
        </li>;
      })}
    </ol>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 pl-10">
      <button type="button" disabled={question.options.length >= 8} onClick={() => addOption()} className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 disabled:opacity-40"><Plus size={15} />Add option</button>
      <label className="ml-auto flex items-center gap-2 text-sm text-gray-600">Points
        <input type="number" min={1} max={100} required value={question.points} onChange={event => onChange({ points: Number(event.target.value) })} className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none" />
      </label>
      <button type="button" aria-label={`Duplicate question ${index + 1}`} title="Duplicate" onClick={onDuplicate} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><Copy size={16} /></button>
      <button type="button" aria-label={`Remove question ${index + 1}`} title="Remove" disabled={!canRemove} onClick={onRemove} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 size={16} /></button>
    </div>
  </fieldset>;
}

function AssessmentEditor({ courseId, initial, onClose, onSaved }: { courseId: string; initial: Partial<Exam>; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [exam, setExam] = useState(initial);
  const [active, setActive] = useState(0);
  const [pasting, setPasting] = useState(false); const [pasted, setPasted] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const questions = exam.questions || [];
  const setQuestions = (next: ExamQuestion[]) => setExam({ ...exam, questions: next });
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
  const incomplete = questions.map((q, i) => ({ i, issues: issuesOf(q) })).filter(q => q.issues.length);
  const preview = pasted ? parseQuestions(pasted) : [];

  const save = async (published: boolean) => {
    if (!exam.title?.trim()) { setError('Give the assessment a title.'); return; }
    if (incomplete.length) { setActive(incomplete[0].i); setError(`Finish question ${incomplete[0].i + 1} before saving.`); return; }
    setBusy(true); setError('');
    try {
      await learning.saveExam(courseId, { ...exam, published }, exam.id);
      await onSaved(published ? 'Assessment published to enrolled learners.' : 'Draft saved.');
    } catch (error) { setError(errorMessage(error)); setBusy(false); }
  };

  return <EditorView label="Assessment editor" backLabel="All assessments" busy={busy} onClose={onClose}
    title={<div className="flex items-center gap-2">
      <input aria-label="Assessment title" data-autofocus placeholder="Untitled assessment" value={exam.title || ''} onChange={event => setExam({ ...exam, title: event.target.value })}
        className="min-w-0 flex-1 rounded-md border border-transparent px-1 py-0.5 text-lg font-semibold text-gray-900 placeholder:text-gray-300 hover:border-gray-200 focus:border-primary-400 focus:outline-none" />
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${exam.published ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{exam.published ? 'Published' : 'Draft'}</span>
    </div>}
    subtitle={<span className="pl-1">{questions.length} question{questions.length === 1 ? '' : 's'} · {totalPoints} points · multiple choice</span>}
    footer={<div className="space-y-3">
      {error && <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"><AlertCircle size={15} />{error}</p>}
      {!error && incomplete.length > 0 && <p className="flex items-center gap-2 text-xs text-amber-700"><AlertCircle size={14} />{incomplete.length} question{incomplete.length > 1 ? 's need' : ' needs'} attention: {incomplete.slice(0, 4).map(q => `Q${q.i + 1} (${q.issues.join(', ')})`).join(' · ')}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" className="mr-auto text-sm text-gray-500 hover:text-gray-800" disabled={busy} onClick={onClose}>Cancel</button>
        {exam.published ? <>
          <button type="button" className={secondary} disabled={busy} onClick={() => void save(false)}>Unpublish</button>
          <button type="button" className={button} disabled={busy} onClick={() => void save(true)}>{busy ? 'Saving…' : 'Save changes'}</button>
        </> : <>
          <button type="button" className={secondary} disabled={busy} onClick={() => void save(false)}>Save draft</button>
          <button type="button" className={button} disabled={busy} onClick={() => void save(true)}>{busy ? 'Saving…' : 'Save & publish'}</button>
        </>}
      </div>
      <p className="text-right text-xs text-gray-400">Changes never affect an attempt already in progress.</p>
    </div>}>
    <section aria-label="Assessment settings" className="grid grid-cols-3 gap-3 rounded-xl border bg-white p-4">
      <NumberSetting label="Time limit" suffix="min" min={1} max={180} value={(exam.time_limit_seconds || 1800) / 60} onChange={value => setExam({ ...exam, time_limit_seconds: value * 60 })} />
      <NumberSetting label="Pass mark" suffix="%" min={0} max={100} value={exam.pass_percentage ?? 70} onChange={value => setExam({ ...exam, pass_percentage: value })} />
      <NumberSetting label="Attempts" suffix="max" min={1} max={20} value={exam.max_attempts ?? 3} onChange={value => setExam({ ...exam, max_attempts: value })} />
    </section>

    <div className="mt-6 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-900">Questions</h3>
      <button type="button" onClick={() => setPasting(!pasting)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"><ClipboardPaste size={15} />Paste questions</button>
    </div>

    {pasting && <div className="mt-3 rounded-xl border border-dashed border-primary-300 bg-white p-4">
      <p className="text-sm text-gray-600">Paste from a doc. Separate questions with a blank line and mark the right answer with <code className="rounded bg-gray-100 px-1">*</code>.</p>
      <textarea aria-label="Pasted questions" rows={7} value={pasted} onChange={event => setPasted(event.target.value)} className={`${field} mt-3 font-mono text-xs`}
        placeholder={'1. What does Azure Data Factory orchestrate?\nA) Virtual machines\n*B) Data pipelines\nC) DNS records\n\n2. Which file format is columnar?\nA) CSV\nB) JSON\n*C) Parquet'} />
      <div className="mt-3 flex items-center justify-end gap-2">
        <span className="mr-auto text-xs text-gray-500">{pasted ? `${preview.length} question${preview.length === 1 ? '' : 's'} detected` : ''}</span>
        <button type="button" className="text-sm text-gray-500" onClick={() => { setPasting(false); setPasted(''); }}>Cancel</button>
        <button type="button" className={button} disabled={!preview.length} onClick={() => {
          const keep = questions.filter(q => q.question.trim() || q.options.some(o => o.label.trim()));
          setQuestions([...keep, ...preview]); setActive(keep.length); setPasting(false); setPasted('');
        }}>Add {preview.length || ''} questions</button>
      </div>
    </div>}

    <div className="mt-3 space-y-2">
      {questions.map((question, index) => <QuestionCard key={index} question={question} index={index} open={index === active} onOpen={() => setActive(index)}
        onChange={update => setQuestions(questions.map((q, i) => i === index ? { ...q, ...update } : q))}
        onDuplicate={() => { setQuestions([...questions.slice(0, index + 1), { ...question, id: undefined, options: question.options.map(o => ({ ...o })) }, ...questions.slice(index + 1)]); setActive(index + 1); }}
        onRemove={() => { setQuestions(questions.filter((_, i) => i !== index)); setActive(Math.max(0, index - 1)); }}
        canRemove={questions.length > 1} />)}
    </div>
    <button type="button" onClick={() => { setQuestions([...questions, newQuestion()]); setActive(questions.length); }}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-600 hover:border-primary-400 hover:text-primary-700"><Plus size={16} />Add question</button>
  </EditorView>;
}

export function ExamsPanel({ courseId, exams, refresh }: { courseId: string; exams: Exam[]; refresh: () => Promise<void> }) {
  const [editing, setEditing] = useState<Partial<Exam> | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState('');
  const run = async (action: () => Promise<unknown>) => { setBusy(true); setError(''); setNotice(''); try { await action(); await refresh(); } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); } };
  if (editing) return <AssessmentEditor courseId={courseId} initial={editing} onClose={() => setEditing(null)} onSaved={async message => { setEditing(null); setNotice(message); await refresh(); }} />;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Assessments</h2><p className="mt-1 text-sm text-gray-500">Scored multiple-choice exams with a time limit and retry policy.</p></div><button className={button} onClick={() => setEditing(blankExam())}><Plus size={16} />New assessment</button></div>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}{notice && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    {!exams.length && <div className="rounded-xl border border-dashed bg-white p-10 text-center"><ClipboardCheck className="mx-auto mb-3 text-gray-400" size={30} /><h3 className="font-medium">Check understanding, then certify achievement</h3><p className="mt-2 text-sm text-gray-500">Add your first assessment, or paste a question set you already have.</p><button className={`${button} mt-4`} onClick={() => setEditing(blankExam())}><Plus size={16} />New assessment</button></div>}
    {exams.length > 0 && <ol className="divide-y overflow-hidden rounded-xl border bg-white">{exams.map(exam => <li className="flex flex-wrap items-center gap-3 px-4 py-3" key={exam.id}>
      <ClipboardCheck size={18} className="shrink-0 text-gray-400" />
      <button className="min-w-0 flex-1 text-left" disabled={busy} onClick={() => void run(async () => setEditing(await learning.exam(exam.id)))}>
        <p className="truncate text-sm font-medium text-gray-900 hover:text-primary-700">{exam.title}</p>
        <p className="text-xs text-gray-500">{exam.question_count ?? 0} questions · {exam.time_limit_seconds / 60} min · {exam.pass_percentage}% to pass · {exam.max_attempts} attempts</p>
      </button>
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${exam.published ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{exam.published ? 'Published' : 'Draft'}</span>
      <button disabled={busy} aria-label={`Edit ${exam.title}`} onClick={() => void run(async () => setEditing(await learning.exam(exam.id)))} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><Pencil size={16} /></button>
      <button disabled={busy} aria-label={`Delete ${exam.title}`} onClick={() => { if (confirm('Delete this assessment? Exams with attempts must be unpublished instead.')) void run(() => learning.deleteExam(exam.id)); }} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
    </li>)}</ol>}
  </div>;
}
