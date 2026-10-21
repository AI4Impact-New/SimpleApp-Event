'use client';
import { useEffect, useState } from 'react';
import { learning, VideoAnalytics, errorMessage } from '@/services/learning';

const minutes = (seconds: number) => (Number(seconds || 0) / 60).toFixed(1);
const position = (seconds: number) => `${Math.floor(Number(seconds || 0) / 60)}:${String(Math.floor(Number(seconds || 0) % 60)).padStart(2, '0')}`;

export default function VideoAnalyticsPanel({ courseId }: { courseId: string }) {
  const [data, setData] = useState<VideoAnalytics | null>(null);
  const [selected, setSelected] = useState('');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setData(null);
    learning.videoAnalytics(courseId, selected).then(result => { if (active) setData(result); })
      .catch(error => { if (active) setError(errorMessage(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [courseId, selected, revision]);
  return <section className="rounded-xl border bg-white p-5 space-y-4" aria-label="Video viewing analytics">
    <div className="flex justify-between gap-4"><div><h3 className="font-semibold">Video viewing analytics</h3><p className="mt-1 text-sm text-gray-500">Credited watch minutes count unique video segments per learner. Replays and seeking do not inflate completion. Resume position is the latest saved playback position.</p></div><button disabled={loading} onClick={() => setRevision(value => value + 1)} className="self-start rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Refresh metrics</button></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error} <button className="underline" onClick={() => { setSelected(''); setRevision(value => value + 1); }}>Reload recording list</button></p>}
    {loading && <p role="status">Loading viewing metrics…</p>}
    {data && <>
      <p className="rounded-lg bg-primary-50 p-3 font-medium text-primary-800">Total credited watch time: {minutes(data.videos.reduce((total, video) => total + Number(video.watched_seconds), 0))} minutes</p>
      {!data.videos.length ? <p className="text-sm text-gray-500">Upload and publish a recording to see video metrics.</p> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left"><tr>{['Video', 'Length (min)', 'Students started', 'Completed', 'Watched (min)'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{data.videos.map(video => <tr key={video.class_id} className="border-t"><td className="p-3"><button onClick={() => setSelected(video.class_id)} className="text-primary-700 underline">{video.title}</button></td><td className="p-3">{minutes(video.duration_seconds)}</td><td className="p-3">{video.students_started}</td><td className="p-3">{video.students_completed}</td><td className="p-3">{minutes(video.watched_seconds)}</td></tr>)}</tbody></table></div>}
      <label className="block text-sm font-medium">Per-learner video progress<select aria-label="Per-learner video progress" value={selected} onChange={event => setSelected(event.target.value)} className="mt-2 block w-full rounded-lg border p-2"><option value="">Select a video</option>{data.videos.map(video => <option value={video.class_id} key={video.class_id}>{video.title}</option>)}</select></label>
      {selected && <><p className="text-xs text-gray-500">Showing {data.students.length} of {data.total_students} course registrations (limit {data.student_limit}). Includes learners who have not started.</p><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left"><tr>{['Learner', 'Watched (min)', 'Progress', 'Resume at', 'State', 'Last saved'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{data.students.map(student => <tr key={student.user_id} className="border-t"><td className="p-3"><p className="font-medium">{student.name || 'Learner'}</p><p className="text-xs text-gray-500">{student.email}</p></td><td className="p-3">{minutes(student.watched_seconds)}</td><td className="p-3">{Number(student.progress_percentage).toFixed(1)}%</td><td className="p-3">{position(student.resume_seconds)}</td><td className="p-3">{student.completed ? 'Completed' : Number(student.watched_seconds) > 0 ? 'In progress' : 'Not started'}</td><td className="p-3">{student.last_progress_at ? new Date(student.last_progress_at).toLocaleString() : '—'}</td></tr>)}</tbody></table></div></>}
    </>}
  </section>;
}
