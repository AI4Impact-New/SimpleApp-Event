'use client';

import { useState } from 'react';
import { EventEditor, EventFormValues } from '@/components/EventEditor';
import { useEvents, useCreateEvent, useUpdateEvent, useEvent } from '@/hooks/useEvents';
import { EventCard } from '@/components/EventCard';
import { Plus, Loader2, Calendar, QrCode, Users } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Event } from '@/types/event';
import { fromIstInputToUtcIso, toIstInputValue } from '@/utils/datetime';
import QRCode from 'qrcode';

const toForm = (event?: Event): EventFormValues => ({
  name: event?.name ?? '',
  description: event?.description ?? '',
  location: event?.location ?? '',
  event_type: event?.event_type ?? 'offline',
  start_time: toIstInputValue(event?.start_time),
  end_time: toIstInputValue(event?.end_time),
  max_attendees: event ? event.max_attendees : 100,
  visibility: event?.visibility ?? 'global',
  status: event?.status ?? 'draft',
});

export default function EventsPage() {
  const { data: events, isLoading } = useEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  // null = list view; 'new' = create form; an Event = edit form. The form replaces the list on the page.
  const [editor, setEditor] = useState<'new' | Event | null>(null);
  const editingEvent = editor && editor !== 'new' ? editor : null;
  const { data: editingEventDetail } = useEvent(editingEvent?.id ?? '');
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [qrEventName, setQrEventName] = useState('');
  const [submitError, setSubmitError] = useState<string>('');

  const openEditor = (target: 'new' | Event) => { setSubmitError(''); setEditor(target); };

  const save = async (values: EventFormValues) => {
    setSubmitError('');
    const common = {
      name: values.name,
      description: values.description.trim() || undefined,
      location: values.location.trim() || undefined,
      event_type: values.event_type,
      start_time: fromIstInputToUtcIso(values.start_time),
      end_time: fromIstInputToUtcIso(values.end_time),
      max_attendees: values.max_attendees ? Math.max(1, values.max_attendees) : undefined,
      visibility: values.visibility,
    };
    try {
      if (editingEvent) await updateEvent.mutateAsync({ id: editingEvent.id, data: { ...common, status: values.status } });
      else await createEvent.mutateAsync(common);
      setEditor(null);
    } catch (error: any) {
      setSubmitError(error?.response?.data?.message || error?.message || (editingEvent ? 'Failed to update event' : 'Failed to create event'));
    }
  };

  const handleQRClick = async (eventItem: any) => {
    const payload = eventItem?.id || eventItem?.qr_code;
    if (!payload) return;

    try {
      const dataUrl = await QRCode.toDataURL(payload, {
        width: 320,
        margin: 1,
      });
      setQrPayload(payload);
      setQrEventName(eventItem?.name || 'Event');
      setQrDataUrl(dataUrl);
      setShowQRModal(true);
    } catch (error) {
      setSubmitError('Unable to generate QR code. Please try again.');
    }
  };

  if (editor) return (
    <EventEditor
      key={editingEventDetail ? `detail-${editingEventDetail.id}` : editingEvent?.id ?? 'new'}
      initial={toForm(editingEventDetail ?? editingEvent ?? undefined)}
      editing={!!editingEvent}
      busy={createEvent.isPending || updateEvent.isPending}
      error={submitError}
      onCancel={() => { setEditor(null); setSubmitError(''); }}
      onSubmit={values => void save(values)}
    />
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Events</h1>
            <p className="mt-1 text-sm text-gray-500">Create and manage your events</p>
          </div>
          <button
            onClick={() => openEditor('new')}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
          >
            <Plus size={18} aria-hidden />
            Create Event
          </button>
      </header>

      {submitError && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{submitError}</p>}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-20 shadow-sm">
          <Loader2 className="animate-spin text-primary-500" size={32} aria-hidden />
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {events.map((event: any) => (
            <EventCard
              key={event.id}
              event={event}
              onQRClick={() => handleQRClick(event)}
              onEdit={() => openEditor(event)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="bg-gradient-to-b from-primary-50/80 to-white px-8 py-14 sm:px-12 sm:py-16">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-100">
                <Calendar size={40} className="text-primary-600" aria-hidden />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 sm:text-2xl">No events yet</h2>
              <p className="mt-3 text-gray-600">
                Create an event, share the QR code with attendees, and run polls and materials from the dashboard.
              </p>
              <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
                <li className="flex items-center gap-2">
                  <Calendar size={16} className="text-primary-500" aria-hidden />
                  Create events
                </li>
                <li className="flex items-center gap-2">
                  <QrCode size={16} className="text-primary-500" aria-hidden />
                  QR check-in
                </li>
                <li className="flex items-center gap-2">
                  <Users size={16} className="text-primary-500" aria-hidden />
                  Track attendance
                </li>
              </ul>
              <button
                onClick={() => openEditor('new')}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-medium text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                <Plus size={20} aria-hidden />
                Create your first event
              </button>
            </div>
          </div>
        </div>
      )}

      {showQRModal && (
        <Modal onClose={() => setShowQRModal(false)}>
          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Event QR Code</h2>
            <p className="text-sm text-gray-500 mb-6">
              Scan this code from the student app to join {qrEventName}.
            </p>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${qrEventName}`}
                  className="mx-auto h-64 w-64"
                />
              )}
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-xs font-medium text-gray-500">QR Payload</p>
              <p className="mt-1 break-all text-sm text-gray-800">{qrPayload}</p>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(qrPayload);
                  } catch {
                    // Ignore clipboard failures in unsupported contexts.
                  }
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Copy Event ID
              </button>
              <a
                href={qrDataUrl}
                download={`event-${qrPayload}.png`}
                className="flex-1 text-center px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Download QR
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
