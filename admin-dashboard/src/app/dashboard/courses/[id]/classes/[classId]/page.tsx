'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCourse } from '@/hooks/useCourses';
import { useMemo } from 'react';
import { ArrowLeft, Loader2, Video, VideoIcon, MapPin, Calendar, ExternalLink, Download } from 'lucide-react';
import type { CourseClass } from '@/types/course';

function buildClassIcs(cl: CourseClass, courseTitle: string): string {
  const title = `${courseTitle}: ${cl.title}`;
  const start = cl.start_time ? new Date(cl.start_time).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z' : '';
  const end = cl.end_time ? new Date(cl.end_time).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z' : start;
  const desc = [cl.description, cl.zoom_link ? `Zoom: ${cl.zoom_link}` : ''].filter(Boolean).join('\\n');
  const loc = cl.location || '';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PiResearch//AI4Impact//EN',
    'BEGIN:VEVENT',
    `UID:class-${cl.id}@piresearch`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART:${start || new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'}`,
    `DTEND:${end || new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'}`,
    `SUMMARY:${title.replace(/\n/g, ' ')}`,
  ];
  if (desc) lines.push(`DESCRIPTION:${desc.replace(/\n/g, '\\n')}`);
  if (loc) lines.push(`LOCATION:${loc.replace(/\n/g, ' ')}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadIcs(icsContent: string, filename: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ClassDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const classId = params?.classId as string;
  const { data: course, isLoading, error } = useCourse(id);

  const classItem = useMemo(() => {
    const list = (course?.classes ?? []) as CourseClass[];
    return list.find((c) => c.id === classId);
  }, [course, classId]);

  if (isLoading || !course) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-20">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  if (error || !classItem) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        Class not found. <Link href={`/dashboard/courses/${id}`} className="underline">Back to course</Link>
      </div>
    );
  }

  const cl = classItem;
  const isRecorded = cl.class_type === 'recorded';
  const isOnline = cl.class_type === 'online';
  const isInPerson = cl.class_type === 'in_person';

  const handleAddToCalendar = () => {
    const ics = buildClassIcs(cl, course.title);
    downloadIcs(ics, `class-${cl.title.slice(0, 30)}.ics`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/courses/${id}?tab=plan`}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          {course.title}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{cl.title}</h1>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${
          isRecorded ? 'bg-purple-100 text-purple-800' :
          isOnline ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
        }`}>
          {isRecorded ? 'Recorded' : isOnline ? 'Online' : 'In person'}
        </span>
        {cl.duration_minutes != null && (
          <span className="text-sm text-gray-500">{cl.duration_minutes} min</span>
        )}
      </div>

      {cl.description && (
        <p className="text-gray-600">{cl.description}</p>
      )}

      {isRecorded && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Video size={20} />
            Recorded session
          </h2>
          {cl.recording_material_id ? (
            <p className="text-sm text-gray-500 mb-4">Material ID: {cl.recording_material_id}. Use Materials to upload/link an MP4 and associate it with this class.</p>
          ) : null}
          <div className="aspect-video max-w-2xl bg-gray-900 rounded-lg flex items-center justify-center text-gray-400">
            {cl.recording_material_id ? (
              <p className="text-sm">Video player: link material in Edit course → Classes with recording_material_id for playback.</p>
            ) : (
              <div className="text-center p-4">
                <VideoIcon size={48} className="mx-auto mb-2 opacity-50" />
                <p>No recording linked yet.</p>
                <p className="text-xs mt-1">Edit course and set a recording material for this class to show the video here.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {isOnline && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Video size={20} />
            Online session (Zoom)
          </h2>
          <div className="space-y-3">
            {(cl.start_time || cl.end_time) && (
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar size={18} />
                <span>
                  {cl.start_time ? new Date(cl.start_time).toLocaleString() : ''}
                  {cl.end_time ? ` – ${new Date(cl.end_time).toLocaleString()}` : ''}
                </span>
              </div>
            )}
            {cl.zoom_link && (
              <div className="flex items-center gap-2">
                <a
                  href={cl.zoom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  <ExternalLink size={18} />
                  Join Zoom
                </a>
              </div>
            )}
            <button
              type="button"
              onClick={handleAddToCalendar}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              <Download size={18} />
              Add to Calendar (.ics)
            </button>
            <p className="text-xs text-gray-500">Download an .ics file to add this session to Google Calendar or Outlook.</p>
          </div>
        </section>
      )}

      {isInPerson && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin size={20} />
            In-person session
          </h2>
          <div className="space-y-3">
            {(cl.start_time || cl.end_time) && (
              <div className="flex items-center gap-2 text-gray-700">
                <Calendar size={18} />
                <span>
                  {cl.start_time ? new Date(cl.start_time).toLocaleString() : ''}
                  {cl.end_time ? ` – ${new Date(cl.end_time).toLocaleString()}` : ''}
                </span>
              </div>
            )}
            {cl.location && (
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin size={18} />
                <span>{cl.location}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleAddToCalendar}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              <Download size={18} />
              Add to Calendar (.ics)
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
