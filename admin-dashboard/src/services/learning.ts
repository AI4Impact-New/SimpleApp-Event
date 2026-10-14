import axios from 'axios';
import api from './api';

export interface LearningClass {
  id: string; course_id: string; title: string; description?: string; class_type: 'recorded' | 'online' | 'in_person';
  duration_minutes: number; sort_order: number; start_time?: string; end_time?: string; zoom_link?: string; location?: string;
  asset_id?: string; video_status?: 'ready' | 'uploading'; duration_seconds?: number; completed: boolean;
}
export interface ExamQuestion { id?: string; question: string; options: { id: string; label: string }[]; correct_option_id: string; points: number }
export interface Exam {
  id: string; course_id: string; title: string; description?: string; published: boolean;
  time_limit_seconds: number; max_attempts: number; pass_percentage: number; question_count?: number; questions?: ExamQuestion[];
}
export interface Learner { user_id: string; name?: string; email: string; status: string; lectures_completed: number; exams_passed: number; certified: boolean }
export interface Certificate { id: string; course_id: string; course_title: string; recipient_name?: string; provider: string; issued_at: string; revoked_at?: string }
export interface CompletionRules { require_recorded: boolean; require_attendance: boolean; require_exam: boolean; attendance_percentage: number }
export interface LearningOverview { courses: number; enrolled_learners: number; published_recordings: number; completed_lectures: number; published_exams: number; passed_attempts: number; valid_certificates: number }

const request = <T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', path: string, data?: unknown) => api.learningRequest<T>(method, path, data);
export const learning = {
  overview: () => request<LearningOverview>('GET', '/admin/learning/overview'),
  classes: (course: string) => request<LearningClass[]>('GET', `/admin/courses/${course}/classes`),
  saveClass: (course: string, data: Partial<LearningClass>, id?: string) => request<LearningClass>(id ? 'PUT' : 'POST', `/admin/courses/${course}/classes${id ? '/' + id : ''}`, data),
  deleteClass: (course: string, id: string) => request('DELETE', `/admin/courses/${course}/classes/${id}`),
  playback: (id: string) => request<{ url: string }>('GET', `/learning/classes/${id}/playback`),
  learners: (course: string) => request<Learner[]>('GET', `/admin/courses/${course}/learners`),
  exams: (course: string) => request<Exam[]>('GET', `/admin/courses/${course}/exams`),
  exam: (id: string) => request<Exam>('GET', `/admin/exams/${id}`),
  saveExam: (course: string, data: Partial<Exam>, id?: string) => request<Exam>(id ? 'PUT' : 'POST', id ? `/admin/exams/${id}` : `/admin/courses/${course}/exams`, data),
  deleteExam: (id: string) => request('DELETE', `/admin/exams/${id}`),
  rules: (course: string) => request<CompletionRules>('GET', `/admin/courses/${course}/completion-rules`),
  saveRules: (course: string, data: CompletionRules) => request<CompletionRules>('PUT', `/admin/courses/${course}/completion-rules`, data),
  certificates: () => request<Certificate[]>('GET', '/admin/certificates'),
  revoke: (id: string, reason: string) => request('POST', `/admin/certificates/${id}/revoke`, { reason }),
  certificateDownload: (id: string) => request<{ url: string }>('GET', `/certificates/${id}/download`),
  attendance: (id: string) => request<{ email: string; name?: string; minutes_attended: number }[]>('GET', `/admin/classes/${id}/attendance`),
  importAttendance: (id: string, attendees: { email: string; minutes_attended: number }[]) => request<{ imported: number }>('POST', `/admin/classes/${id}/attendance/import`, { source: 'zoom_csv', attendees }),
  announce: (course: string, title: string, body: string) => request<{ notifications_created: number }>('POST', `/admin/courses/${course}/notifications`, { title, body }),
  async uploadVideo(id: string, file: File, seconds: number, onProgress: (percentage: number) => void) {
    const result = await request<{ asset_id: string; upload: { url: string; fields: Record<string, string> } }>('POST', `/admin/classes/${id}/video-upload`, { duration_seconds: seconds, size_bytes: file.size });
    const form = new FormData();
    Object.entries(result.upload.fields).forEach(([key, value]) => form.append(key, value));
    form.append('file', file);
    await axios.post(result.upload.url, form, { onUploadProgress: event => onProgress(event.total ? Math.round(event.loaded * 100 / event.total) : 0) });
    await request('POST', `/admin/classes/${id}/video-confirm`, { asset_id: result.asset_id });
  },
};

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return error.response?.data?.error || error.response?.data?.message || error.message;
  return error instanceof Error ? error.message : 'The request failed. Please try again.';
}

export async function videoDuration(file: File): Promise<number> {
  if (!file.name.toLowerCase().endsWith('.mp4')) throw new Error('Choose an MP4 recording.');
  if (file.size > 2147483648) throw new Error('Recordings must be 2 GB or smaller.');
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    const done = () => { URL.revokeObjectURL(url); video.removeAttribute('src'); };
    video.preload = 'metadata';
    video.onloadedmetadata = () => { const duration = Math.ceil(video.duration); done(); Number.isFinite(duration) && duration > 0 && duration <= 43200 ? resolve(duration) : reject(new Error('Could not read a valid video duration.')); };
    video.onerror = () => { done(); reject(new Error('This file could not be read as an MP4 video.')); };
    video.src = url;
  });
}

export function parseAttendanceCsv(csv: string): { email: string; minutes_attended: number }[] {
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') { if (quoted && csv[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if (char === '\n' && !quoted) { row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else if (char !== '\r') field += char;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  const headers = (rows.shift() || []).map(header => header.toLowerCase().replace(/[^a-z]/g, ''));
  const email = headers.findIndex(header => ['email', 'useremail', 'emailaddress'].includes(header));
  const minutes = headers.findIndex(header => ['durationminutes', 'minutesattended', 'duration'].includes(header));
  if (email < 0 || minutes < 0) throw new Error('Include Email and Duration (Minutes) columns in the CSV.');
  const totals = new Map<string, number>();
  rows.forEach((entry, index) => {
    const address = entry[email]?.trim().toLowerCase(), duration = Number(entry[minutes]);
    if (!address?.includes('@') || !entry[minutes]?.trim() || !Number.isFinite(duration) || duration < 0 || duration > 1440) throw new Error(`Check the email and duration on row ${index + 2}.`);
    totals.set(address, (totals.get(address) || 0) + duration);
  });
  if (!totals.size || totals.size > 500) throw new Error('Import between 1 and 500 enrolled learners at a time.');
  return Array.from(totals, ([email, minutes_attended]) => ({ email, minutes_attended }));
}
