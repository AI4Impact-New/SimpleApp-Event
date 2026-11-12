'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, CalendarDays, ChevronDown, ChevronRight, File, FileArchive, FileCode, FileImage,
  FileSpreadsheet, FileText, Film, FolderOpen, Info, Loader2, Lock, Pencil, Play, Plus, Presentation,
  Trash2, UploadCloud, Upload, X,
} from 'lucide-react';
import { learning, LearningClass, errorMessage, videoDuration } from '@/services/learning';
import { ClassEditor } from './ClassEditor';
import { CourseDraft, DraftLecture, DraftMaterial, DraftModule, MaterialKind, ZipEntry, formatBytes, readCourseZip } from './courseZip';

const button = 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50';
const ghost = 'inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50';
const iconButton = 'rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30';
const blank: Partial<LearningClass> = { title: '', description: '', class_type: 'online', duration_minutes: 60, sort_order: 0 };

const KIND_ICON: Record<MaterialKind, typeof File> = {
  pdf: FileText, doc: FileText, slides: Presentation, sheet: FileSpreadsheet, code: FileCode,
  image: FileImage, archive: FileArchive, video: Film, other: File,
};

function MaterialChip({ item, onRemove }: { item: DraftMaterial; onRemove?: () => void }) {
  const Icon = KIND_ICON[item.kind];
  return <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 py-1 pl-2 pr-1 text-xs text-gray-700">
    <Icon size={13} className="shrink-0 text-gray-500" />
    <span className="truncate">{item.name}</span>
    <span className="shrink-0 text-gray-400">{formatBytes(item.size)}</span>
    {onRemove && <button aria-label={`Remove ${item.name}`} onClick={onRemove} className="rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"><X size={12} /></button>}
  </span>;
}

function InlineTitle({ value, onChange, label, className }: { value: string; onChange: (value: string) => void; label: string; className: string }) {
  return <input aria-label={label} value={value} onChange={event => onChange(event.target.value)}
    className={`min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 hover:border-gray-200 focus:border-primary-400 focus:bg-white focus:outline-none ${className}`} />;
}

function ZipGuide() {
  const [open, setOpen] = useState(false);
  return <div className="text-left">
    <button type="button" onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline">
      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}How should I organise the ZIP?
    </button>
    {open && <div className="mt-3 grid gap-4 rounded-lg bg-gray-50 p-4 text-xs text-gray-600 sm:grid-cols-2">
      <pre className="overflow-x-auto font-mono leading-5 text-gray-700">{`Azure Data Engineering.zip
├─ 01 Foundations/
│  ├─ 01 Introduction.mp4
│  ├─ 01 Introduction notes.pdf
│  ├─ 02 SQL Basics/
│  │  ├─ lecture.mp4
│  │  ├─ slides.pptx
│  │  └─ queries.sql
│  └─ syllabus.pdf
└─ 02 Pipelines/ …`}</pre>
      <ul className="space-y-2 leading-5">
        <li><b>Each top-level folder</b> becomes a module.</li>
        <li><b>Each video</b> becomes a lecture. Number prefixes (01, 02…) set the order and are removed from the title.</li>
        <li><b>Files with the same number</b> as a video, or inside a lecture’s own folder, are attached to that lecture.</li>
        <li><b>Other files in a module</b> become module resources (syllabus, datasets).</li>
        <li>You can rename, reorder, or remove anything before publishing.</li>
      </ul>
    </div>}
  </div>;
}

function DropZone({ onFile, compact, busy }: { onFile: (file: File) => void; compact: boolean; busy: boolean }) {
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  return <div
    onDragOver={event => { event.preventDefault(); setOver(true); }}
    onDragLeave={() => setOver(false)}
    onDrop={event => { event.preventDefault(); setOver(false); const file = event.dataTransfer.files?.[0]; if (file) onFile(file); }}
    className={`rounded-xl border-2 border-dashed text-center transition ${over ? 'border-primary-500 bg-primary-50' : 'border-gray-300 bg-white'} ${compact ? 'p-5' : 'p-10'}`}>
    <div className={compact ? 'flex flex-wrap items-center justify-center gap-3' : ''}>
      {busy ? <Loader2 className={`animate-spin text-primary-600 ${compact ? '' : 'mx-auto mb-3'}`} size={compact ? 22 : 34} />
        : <UploadCloud className={`text-primary-600 ${compact ? '' : 'mx-auto mb-3'}`} size={compact ? 22 : 34} />}
      <div className={compact ? 'text-left' : ''}>
        <p className="font-medium text-gray-900">{busy ? 'Reading ZIP…' : over ? 'Drop to import' : compact ? 'Add more content: drop a course ZIP' : 'Drop your course ZIP here'}</p>
        {!compact && <p className="mt-1 text-sm text-gray-500">Folders become modules, videos become lectures, and notes, slides and code are attached to them automatically.</p>}
      </div>
      <button type="button" disabled={busy} onClick={() => picker.current?.click()} className={compact ? ghost : `${button} mt-4`}>Choose ZIP file</button>
      <input ref={picker} aria-label="Course ZIP file" type="file" accept=".zip,application/zip" className="sr-only"
        onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) onFile(file); }} />
    </div>
    {!compact && <div className="mx-auto mt-6 max-w-2xl"><ZipGuide /></div>}
  </div>;
}

