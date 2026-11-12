'use client';
import { useState } from 'react';
import { AlertCircle, CalendarDays, Film, MapPin, Video } from 'lucide-react';
import { learning, LearningClass, errorMessage } from '@/services/learning';
import { EditorView } from '@/components/ui/EditorView';
import { Select } from '@/components/ui/Select';

const field = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50';

const TYPES: { value: LearningClass['class_type']; title: string; detail: string; icon: typeof Film }[] = [
  { value: 'online', title: 'Live online', detail: 'Zoom or Meet link', icon: Video },
  { value: 'in_person', title: 'In person', detail: 'Classroom session', icon: MapPin },
  { value: 'recorded', title: 'Recorded', detail: 'Upload an MP4 after saving', icon: Film },
];
const DURATIONS = [30, 45, 60, 90, 120, 180];
const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const localTime = (iso?: string) => { if (!iso) return ''; const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export function ClassEditor({ courseId, initial, onClose, onSaved }: { courseId: string; initial: Partial<LearningClass>; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [value, setValue] = useState(initial);
  const [date, setDate] = useState(localDate(initial.start_time));
  const [time, setTime] = useState(localTime(initial.start_time) || '10:00');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const live = value.class_type !== 'recorded';
  const duration = value.duration_minutes ?? 60;
  const end = date && time ? new Date(new Date(`${date}T${time}`).getTime() + duration * 60000) : null;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const start = live && date && time ? new Date(`${date}T${time}`) : null;
      const payload: Partial<LearningClass> = {
        ...value,
        start_time: start ? start.toISOString() : undefined,
        end_time: start ? new Date(start.getTime() + duration * 60000).toISOString() : undefined,
      };
      await learning.saveClass(courseId, payload, value.id);
      await onSaved(value.id ? 'Changes saved.' : live ? 'Session scheduled.' : 'Lecture added. Upload its recording from the list.');
    } catch (error) { setError(errorMessage(error)); setBusy(false); }
  };

  return <EditorView label="Class editor" backLabel="Course content" busy={busy} onClose={onClose} title={value.id ? `Edit ${value.title || 'class'}` : live ? 'Schedule a session' : 'Add a lecture'}
    footer={<div className="space-y-3">
      {error && <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"><AlertCircle size={15} />{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button type="button" className="mr-auto text-sm text-gray-500 hover:text-gray-800" disabled={busy} onClick={onClose}>Cancel</button>
        <button form="class-editor" className={button} disabled={busy}>{busy ? 'Saving…' : value.id ? 'Save changes' : live ? 'Schedule session' : 'Add lecture'}</button>
      </div>
    </div>}>
    <form id="class-editor" onSubmit={save} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-medium text-gray-900">What kind of class?</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {TYPES.map(type => {
            const selected = value.class_type === type.value;
            return <label key={type.value} className={`cursor-pointer rounded-xl border p-3 transition ${selected ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              <input type="radio" name="class_type" className="sr-only" checked={selected} onChange={() => setValue({ ...value, class_type: type.value })} />
              <type.icon size={18} className={selected ? 'text-primary-600' : 'text-gray-400'} />
              <span className="mt-2 block text-sm font-medium text-gray-900">{type.title}</span>
              <span className="mt-0.5 block text-xs text-gray-500">{type.detail}</span>
            </label>;
          })}
        </div>
      </fieldset>

      <div className="space-y-4 rounded-xl border bg-white p-4">
        <label className="block text-sm font-medium text-gray-900">Title
          <input data-autofocus required placeholder={live ? 'e.g. Week 3 live Q&A' : 'e.g. Introduction to pipelines'} value={value.title || ''} onChange={event => setValue({ ...value, title: event.target.value })} className={field} />
        </label>
        <label className="block text-sm font-medium text-gray-900">Description <span className="font-normal text-gray-400">(optional)</span>
          <textarea rows={3} placeholder="What will learners cover?" value={value.description || ''} onChange={event => setValue({ ...value, description: event.target.value })} className={field} />
        </label>
      </div>

      {live ? <div className="space-y-4 rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900"><CalendarDays size={16} className="text-primary-600" />When</div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-gray-500">Date<input type="date" required value={date} onChange={event => setDate(event.target.value)} className={field} /></label>
          <label className="text-xs font-medium text-gray-500">Start time<input type="time" required value={time} onChange={event => setTime(event.target.value)} className={field} /></label>
          <label className="text-xs font-medium text-gray-500">Duration
            <Select className="mt-1 w-full" value={String(duration)} onChange={event => setValue({ ...value, duration_minutes: Number(event.target.value) })}>
              {[...new Set([...DURATIONS, duration])].sort((a, b) => a - b).map(minutes => <option key={minutes} value={minutes}>{minutes < 60 ? `${minutes} min` : `${minutes / 60} hr${minutes > 60 ? 's' : ''}`.replace('.5 hr', '½ hr')}</option>)}
            </Select>
          </label>
        </div>
        <p className="text-xs text-gray-500">{end ? `Ends at ${end.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ` : ''}Times are in your time zone ({zone}).</p>
        <label className="block text-sm font-medium text-gray-900">{value.class_type === 'online' ? 'Meeting link' : 'Location'}
          <input type={value.class_type === 'online' ? 'url' : 'text'} value={(value.class_type === 'online' ? value.zoom_link : value.location) || ''}
            onChange={event => setValue({ ...value, [value.class_type === 'online' ? 'zoom_link' : 'location']: event.target.value })}
            placeholder={value.class_type === 'online' ? 'https://zoom.us/j/…' : 'Building and room'} className={field} />
        </label>
      </div> : <div className="rounded-xl border bg-white p-4">
        <label className="block text-sm font-medium text-gray-900">Length
          <span className="mt-1 flex max-w-[12rem] items-center rounded-lg border border-gray-300 bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
            <input type="number" required min={1} max={720} value={duration} onChange={event => setValue({ ...value, duration_minutes: Number(event.target.value) })} className="w-full rounded-lg bg-transparent px-3 py-2 text-sm font-normal focus:outline-none" />
            <span className="pr-3 text-sm font-normal text-gray-400">min</span>
          </span>
        </label>
        <p className="mt-3 text-xs text-gray-500">Upload the MP4 from the content list after saving. For a whole course, dropping a ZIP on the Content tab is faster.</p>
      </div>}
    </form>
  </EditorView>;
}
