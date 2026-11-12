'use client';

import { useState } from 'react';
import { AlertCircle, Check, Loader2, Plus, X } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { EditorView } from '@/components/ui/EditorView';
import { useCreatePoll } from '@/hooks/usePolls';
import { useMaterials } from '@/hooks/useMaterials';
import { CreatePollInput } from '@/types/poll';

interface PollFormProps {
  eventId: string;
  eventName?: string;
  onCancel: () => void;
  onSuccess?: () => void;
}

const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';
const button = 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50';
const letter = (index: number) => String.fromCharCode(65 + index);

/** Create-poll form shown on the Polls page in place of the poll list. */
export function PollForm({ eventId, eventName, onCancel, onSuccess }: PollFormProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correct, setCorrect] = useState<number | null>(null);
  const [materialId, setMaterialId] = useState('');
  const [error, setError] = useState('');
  const createPoll = useCreatePoll();
  const { data: materialsData } = useMaterials(eventId);
  const materials: { id: string; title: string }[] = materialsData?.materials ?? [];
  const filled = options.filter(option => option.trim()).length;

  const addOption = () => {
    if (options.length >= 10) return;
    setOptions([...options, '']);
    setTimeout(() => document.getElementById(`poll-option-${options.length}`)?.focus());
  };
  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== index));
    if (correct === index) setCorrect(null);
    else if (correct !== null && correct > index) setCorrect(correct - 1);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) { setError('Add a question.'); return; }
    if (filled < 2) { setError('Add at least two options.'); return; }
    setError('');
    // Blank options are dropped, so map the correct answer onto its position among the kept ones.
    const kept = options.map((label, index) => ({ label: label.trim(), index })).filter(option => option.label);
    const payload: CreatePollInput = { event_id: eventId, question: question.trim(), options: kept.map(option => option.label) };
    if (materialId) payload.material_id = materialId;
    const correctPosition = kept.findIndex(option => option.index === correct);
    if (correctPosition >= 0) payload.correct_option_index = correctPosition;
    try {
      await createPoll.mutateAsync(payload);
      onSuccess?.();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create poll');
    }
  };

  return <EditorView label="Poll editor" backLabel="All polls" busy={createPoll.isPending} onClose={onCancel}
    title="Create a poll" subtitle={eventName ? <>For <span className="font-medium text-gray-700">{eventName}</span>. Attendees answer live from the app.</> : undefined}
    footer={<div className="space-y-3">
      {error && <p role="alert" className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"><AlertCircle size={15} />{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button type="button" className="mr-auto text-sm text-gray-500 hover:text-gray-800" disabled={createPoll.isPending} onClick={onCancel}>Cancel</button>
        <button form="poll-editor" className={button} disabled={createPoll.isPending}>{createPoll.isPending && <Loader2 size={16} className="animate-spin" />}Create poll</button>
      </div>
    </div>}>
    <form id="poll-editor" onSubmit={submit} className="space-y-6">
      <div className="rounded-xl border bg-white p-4">
        <label className="block text-sm font-medium text-gray-900">Question
          <textarea data-autofocus rows={2} value={question} onChange={e => setQuestion(e.target.value)} placeholder="e.g. Which topic should we cover next?" className={`${field} mt-1 text-[15px]`} />
        </label>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm font-medium text-gray-900">Options</p>
        <p className="mb-3 mt-1 text-xs text-gray-500">Press Enter to add another option. For a quiz question, click a letter to mark the correct answer (click again to clear it).</p>
        <ol className="space-y-2">
          {options.map((option, index) => {
            const isCorrect = correct === index;
            return <li key={index} className="flex items-center gap-2">
              <button type="button" aria-label={`Mark option ${letter(index)} correct`} aria-pressed={isCorrect} onClick={() => setCorrect(isCorrect ? null : index)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition ${isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 bg-white text-gray-500 hover:border-emerald-400 hover:text-emerald-600'}`}>
                {isCorrect ? <Check size={15} /> : letter(index)}
              </button>
              <input id={`poll-option-${index}`} aria-label={`Option ${letter(index)}`} value={option} placeholder={`Option ${letter(index)}`}
                onChange={e => setOptions(options.map((value, i) => i === index ? e.target.value : value))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (index === options.length - 1) addOption(); else document.getElementById(`poll-option-${index + 1}`)?.focus(); } }}
                className={`${field} ${isCorrect ? 'border-emerald-300 bg-emerald-50/40' : ''}`} />
              <button type="button" aria-label={`Remove option ${letter(index)}`} disabled={options.length <= 2} onClick={() => removeOption(index)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:invisible"><X size={15} /></button>
            </li>;
          })}
        </ol>
        <button type="button" disabled={options.length >= 10} onClick={addOption} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700 disabled:opacity-40"><Plus size={15} />Add option</button>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <label className="block text-sm font-medium text-gray-900">Related material <span className="font-normal text-gray-400">(optional)</span>
          <Select className="mt-1 w-full" value={materialId} onChange={e => setMaterialId(e.target.value)}>
            <option value="">None</option>
            {materials.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
          </Select>
        </label>
        <p className="mt-2 text-xs text-gray-500">{materials.length ? 'Shown alongside the poll so attendees know which material it covers.' : 'This event has no materials yet.'}</p>
      </div>
    </form>
  </EditorView>;
}
