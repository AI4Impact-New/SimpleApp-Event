// API service
import axios, { AxiosInstance, AxiosError } from 'axios';
import { authService } from './auth';
import type {
  CertificateVerification,
  Completion,
  CourseProgress,
  Exam,
  ExamAnswers,
  ExamAttempt,
  IssuedCertificate,
  LearnerNotification,
  LearningHome,
  LectureProgress,
  MyCertificate,
  MyLearningCourse,
  Playback,
  PushDevice,
  PushDeviceInput,
  TemporaryDownload,
} from '@/types/learning';

export type MyProfile = {
  id: string;
  cognito_id?: string;
  email: string;
  name?: string;
  user_type?: 'student' | 'professional';
  university?: string;
  course?: string;
  year_of_study?: string;
  city?: string;
  state?: string;
  designation?: string;
  company?: string;
  access_role?: string;
};

const rawUrl = process.env.EXPO_PUBLIC_API_URL || 'https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com';
const API_URL = rawUrl.replace(/\/api\/?$/, '');

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Attach auth token to requests
    this.client.interceptors.request.use(async (config) => {
      const token = await authService.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // On 401: try to refresh the Cognito session and retry once. Only clear auth and show login
    // when refresh failed or we had no session — not when the retry still returns 401 (e.g. backend
    // rejects the token for that resource). That prevents the "open event → login → open event → login" loop.
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const status = error.response?.status;
        const config = error.config as (typeof error.config) & { _retried?: boolean };
        if (status === 401 && config && !config._retried) {
          const refreshed = await authService.refreshSession();
          if (refreshed) {
            config._retried = true;
            return this.client.request(config);
          }
        }
        // Only clear storage when we didn't just retry with a fresh token (session is invalid or refresh failed)
        if (status === 401 && !config?._retried) {
          await authService.clearStorage();
        }
        // 403 = forbidden for this resource (e.g. admin-only endpoint); user is still authenticated — do not clear auth
        return Promise.reject(error);
      }
    );
  }

  // Events (optionally filter by visibility: 'global' for public list, omit for all)
  async getEvents(params?: { visibility?: string }) {
    const response = await this.client.get('/events', { params });
    const raw = response.data;
    return Array.isArray(raw) ? raw : raw?.data ?? raw?.events ?? [];
  }

  async getEvent(id: string) {
    const response = await this.client.get(`/events/${id}`);
    return response.data;
  }

  // Attendance — backend route is POST /events/{event_id}/join
  async joinEvent(eventId: string) {
    const response = await this.client.post(`/events/${eventId}/join`);
    return response.data;
  }

  async getAttendance() {
    const response = await this.client.get('/attendance');
    const raw = response.data;
    return Array.isArray(raw) ? raw : raw?.attendance ?? raw?.data ?? [];
  }

  // Polls
  async getPolls(eventId: string) {
    const response = await this.client.get('/polls', { params: { event_id: eventId } });
    const raw = response.data;
    return Array.isArray(raw) ? raw : raw?.polls ?? raw?.data ?? [];
  }

  async getPoll(id: string) {
    const response = await this.client.get(`/polls/${id}`);
    return response.data;
  }

  async castVote(pollId: string, optionId: string) {
    const response = await this.client.post(`/polls/${pollId}/vote`, { option_id: optionId });
    return response.data;
  }

  async getPollResults(id: string) {
    const response = await this.client.get(`/polls/${id}/results`);
    const raw = response.data;
    return {
      ...raw,
      results: Array.isArray(raw?.results) ? raw.results : [],
    };
  }

  // Materials
  async getMaterials(eventId: string) {
    const response = await this.client.get('/materials', { params: { event_id: eventId } });
    const raw = response.data;
    return Array.isArray(raw) ? raw : raw?.materials ?? raw?.data ?? [];
  }

  async getDownloadUrl(materialId: string) {
    const response = await this.client.post(`/materials/${materialId}/download`);
    return response.data;
  }

  // Analytics
  async getEventAnalytics(eventId: string) {
    const response = await this.client.get(`/events/${eventId}/analytics`);
    return response.data;
  }

  // User profile (after sign-up completion)
  async updateMyProfile(payload: {
    name?: string;
    user_type: 'student' | 'professional';
    university?: string;
    course?: string;
    year_of_study?: string;
    city?: string;
    state?: string;
    designation?: string;
    company?: string;
  }) {
    const response = await this.client.put('/users/me', payload);
    return response.data;
  }

  async getMyProfile(): Promise<MyProfile> {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  // Courses
  async getCourses(params?: { status?: string; full?: boolean; limit?: number }) {
    const response = await this.client.get('/courses', { params });
    const raw = response.data;
    return Array.isArray(raw) ? raw : raw?.data ?? raw?.courses ?? [];
  }

  async getCourse(id: string) {
    const response = await this.client.get(`/courses/${id}`);
    return response.data;
  }

  async registerCourse(courseId: string) {
    const response = await this.client.post(`/courses/${courseId}/register`, { source: 'mobile' });
    return response.data;
  }

  async markCourseInterest(courseId: string) {
    const response = await this.client.post(`/courses/${courseId}/interest`, {});
    return response.data;
  }

  async getMyCourses() {
    const response = await this.client.get('/me/courses');
    const raw = response.data as { courses?: unknown[] };
    return raw?.courses ?? [];
  }

  async getCourseCalendarIcs(courseId: string): Promise<string> {
    const token = await authService.getToken();
    const url = `${this.client.defaults.baseURL}/courses/${courseId}/calendar.ics`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to get calendar');
    return res.text();
  }

  async getEventCalendarIcs(eventId: string): Promise<string> {
    const token = await authService.getToken();
    const url = `${this.client.defaults.baseURL}/events/${eventId}/calendar.ics`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Failed to get calendar');
    return res.text();
  }

  async submitPrivacyConsent(version: string) {
    const response = await this.client.post('/users/me/privacy-consent', { version });
    return response.data;
  }

  // Learning — new routes return JSON directly (arrays or objects)
  async getMyLearning(): Promise<MyLearningCourse[]> {
    const response = await this.client.get('/me/learning');
    return Array.isArray(response.data) ? response.data : [];
  }

  async getLearningHome(courseId: string): Promise<LearningHome> {
    const response = await this.client.get(`/learning/courses/${courseId}`);
    return response.data;
  }

  async getCourseProgress(courseId: string): Promise<CourseProgress> {
    const response = await this.client.get(`/learning/courses/${courseId}/progress`);
    return response.data;
  }

  async getPlayback(classId: string): Promise<Playback> {
    const response = await this.client.get(`/learning/classes/${classId}/playback`);
    return response.data;
  }

  async sendLectureProgress(classId: string, sessionId: string, positionSeconds: number): Promise<LectureProgress> {
    const response = await this.client.post(`/learning/classes/${classId}/progress`, {
      session_id: sessionId,
      position_seconds: positionSeconds,
    });
    return response.data;
  }

  // Exams
  async getCourseExams(courseId: string): Promise<Exam[]> {
    const response = await this.client.get(`/learning/courses/${courseId}/exams`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async startExamAttempt(examId: string): Promise<ExamAttempt> {
    const response = await this.client.post(`/learning/exams/${examId}/attempts`, {});
    return response.data;
  }

  async getExamAttempt(attemptId: string): Promise<ExamAttempt> {
    const response = await this.client.get(`/learning/attempts/${attemptId}`);
    return response.data;
  }

  async submitExamAttempt(attemptId: string, answers: ExamAnswers): Promise<ExamAttempt> {
    const response = await this.client.post(`/learning/attempts/${attemptId}/submit`, { answers });
    return response.data;
  }

  // Completion & certificates
  async getCourseCompletion(courseId: string): Promise<Completion> {
    const response = await this.client.get(`/learning/courses/${courseId}/completion`);
    return response.data;
  }

  async issueCertificate(courseId: string): Promise<IssuedCertificate> {
    const response = await this.client.post(`/learning/courses/${courseId}/certificate`, {});
    return response.data;
  }

  async getMyCertificates(): Promise<MyCertificate[]> {
    const response = await this.client.get('/me/certificates');
    return Array.isArray(response.data) ? response.data : [];
  }

  async getCertificateDownload(certificateId: string): Promise<TemporaryDownload> {
    const response = await this.client.get(`/certificates/${certificateId}/download`);
    return response.data;
  }

  /** Public — no login required. */
  async verifyCertificate(certificateId: string): Promise<CertificateVerification> {
    const response = await axios.get(`${API_URL}/certificates/${certificateId}/verify`);
    return response.data;
  }

  // Notifications
  async getNotifications(): Promise<LearnerNotification[]> {
    const response = await this.client.get('/me/notifications');
    return Array.isArray(response.data) ? response.data : [];
  }

  async markNotificationRead(notificationId: string) {
    const response = await this.client.patch(`/me/notifications/${notificationId}`, {});
    return response.data as { id: string; read_at: string };
  }

  // Push devices (503 until backend expo_project_id is configured)
  async getDevices(): Promise<PushDevice[]> {
    const response = await this.client.get('/me/devices');
    return Array.isArray(response.data) ? response.data : [];
  }

  async registerDevice(input: PushDeviceInput): Promise<PushDevice> {
    const response = await this.client.post('/me/devices', input);
    return response.data;
  }

  async removeDevice(deviceId: string) {
    const response = await this.client.delete(`/me/devices/${deviceId}`);
    return response.data as { deleted: boolean };
  }
}

export const api = new ApiService();
export default api;
