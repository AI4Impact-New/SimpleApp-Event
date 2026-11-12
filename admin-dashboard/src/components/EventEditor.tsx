'use client';
import { useState } from 'react';
import { AlertCircle, Building2, CalendarDays, Globe2, Loader2, Lock, MonitorSmartphone, Video } from 'lucide-react';
import { EditorView } from '@/components/ui/EditorView';
import { Select } from '@/components/ui/Select';
import { Event } from '@/types/event';

export interface EventFormValues {
  name: string; description: string; location: string; event_type: NonNullable<Event['event_type']>;
  start_time: string; end_time: string; max_attendees?: number; visibility: 'global' | 'private'; status?: Event['status'];
}

const field = 'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50';
const TYPES = [
  { value: 'offline', title: 'In person', detail: 'At a venue', icon: Building2 },
  { value: 'online', title: 'Online', detail: 'Video call or stream', icon: Video },
  { value: 'hybrid', title: 'Hybrid', detail: 'Venue + online', icon: MonitorSmartphone },
] as const;
const VISIBILITY = [
  { value: 'global', title: 'Listed', detail: 'Everyone can find and join it in the app', icon: Globe2 },
  { value: 'private', title: 'Private', detail: 'Only people with the QR code can join', icon: Lock },
] as const;

function Choice<T extends string>({ name, value, options, onChange, columns }: {
  name: string; value: T; onChange: (value: T) => void; columns: string;
  options: readonly { value: T; title: string; detail: string; icon: typeof Globe2 }[];
}) {
  return <div className={`grid gap-2 ${columns}`}>{options.map(option => {
    const selected = option.value === value;
    return <label key={option.value} className={`cursor-pointer rounded-xl border p-3 transition ${selected ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
      <input type="radio" name={name} className="sr-only" checked={selected} onChange={() => onChange(option.value)} />
      <option.icon size={18} className={selected ? 'text-primary-600' : 'text-gray-400'} />
      <span className="mt-2 block text-sm font-medium text-gray-900">{option.title}</span>
      <span className="mt-0.5 block text-xs text-gray-500">{option.detail}</span>
    </label>;
  })}</div>;
}

export function EventEditor({ initial, editing, busy, error, onCancel, onSubmit }: {
  initial: EventFormValues; editing: boolean; busy: boolean; error: string;
  onCancel: () => void; onSubmit: (values: EventFormValues) => void;
}) {
  const [values, setValues] = useState(initial);
  const [localError, setLocalError] = useState('');
  const set = (patch: Partial<EventFormValues>) => {
    if ('start_time' in patch || 'end_time' in patch) setLocalError('');
    setValues(current => ({ ...current, ...patch }));
  };
  const message = localError || error;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (values.start_time && values.end_time && values.end_time < values.start_time) { setLocalError('End time must be after the start time.'); return; }
    setLocalError('');
    onSubmit(values);
  };

  return <EditorView label="Event editor" backLabel="All events" busy={busy} onClose={onCancel}
    title={editing ? `Edit ${initial.name || 'event'}` : 'Create an event'}
    subtitle={editing ? undefined : 'Students join from the app, or by scanning the event QR code.'}
    footer={<div className="space-y-3">
      {message && <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"><AlertCircle size={15} />{message}</p>}
      <div className="flex items-center justify-end gap-2">
        <button type="button" className="mr-auto text-sm text-gray-500 hover:text-gray-800" disabled={busy} onClick={onCancel}>Cancel</button>
        <button form="event-editor" className={button} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />}{editing ? 'Save changes' : 'Create event'}</button>
      </div>
    </div>}>
    <form id="event-editor" onSubmit={submit} className="space-y-6">
      <div className="space-y-4 rounded-xl border bg-white p-4">
        <label className="block text-sm font-medium text-gray-900">Event name
          <input data-autofocus required value={values.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Annual Tech Workshop" className={field} />
        </label>
        <label className="block text-sm font-medium text-gray-900">Description <span className="font-normal text-gray-400">(optional)</span>
          <textarea rows={3} value={values.description} onChange={e => set({ description: e.target.value })} placeholder="What should attendees expect?" className={field} />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-900">Format</legend>
        <Choice name="event_type" columns="grid-cols-3" value={values.event_type} onChange={event_type => set({ event_type })} options={TYPES} />
      </fieldset>

      <div className="space-y-4 rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900"><CalendarDays size={16} className="text-primary-600" />When and where</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-gray-500">Starts<input type="datetime-local" value={values.start_time} onChange={e => set({ start_time: e.target.value })} className={field} /></label>
          <label className="text-xs font-medium text-gray-500">Ends<input type="datetime-local" value={values.end_time} onChange={e => set({ end_time: e.target.value })} className={field} /></label>
        </div>
        <p className="text-xs text-gray-500">Times are in India Standard Time (IST).</p>
        <label className="block text-sm font-medium text-gray-900">{values.event_type === 'online' ? 'Meeting link' : values.event_type === 'hybrid' ? 'Venue and meeting link' : 'Venue'}
          <input value={values.location} onChange={e => set({ location: e.target.value })} placeholder={values.event_type === 'online' ? 'https://…' : 'Building, room, city'} className={field} />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-900">Who can join</legend>
        <Choice name="visibility" columns="sm:grid-cols-2" value={values.visibility} onChange={visibility => set({ visibility })} options={VISIBILITY} />
      </fieldset>

      <div className="grid gap-4 rounded-xl border bg-white p-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-900">Capacity
          <span className="mt-1 flex items-center rounded-lg border border-gray-300 bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
            <input type="number" min={1} placeholder="No limit" value={values.max_attendees ?? ''}
              onChange={e => set({ max_attendees: e.target.value === '' ? undefined : Math.max(1, parseInt(e.target.value, 10) || 1) })}
              className="w-full rounded-lg bg-transparent px-3 py-2 text-sm font-normal focus:outline-none" />
            <span className="pr-3 text-sm font-normal text-gray-400">people</span>
          </span>
        </label>
        {editing && <label className="block text-sm font-medium text-gray-900">Status
          <Select className="mt-1 w-full" value={values.status ?? 'draft'} onChange={e => set({ status: e.target.value as Event['status'] })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </label>}
      </div>
    </form>
  </EditorView>;
}
