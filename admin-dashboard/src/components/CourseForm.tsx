'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/Select';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type {
  Course,
  CourseHighlight,
  CoursePhase,
  CoursePhaseItem,
  CourseBenefit,
  CourseAudience,
  CourseCareerOutcome,
  CourseCertificate,
  CourseClass,
  ClassType,
} from '@/types/course';

const emptyHighlight: CourseHighlight = { label: '', value: '' };
const emptyClass: CourseClass = { title: '', class_type: 'recorded', sort_order: 0 };
const emptyPhase: CoursePhase = { title: '', subtitle: '', phase_items: [] };
const emptyPhaseItem: CoursePhaseItem = { item_type: 'what_you_learn', text: '' };
const emptyBenefit: CourseBenefit = { title: '', description: '' };
const emptyAudience: CourseAudience = { title: '', description: '' };
const emptyCareerOutcome: CourseCareerOutcome = { text: '' };

type FormData = Partial<Course> & {
  highlights?: CourseHighlight[];
  phases?: CoursePhase[];
  benefits?: CourseBenefit[];
  audience?: CourseAudience[];
  career_outcomes?: CourseCareerOutcome[];
  certificate?: CourseCertificate | null;
  delivery_modes?: ClassType[];
  classes?: CourseClass[];
};

interface CourseFormProps {
  initial?: FormData | null;
  onSubmit: (data: FormData) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function CourseForm({
  initial,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Save',
}: CourseFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [shortDescription, setShortDescription] = useState(initial?.short_description ?? '');
  const [fullDescription, setFullDescription] = useState(initial?.full_description ?? '');
  const [status, setStatus] = useState<'draft' | 'published'>((initial?.status as 'draft' | 'published') ?? 'draft');
  const [displayOrder, setDisplayOrder] = useState(initial?.display_order ?? 0);
  const [highlights, setHighlights] = useState<CourseHighlight[]>(initial?.highlights?.length ? [...initial.highlights] : []);
  const [phases, setPhases] = useState<CoursePhase[]>(
    initial?.phases?.length
      ? initial.phases.map((p) => ({ ...p, phase_items: p.phase_items ?? [] }))
      : []
  );
  const [benefits, setBenefits] = useState<CourseBenefit[]>(initial?.benefits?.length ? [...initial.benefits] : []);
  const [audience, setAudience] = useState<CourseAudience[]>(initial?.audience?.length ? [...initial.audience] : []);
  const [careerOutcomes, setCareerOutcomes] = useState<CourseCareerOutcome[]>(
    initial?.career_outcomes?.length ? [...initial.career_outcomes] : []
  );
  const [certificate, setCertificate] = useState<CourseCertificate | null>(
    initial?.certificate && (initial.certificate.title || initial.certificate.provider || initial.certificate.description)
      ? { ...initial.certificate }
      : { title: '', provider: '', description: '', image_url: '' }
  );
  const [deliveryModes, setDeliveryModes] = useState<ClassType[]>(
    (initial?.delivery_modes as ClassType[] | undefined) ?? (initial as any)?.deliveryModes ?? []
  );
  const [classes, setClasses] = useState<CourseClass[]>(initial?.classes?.length ? [...initial.classes] : []);
  const [error, setError] = useState('');

  const addHighlight = () => setHighlights((h) => [...h, { ...emptyHighlight }]);
  const removeHighlight = (i: number) => setHighlights((h) => h.filter((_, idx) => idx !== i));
  const updateHighlight = (i: number, field: 'label' | 'value', value: string) => {
    setHighlights((h) => h.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  };

  const addPhase = () => setPhases((p) => [...p, { ...emptyPhase, phase_items: [] }]);
  const removePhase = (i: number) => setPhases((p) => p.filter((_, idx) => idx !== i));
  const updatePhase = (i: number, field: 'title' | 'subtitle', value: string) => {
    setPhases((p) => p.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  };
  const addPhaseItem = (phaseIdx: number) => {
    setPhases((p) =>
      p.map((ph, idx) =>
        idx === phaseIdx ? { ...ph, phase_items: [...(ph.phase_items ?? []), { ...emptyPhaseItem }] } : ph
      )
    );
  };
  const removePhaseItem = (phaseIdx: number, itemIdx: number) => {
    setPhases((p) =>
      p.map((ph, idx) =>
        idx === phaseIdx
          ? { ...ph, phase_items: (ph.phase_items ?? []).filter((_, j) => j !== itemIdx) }
          : ph
      )
    );
  };
  const updatePhaseItem = (phaseIdx: number, itemIdx: number, field: 'item_type' | 'text', value: string) => {
    setPhases((p) =>
      p.map((ph, idx) => {
        if (idx !== phaseIdx) return ph;
        const items = [...(ph.phase_items ?? [])];
        items[itemIdx] = { ...items[itemIdx], [field]: value };
        return { ...ph, phase_items: items };
      })
    );
  };

  const addBenefit = () => setBenefits((b) => [...b, { ...emptyBenefit }]);
  const removeBenefit = (i: number) => setBenefits((b) => b.filter((_, idx) => idx !== i));
  const updateBenefit = (i: number, field: 'title' | 'description', value: string) => {
    setBenefits((b) => b.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  };

  const addAudience = () => setAudience((a) => [...a, { ...emptyAudience }]);
  const removeAudience = (i: number) => setAudience((a) => a.filter((_, idx) => idx !== i));
  const updateAudience = (i: number, field: 'title' | 'description', value: string) => {
    setAudience((a) => a.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  };

  const addCareerOutcome = () => setCareerOutcomes((c) => [...c, { ...emptyCareerOutcome }]);
  const removeCareerOutcome = (i: number) => setCareerOutcomes((c) => c.filter((_, idx) => idx !== i));
  const updateCareerOutcome = (i: number, value: string) => {
    setCareerOutcomes((c) => c.map((x, idx) => (idx === i ? { ...x, text: value } : x)));
  };

  const toggleDeliveryMode = (mode: ClassType) => {
    setDeliveryModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  };
  const addClass = () => setClasses((c) => [...c, { ...emptyClass, sort_order: c.length }]);
  const removeClass = (i: number) => setClasses((c) => c.filter((_, idx) => idx !== i));
  const updateClass = (i: number, field: keyof CourseClass, value: string | number | undefined) => {
    setClasses((c) => c.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    const certPayload =
      certificate && (certificate.title || certificate.provider || certificate.description || certificate.image_url)
        ? certificate
        : null;
    try {
      await onSubmit({
        title: title.trim(),
        slug: slug.trim() || undefined,
        short_description: shortDescription.trim() || undefined,
        full_description: fullDescription.trim() || undefined,
        status,
        display_order: displayOrder,
        delivery_modes: deliveryModes.length ? deliveryModes : undefined,
        highlights: highlights.filter((h) => h.label.trim() || h.value.trim()),
        phases: phases.map((p) => ({
          ...p,
          phase_items: (p.phase_items ?? []).filter((i) => i.text.trim()),
        })),
        benefits: benefits.filter((b) => b.title.trim()),
        audience: audience.filter((a) => a.title.trim()),
        career_outcomes: careerOutcomes.filter((c) => c.text.trim()),
        certificate: certPayload,
        classes: classes.map((cl, i) => ({ ...cl, sort_order: i })),
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save.');
    }
  };

  const inputCls =
    'w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500';
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';
  const sectionCls = 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm';

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className={sectionCls}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic info</h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="Course or program title"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Slug (optional)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={inputCls}
              placeholder="url-slug"
            />
          </div>
          <div>
            <label className={labelCls}>Short description</label>
            <textarea
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className={inputCls + ' resize-none'}
              rows={2}
              placeholder="Tagline or brief summary"
            />
          </div>
          <div>
            <label className={labelCls}>Full description</label>
            <textarea
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
              className={inputCls + ' resize-none'}
              rows={5}
              placeholder="Full program description"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Status</label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                className={inputCls}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </div>
            <div>
              <label className={labelCls}>Display order</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                className={inputCls}
                min={0}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Delivery modes</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {(['recorded', 'online', 'in_person'] as ClassType[]).map((mode) => (
                <label key={mode} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deliveryModes.includes(mode)}
                    onChange={() => toggleDeliveryMode(mode)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm capitalize">{mode.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={sectionCls}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Classes / Sessions</h2>
          <button type="button" onClick={addClass} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <Plus size={16} /> Add class
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Add sessions with type: Recorded, Online (Zoom), or In-person. Each can have duration, schedule, and links.</p>
        <div className="space-y-4">
          {classes.map((cl, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50">
              <div className="flex gap-2 flex-wrap items-center">
                <input
                  type="text"
                  value={cl.title}
                  onChange={(e) => updateClass(i, 'title', e.target.value)}
                  className={inputCls + ' flex-1 min-w-[200px]'}
                  placeholder="Class title"
                />
                <Select
                  value={cl.class_type}
                  onChange={(e) => updateClass(i, 'class_type', e.target.value as ClassType)}
                  className={inputCls + ' w-36'}
                >
                  <option value="recorded">Recorded</option>
                  <option value="online">Online</option>
                  <option value="in_person">In person</option>
                </Select>
                <input
                  type="number"
                  value={cl.duration_minutes ?? ''}
                  onChange={(e) => updateClass(i, 'duration_minutes', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  className={inputCls + ' w-24'}
                  placeholder="Min"
                />
                <button type="button" onClick={() => removeClass(i)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <input type="datetime-local" value={cl.start_time?.slice(0, 16) ?? ''} onChange={(e) => updateClass(i, 'start_time', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={inputCls} placeholder="Start" />
                <input type="datetime-local" value={cl.end_time?.slice(0, 16) ?? ''} onChange={(e) => updateClass(i, 'end_time', e.target.value ? new Date(e.target.value).toISOString() : undefined)} className={inputCls} placeholder="End" />
                {cl.class_type === 'online' && <input type="url" value={cl.zoom_link ?? ''} onChange={(e) => updateClass(i, 'zoom_link', e.target.value || undefined)} className={inputCls + ' sm:col-span-2'} placeholder="Zoom link" />}
                {cl.class_type === 'in_person' && <input type="text" value={cl.location ?? ''} onChange={(e) => updateClass(i, 'location', e.target.value || undefined)} className={inputCls + ' sm:col-span-2'} placeholder="Venue / location" />}
                <input type="text" value={cl.description ?? ''} onChange={(e) => updateClass(i, 'description', e.target.value || undefined)} className={inputCls + ' sm:col-span-2'} placeholder="Description (optional)" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionCls}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Highlights</h2>
          <button type="button" onClick={addHighlight} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {highlights.map((h, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={h.label}
                onChange={(e) => updateHighlight(i, 'label', e.target.value)}
                className={inputCls + ' flex-1'}
                placeholder="Label (e.g. Duration)"
              />
              <input
                type="text"
                value={h.value}
                onChange={(e) => updateHighlight(i, 'value', e.target.value)}
                className={inputCls + ' flex-1'}
                placeholder="Value (e.g. 12 weeks)"
              />
              <button type="button" onClick={() => removeHighlight(i)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionCls}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Phases / Modules</h2>
          <button type="button" onClick={addPhase} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <Plus size={16} /> Add phase
          </button>
        </div>
        <div className="space-y-6">
          {phases.map((phase, pi) => (
            <div key={pi} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={phase.title}
                  onChange={(e) => updatePhase(pi, 'title', e.target.value)}
                  className={inputCls}
                  placeholder="Phase title"
                />
                <input
                  type="text"
                  value={phase.subtitle ?? ''}
                  onChange={(e) => updatePhase(pi, 'subtitle', e.target.value)}
                  className={inputCls}
                  placeholder="Subtitle"
                />
                <button type="button" onClick={() => removePhase(pi)} className="p-2 text-red-600 hover:bg-red-50 rounded shrink-0">
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="pl-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Items (what you&apos;ll learn / outcomes)</span>
                  <button type="button" onClick={() => addPhaseItem(pi)} className="text-xs text-primary-600 flex items-center gap-1">
                    <Plus size={14} /> Add
                  </button>
                </div>
                {(phase.phase_items ?? []).map((item, ii) => (
                  <div key={ii} className="flex gap-2 mb-2">
                    <Select
                      value={item.item_type}
                      onChange={(e) => updatePhaseItem(pi, ii, 'item_type', e.target.value)}
                      className={inputCls + ' w-40'}
                    >
                      <option value="what_you_learn">What you&apos;ll learn</option>
                      <option value="outcome">Outcome</option>
                    </Select>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => updatePhaseItem(pi, ii, 'text', e.target.value)}
                      className={inputCls + ' flex-1'}
                      placeholder="Bullet text"
                    />
                    <button type="button" onClick={() => removePhaseItem(pi, ii)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionCls}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Benefits</h2>
          <button type="button" onClick={addBenefit} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        </div>
        <div className="space-y-3">
          {benefits.map((b, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                type="text"
                value={b.title}
                onChange={(e) => updateBenefit(i, 'title', e.target.value)}
                className={inputCls + ' flex-1'}
                placeholder="Title"
              />
              <input
                type="text"
                value={b.description ?? ''}
                onChange={(e) => updateBenefit(i, 'description', e.target.value)}
                className={inputCls + ' flex-1'}
                placeholder="Description"
              />
              <button type="button" onClick={() => removeBenefit(i)} className="p-2 text-red-600 hover:bg-red-50 rounded mt-1">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionCls}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Audience (who should attend)</h2>
          <button type="button" onClick={addAudience} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        </div>
        <div className="space-y-3">
          {audience.map((a, i) => (
            <div key={i} className="flex gap-2 items-start">
              <input
                type="text"
                value={a.title}
                onChange={(e) => updateAudience(i, 'title', e.target.value)}
                className={inputCls + ' flex-1'}
                placeholder="Title"
              />
              <input
                type="text"
                value={a.description ?? ''}
                onChange={(e) => updateAudience(i, 'description', e.target.value)}
                className={inputCls + ' flex-1'}
                placeholder="Description"
              />
              <button type="button" onClick={() => removeAudience(i)} className="p-2 text-red-600 hover:bg-red-50 rounded mt-1">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionCls}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Career outcomes</h2>
          <button type="button" onClick={addCareerOutcome} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            <Plus size={16} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {careerOutcomes.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={c.text}
                onChange={(e) => updateCareerOutcome(i, e.target.value)}
                className={inputCls}
                placeholder="Outcome text"
              />
              <button type="button" onClick={() => removeCareerOutcome(i)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionCls}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Certificate</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Title</label>
            <input
              type="text"
              value={certificate?.title ?? ''}
              onChange={(e) => setCertificate((c) => ({ ...(c ?? {}), title: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Provider</label>
            <input
              type="text"
              value={certificate?.provider ?? ''}
              onChange={(e) => setCertificate((c) => ({ ...(c ?? {}), provider: e.target.value }))}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={labelCls}>Description</label>
          <textarea
            value={certificate?.description ?? ''}
            onChange={(e) => setCertificate((c) => ({ ...(c ?? {}), description: e.target.value }))}
            className={inputCls + ' resize-none'}
            rows={2}
          />
        </div>
        <div className="mt-4">
          <label className={labelCls}>Image URL</label>
          <input
            type="text"
            value={certificate?.image_url ?? ''}
            onChange={(e) => setCertificate((c) => ({ ...(c ?? {}), image_url: e.target.value }))}
            className={inputCls}
            placeholder="https://..."
          />
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={18} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
    </>
  );
}