export function ContentPanel({ courseId, classes, refresh }: { courseId: string; classes: LearningClass[]; refresh: () => Promise<void> }) {
  const [editing, setEditing] = useState<Partial<LearningClass> | null>(null);
  const [busy, setBusy] = useState(''); const [progress, setProgress] = useState(0);
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<{ title: string; url: string; local?: boolean } | null>(null);
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [showIgnored, setShowIgnored] = useState(false);
  const zip = useRef<{ close: () => Promise<unknown>; extract: (entry: ZipEntry) => Promise<Blob> } | null>(null);

  useEffect(() => () => { void zip.current?.close(); }, []);
  useEffect(() => () => { if (preview?.local) URL.revokeObjectURL(preview.url); }, [preview]);

  const run = async (id: string, action: () => Promise<unknown>, success: string) => {
    setBusy(id); setError(''); setNotice('');
    try { await action(); await refresh(); setNotice(success); } catch (error) { setError(errorMessage(error)); } finally { setBusy(''); }
  };
  const upload = async (lecture: LearningClass, file?: File) => {
    if (!file) return;
    if (lecture.video_status === 'ready' && !confirm('Replace this recording? Learner watch progress for this class will be reset.')) return;
    setProgress(0);
    await run(lecture.id, async () => { const duration = await videoDuration(file); await learning.uploadVideo(lecture.id, file, duration, setProgress); }, 'Recording uploaded and ready for enrolled learners.');
  };

  const openZip = async (file: File) => {
    if (!/\.zip$/i.test(file.name)) { setError('Please drop a .zip file.'); return; }
    setBusy('zip'); setError(''); setNotice('');
    try {
      await zip.current?.close();
      const result = await readCourseZip(file);
      zip.current = result;
      if (!result.draft.modules.length) throw new Error('No lectures or materials were found in this ZIP.');
      setDraft(result.draft); setCollapsed(new Set());
    } catch (error) { setError(errorMessage(error)); } finally { setBusy(''); }
  };
  const discard = () => { void zip.current?.close(); zip.current = null; setDraft(null); };
  const previewLocal = async (lecture: DraftLecture) => {
    if (!lecture.video || !zip.current) return;
    setBusy(lecture.id); setError('');
    try {
      const blob = await zip.current.extract(lecture.video.entry);
      setPreview({ title: lecture.title, url: URL.createObjectURL(blob), local: true });
    } catch (error) { setError(errorMessage(error)); } finally { setBusy(''); }
  };

  // Draft editing helpers
  const updateModule = (moduleId: string, change: (module: DraftModule) => DraftModule) =>
    setDraft(current => current && { ...current, modules: current.modules.map(m => m.id === moduleId ? change(m) : m) });
  const updateLecture = (moduleId: string, lectureId: string, change: (lecture: DraftLecture) => DraftLecture) =>
    updateModule(moduleId, m => ({ ...m, lectures: m.lectures.map(l => l.id === lectureId ? change(l) : l) }));
  const moveLecture = (moduleId: string, index: number, delta: number) => updateModule(moduleId, m => {
    const lectures = [...m.lectures];
    [lectures[index], lectures[index + delta]] = [lectures[index + delta], lectures[index]];
    return { ...m, lectures };
  });
  const toggle = (id: string) => setCollapsed(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const stats = draft ? draft.modules.reduce((total, m) => {
    const files = [...m.materials, ...m.lectures.flatMap(l => [...l.materials, ...(l.video ? [l.video] : [])])];
    return {
      lectures: total.lectures + m.lectures.length,
      materials: total.materials + m.materials.length + m.lectures.reduce((n, l) => n + l.materials.length, 0),
      missing: total.missing + m.lectures.filter(l => !l.video).length,
      bytes: total.bytes + files.reduce((n, f) => n + f.size, 0),
    };
  }, { lectures: 0, materials: 0, missing: 0, bytes: 0 }) : null;

  if (editing) return <ClassEditor courseId={courseId} initial={editing} onClose={() => setEditing(null)} onSaved={async message => { setEditing(null); setNotice(message); await refresh(); }} />;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Course content</h2>
        <p className="mt-1 text-sm text-gray-500">Upload your whole course as one ZIP. Everything learners will see appears below, in order.</p>
      </div>
      <button className={ghost} onClick={() => setEditing({ ...blank, sort_order: classes.length })}><CalendarDays size={16} />Schedule live session</button>
    </div>

    {error && <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}


    {!draft && <DropZone onFile={file => void openZip(file)} compact={classes.length > 0} busy={busy === 'zip'} />}

    {draft && stats && <section aria-label="ZIP import preview" className="overflow-hidden rounded-xl border border-primary-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-primary-50/60 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Review before publishing</p>
          <h3 className="mt-0.5 truncate font-semibold text-gray-900">{draft.fileName}</h3>
          <p className="mt-1 text-sm text-gray-600">{draft.modules.length} modules · {stats.lectures} lectures · {stats.materials} materials · {formatBytes(stats.bytes)}</p>
        </div>
        <div className="flex gap-2">
          <button className={ghost} onClick={discard}>Discard</button>
          <button className={button} disabled title="Upload service not connected yet">Publish content</button>
        </div>
      </header>
      {(stats.missing > 0 || draft.ignored.length > 0) && <div className="space-y-1 border-b bg-amber-50 px-5 py-3 text-sm text-amber-800">
        {stats.missing > 0 && <p>{stats.missing} lecture{stats.missing > 1 ? 's have' : ' has'} no video. Learners will only see the materials.</p>}
        {draft.ignored.length > 0 && <p>{draft.ignored.length} system file{draft.ignored.length > 1 ? 's were' : ' was'} skipped (.DS_Store, __MACOSX). <button className="underline" onClick={() => setShowIgnored(!showIgnored)}>{showIgnored ? 'Hide' : 'Show'}</button></p>}
        {showIgnored && <ul className="max-h-32 overflow-auto font-mono text-xs">{draft.ignored.map(name => <li key={name}>{name}</li>)}</ul>}
      </div>}
      <ol className="divide-y">
        {draft.modules.map((module, moduleIndex) => {
          const isOpen = !collapsed.has(module.id);
          return <li key={module.id}>
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-3">
              <button aria-label={isOpen ? `Collapse ${module.title}` : `Expand ${module.title}`} onClick={() => toggle(module.id)} className={iconButton}>{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</button>
              <FolderOpen size={18} className="shrink-0 text-primary-600" />
              <span className="shrink-0 text-xs font-semibold text-gray-400">Module {moduleIndex + 1}</span>
              <InlineTitle label={`Module ${moduleIndex + 1} title`} value={module.title} onChange={title => updateModule(module.id, m => ({ ...m, title }))} className="font-semibold text-gray-900" />
              <span className="hidden shrink-0 text-xs text-gray-500 sm:inline">{module.lectures.length} lectures</span>
              <button aria-label={`Remove module ${module.title}`} className={iconButton} onClick={() => setDraft(current => current && { ...current, modules: current.modules.filter(m => m.id !== module.id) })}><Trash2 size={15} /></button>
            </div>
            {isOpen && <div className="pb-2">
              {module.materials.length > 0 && <div className="flex flex-wrap items-center gap-2 px-5 pb-1 pt-3 sm:pl-14">
                <span className="text-xs font-medium text-gray-500">Module resources</span>
                {module.materials.map(item => <MaterialChip key={item.id} item={item} onRemove={() => updateModule(module.id, m => ({ ...m, materials: m.materials.filter(x => x.id !== item.id) }))} />)}
              </div>}
              <ol>
                {module.lectures.map((lecture, index) => <li key={lecture.id} className="group flex gap-3 px-4 py-3 hover:bg-gray-50/70 sm:pl-12">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <InlineTitle label={`Lecture ${index + 1} title`} value={lecture.title} onChange={title => updateLecture(module.id, lecture.id, l => ({ ...l, title }))} className="text-sm font-medium text-gray-900" />
                      <div className="flex shrink-0 items-center opacity-60 group-hover:opacity-100">
                        <button aria-label={`Move ${lecture.title} up`} disabled={index === 0} onClick={() => moveLecture(module.id, index, -1)} className={iconButton}><ArrowUp size={15} /></button>
                        <button aria-label={`Move ${lecture.title} down`} disabled={index === module.lectures.length - 1} onClick={() => moveLecture(module.id, index, 1)} className={iconButton}><ArrowDown size={15} /></button>
                        <button aria-label={`Remove ${lecture.title}`} onClick={() => updateModule(module.id, m => ({ ...m, lectures: m.lectures.filter(l => l.id !== lecture.id) }))} className={iconButton}><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-1.5">
                      {lecture.video ? <button onClick={() => void previewLocal(lecture)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100">
                        {busy === lecture.id ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}{lecture.video.name}<span className="font-normal text-primary-500">{formatBytes(lecture.video.size)}</span>
                      </button> : <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">No video</span>}
                      {lecture.materials.map(item => <MaterialChip key={item.id} item={item} onRemove={() => updateLecture(module.id, lecture.id, l => ({ ...l, materials: l.materials.filter(x => x.id !== item.id) }))} />)}
                    </div>
                  </div>
                </li>)}
              </ol>
            </div>}
          </li>;
        })}
      </ol>
      <footer className="flex items-start gap-2 border-t bg-gray-50 px-5 py-3 text-xs text-gray-500">
        <Info size={14} className="mt-0.5 shrink-0" />Preview only. Publishing will be enabled once the bulk-upload service is connected. Nothing has been uploaded yet.
      </footer>
    </section>}

    {classes.length > 0 && <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900">Published</h3>
        <p className="inline-flex items-center gap-1.5 text-xs text-gray-500"><Lock size={13} />Lectures unlock in order, each open for 7 days. Reopen expired videos from the <b className="font-medium text-gray-700">Learners</b> tab.</p>
      </div>
      <ol className="divide-y overflow-hidden rounded-xl border bg-white">
        {classes.map((lecture, index) => <li key={lecture.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-600">{index + 1}</span>
          {lecture.class_type === 'recorded' ? <Film size={16} className="shrink-0 text-gray-400" /> : <CalendarDays size={16} className="shrink-0 text-gray-400" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{lecture.title}</p>
            <p className="text-xs text-gray-500">{lecture.class_type === 'recorded' ? `Recorded · ${lecture.duration_minutes} min` : `${lecture.class_type === 'online' ? 'Live online' : 'In person'}${lecture.start_time ? ' · ' + new Date(lecture.start_time).toLocaleString() : ''} · ${(lecture.class_type === 'online' ? lecture.zoom_link : lecture.location) || 'details not added'}`}</p>
          </div>
          {lecture.class_type === 'recorded' && <>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${lecture.video_status === 'ready' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{lecture.video_status === 'ready' ? 'Ready' : lecture.video_status === 'uploading' ? 'Upload incomplete' : 'Video needed'}</span>
            {lecture.video_status === 'ready' && <button aria-label={`Preview ${lecture.title}`} className={iconButton} onClick={() => void run('preview', async () => { const result = await learning.playback(lecture.id); setPreview({ title: lecture.title, url: result.url }); }, '')}><Play size={16} /></button>}
            <label aria-label={lecture.video_status === 'ready' ? `Replace video for ${lecture.title}` : `Upload video for ${lecture.title}`} title={lecture.video_status === 'ready' ? 'Replace MP4' : 'Upload MP4'} className={`${iconButton} cursor-pointer ${busy ? 'pointer-events-none' : ''}`}>
              {busy === lecture.id ? <span className="text-xs text-primary-700">{progress}%</span> : <Upload size={16} />}
              <input aria-label={`Upload recording for ${lecture.title}`} className="sr-only" type="file" accept="video/mp4,.mp4" disabled={!!busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void upload(lecture, file); }} />
            </label>
          </>}
          <button aria-label={`Edit ${lecture.title}`} className={iconButton} onClick={() => setEditing(lecture)}><Pencil size={16} /></button>
          <button aria-label={`Delete ${lecture.title}`} disabled={!!busy} className={`${iconButton} hover:bg-red-50 hover:text-red-600`} onClick={() => { if (confirm('Delete this class and its learner progress?')) void run(lecture.id, () => learning.deleteClass(courseId, lecture.id), 'Class deleted.'); }}><Trash2 size={16} /></button>
        </li>)}
      </ol>
      <button className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary-700" onClick={() => setEditing({ ...blank, class_type: 'recorded', duration_minutes: 30, sort_order: classes.length })}><Plus size={14} />Add a single lecture manually</button>
    </section>}

    {preview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Recording preview"><div className="w-full max-w-3xl rounded-xl bg-white p-4"><div className="mb-3 flex justify-between gap-3"><h3 className="font-semibold">{preview.title}</h3><button className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100" onClick={() => setPreview(null)}>Close preview</button></div><video src={preview.url} controls playsInline className="max-h-[70vh] w-full rounded-lg bg-black" /></div></div>}
  </div>;
}
