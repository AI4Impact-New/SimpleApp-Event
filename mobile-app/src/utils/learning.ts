// Course-learning rules shared by the app and browser layouts of the course screen.
import type { AccessState, LearningClass } from '@/types/learning';

export const REQUIREMENT_LABELS: Record<string, string> = {
  recorded_lectures: 'Complete all recorded lectures',
  live_attendance: 'Attend the required live classes',
  exam: 'Pass all assessments',
  configured_learning_activities: 'This course has no learning activities configured yet',
};

/** Combine recording readiness with the server's seven-day access window. */
export function lectureAccess(lecture: LearningClass): AccessState {
  if (lecture.video_status !== 'ready') return 'not_ready';
  return lecture.access_state ?? 'available';
}
