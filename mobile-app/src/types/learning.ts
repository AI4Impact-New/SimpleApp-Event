// Learning types (matches the learning API, docs/AI4Impact-Learning-OpenAPI.json)
import type { ClassType, Course } from './course';

export interface MyLearningCourse {
  id: string;
  title: string;
  status: string;
  registration_status: 'registered' | 'completed';
  completed_lectures: number;
  total_recorded_lectures: number;
}

export type AccessState = 'available' | 'locked' | 'expired' | 'not_ready';

export interface LearningClass {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  class_type: ClassType;
  duration_minutes?: number | null;
  sort_order?: number;
  start_time?: string | null;
  end_time?: string | null;
  zoom_link?: string | null;
  location?: string | null;
  asset_id?: string | null;
  video_status?: string | null;
  duration_seconds?: number | null;
  watched_seconds: number;
  completed: boolean;
  resume_seconds: number;
  minutes_attended?: number | null;
  // Sequential seven-day recording windows (recorded classes only)
  access_state?: AccessState;
  unlocked_at?: string | null;
  access_expires_at?: string | null;
  access_days?: number;
  prerequisite_class_id?: string | null;
}

export interface CompletionRules {
  require_recorded: boolean;
  require_attendance: boolean;
  require_exam: boolean;
  attendance_percentage: number;
}

export type CompletionRequirement =
  | 'recorded_lectures'
  | 'live_attendance'
  | 'exam'
  | 'configured_learning_activities'
  | string;

export interface Completion {
  course_id: string;
  eligible: boolean;
  missing_requirements: CompletionRequirement[];
  rules: CompletionRules;
  recorded_total: number;
  recorded_completed: number;
  live_total: number;
  live_attended: number;
  exams_total: number;
  exams_passed: number;
  progress_percentage: number;
}

export interface LearningHome {
  course: Course;
  classes: LearningClass[];
  completion: Completion;
}

export interface CourseProgress {
  classes: LearningClass[];
  completion: Completion;
}

export interface Playback {
  url: string;
  session_id: string;
  expires_in: number;
  access_expires_at?: string | null;
  duration_seconds: number;
  resume_seconds: number;
}

export interface LectureProgress {
  class_id: string;
  completed: boolean;
  watched_seconds: number;
  duration_seconds: number;
  progress_percentage: number;
}

export interface Exam {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  published: boolean;
  time_limit_seconds?: number | null;
  max_attempts?: number | null;
  pass_percentage: number;
  question_count: number;
  attempts_used: number;
}

export interface ExamOption {
  id: string;
  label: string;
}

export interface ExamQuestion {
  id: string;
  question: string;
  options: ExamOption[];
  points: number;
}

export type AttemptStatus = 'pending' | 'passed' | 'failed';

export interface ExamAttempt {
  id: string;
  exam_id: string;
  status: AttemptStatus;
  score: number | null;
  max_score: number;
  pass_percentage: number;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  questions: ExamQuestion[];
  percentage: number | null;
  expired: boolean;
}

/** Question UUID -> selected option ID */
export type ExamAnswers = Record<string, string>;

export interface IssuedCertificate {
  id: string;
  issued_at: string;
  download_path: string;
}

export interface MyCertificate {
  id: string;
  user_id: string;
  course_id: string | null;
  certificate_type: string;
  provider?: string | null;
  issued_at: string;
  revoked_at: string | null;
  course_title?: string | null;
  recipient_name?: string | null;
}

export interface TemporaryDownload {
  url: string;
  expires_in: number;
}

export interface CertificateVerification {
  id: string;
  valid: boolean;
  reason?: string;
  recipient_name?: string;
  course_title?: string;
  provider?: string;
  issued_at?: string;
  certificate_type?: string;
}

export interface LearnerNotification {
  id: string;
  course_id: string | null;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface PushDeviceInput {
  platform: 'ios' | 'android';
  project_id: string;
  token: string;
}

export interface PushDevice {
  id: string;
  platform: 'ios' | 'android';
  project_id: string;
  updated_at?: string;
}
