// API service
// Base URL must NOT include /api — API Gateway routes are /events, /polls, etc. directly.
import axios, { AxiosInstance, AxiosError } from 'axios';
import { isIdToken } from '@/utils/jwt';
import { CreateAdminUserInput } from '@/types/user';

const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com';
const API_URL = rawUrl.replace(/\/api\/?$/, '');

class ApiService {
  async learningRequest<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, data?: unknown): Promise<T> {
    const response = await this.client.request<T>({ method, url, data });
    return response.data;
  }

  private client: AxiosInstance;
  private clearLocalAuth() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_id_token');
  }

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      if (typeof window !== 'undefined') {
        const token =
          localStorage.getItem('auth_id_token') ||
          localStorage.getItem('auth_token');
        if (token && isIdToken(token)) {
          config.headers.Authorization = `Bearer ${token}`;
        } else if (token && !isIdToken(token)) {
          this.clearLocalAuth();
        }
      }
      return config;
    });

    // Handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const status = error.response?.status;
        if (status === 401) {
          if (typeof window !== 'undefined') {
            this.clearLocalAuth();
            const studentPage = ['/student', '/checkout'].includes(window.location.pathname);
            if (studentPage) sessionStorage.setItem('post_login_path', window.location.pathname + window.location.search);
            window.location.href = studentPage ? '/login?portal=student' : '/login';
          }
        }
        if (status === 403 && typeof window !== 'undefined') {
          const data = error.response?.data as { error?: string; message?: string } | undefined;
          const message = `${data?.error || ''} ${data?.message || ''}`.toLowerCase();
          if (message.includes('required role') || message.includes('forbidden')) {
            this.clearLocalAuth();
            window.location.href = '/login?error=access_denied';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Events (backend may wrap list in { data: [...] })
  async getEvents() {
    const response = await this.client.get('/events');
    const raw = response.data;
    return Array.isArray(raw) ? raw : raw?.data ?? raw?.events ?? [];
  }

  async getEvent(id: string) {
    const response = await this.client.get(`/events/${id}`);
    return response.data;
  }

  async createEvent(data: any) {
    const response = await this.client.post('/events', data);
    return response.data;
  }

  async updateEvent(id: string, data: any) {
    const response = await this.client.put(`/events/${id}`, data);
    return response.data;
  }

  async deleteEvent(id: string) {
    const response = await this.client.delete(`/events/${id}`);
    return response.data;
  }

  // Polls
  async getPolls(eventId?: string) {
    const params = eventId ? { event_id: eventId } : {};
    const response = await this.client.get('/polls', { params });
    const raw = response.data;
    return Array.isArray(raw) ? raw : raw?.polls ?? raw?.data ?? [];
  }

  async getPoll(id: string) {
    const response = await this.client.get(`/polls/${id}`);
    return response.data;
  }

  async createPoll(data: any) {
    const response = await this.client.post('/polls', data);
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
    return {
      ...raw,
      materials: Array.isArray(raw?.materials) ? raw.materials : [],
    };
  }

  async createMaterial(data: any) {
    const response = await this.client.post('/materials', data);
    return response.data;
  }

  async getDownloadUrl(materialId: string) {
    const response = await this.client.post(`/materials/${materialId}/download`);
    return response.data;
  }

  async deleteMaterial(id: string) {
    const response = await this.client.delete(`/materials/${id}`);
    return response.data;
  }

  // Analytics
  async getEventAnalytics(eventId: string) {
    const response = await this.client.get(`/events/${eventId}/analytics`);
    return response.data;
  }

  // Users
  async getAdminUsers(params?: { next_token?: string; limit?: number }) {
    const response = await this.client.get('/admin-users', { params });
    const raw = response.data;
    return {
      users: Array.isArray(raw?.users) ? raw.users : [],
      next_token: raw?.next_token,
    };
  }

  async createAdminUser(data: CreateAdminUserInput) {
    const response = await this.client.post('/admin-users', data);
    return response.data;
  }

  async getUsers(group = 'All') {
    const response = await this.client.get('/users', { params: { group } });
    const raw = response.data;
    return {
      users: Array.isArray(raw?.users) ? raw.users : [],
      next_token: raw?.next_token,
    };
  }

  // Courses
  async getCourses(params?: { status?: string; full?: string; limit?: number }) {
    const response = await this.client.get('/courses', { params });
    const raw = response.data;
    return Array.isArray(raw) ? raw : raw?.data ?? raw?.courses ?? [];
  }

  async getCourse(id: string) {
    const response = await this.client.get(`/courses/${id}`);
    return response.data;
  }

  async createCourse(data: any) {
    const response = await this.client.post('/courses', data);
    return response.data;
  }

  async updateCourse(id: string, data: any) {
    const response = await this.client.put(`/courses/${id}`, data);
    return response.data;
  }

  async deleteCourse(id: string) {
    const response = await this.client.delete(`/courses/${id}`);
    return response.data;
  }

  async getCourseRegistrations(courseId: string, params?: { status?: string }) {
    const response = await this.client.get(`/courses/${courseId}/registrations`, { params });
    const raw = response.data as { registrations?: unknown[] };
    return raw?.registrations ?? [];
  }

  async updateCourseRegistration(courseId: string, userId: string, body: { status: string; notes?: string }) {
    const response = await this.client.put(`/courses/${courseId}/registrations`, { user_id: userId, ...body });
    return response.data;
  }

  async getCourseCalendarIcs(courseId: string): Promise<string> {
    const response = await this.client.get(`/courses/${courseId}/calendar.ics`, { responseType: 'text' });
    return response.data as string;
  }

  async getCourseEnquiries(params?: { status?: string }) {
    const response = await this.client.get('/courses/enquiries', { params });
    const raw = response.data as { enquiries?: unknown[] };
    return raw?.enquiries ?? [];
  }
}

export const api = new ApiService();
export default api;
