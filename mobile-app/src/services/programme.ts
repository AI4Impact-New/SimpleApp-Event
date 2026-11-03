/** Non-AI Programme+ contract. All access and credit decisions are enforced by the server. */
import { api } from "./api";
export type Page<T> = { items: T[]; next_cursor: string | null };
export type Session = {
  id: string;
  course_id: string;
  educator_id: string;
  educator_name: string;
  kind: "group" | "handholding" | "internship_interview";
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  capacity: number;
  booked: number;
  status: string;
  meeting_url: string | null;
};
export type Booking = {
  id: string;
  session_id: string;
  topic: string;
  note: string;
  status: "confirmed" | "cancelled" | "completed" | "no_show";
  starts_at: string;
  ends_at: string;
  timezone: string;
  title: string;
  meeting_url: string | null;
};
export type Job = {
  id: string;
  company_id: string;
  company_name: string;
  title: string;
  description: string;
  location: string;
  remote: boolean;
  work_mode: "onsite" | "hybrid" | "remote";
  employment_type: "full_time" | "contract" | "internship";
  partner: string;
  experience_min: number;
  experience_max: number;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  created_at: string;
  skills: string[];
  apply_url: string;
  deadline: string;
};
export type Application = {
  id: string;
  job_id: string;
  title: string;
  company_name: string;
  status: string;
  created_at: string;
  history: { status: string; note: string; created_at: string }[];
};
export type Preferences = {
  email_enabled: boolean;
  push_enabled: boolean;
  marketing_enabled: boolean;
  timezone: string;
  categories: Partial<
    Record<"booking" | "webinar" | "career" | "announcement", boolean>
  >;
  quiet_start: number;
  quiet_end: number;
  daily_limit: number;
};
const get = <T>(path: string) =>
  api.programmeRequest<T>("GET", "/programme" + path);
const write = <T>(method: "POST" | "PATCH", path: string, body: unknown) =>
  api.programmeRequest<T>(method, "/programme" + path, body);
const query = (after?: string) =>
  after ? "&after=" + encodeURIComponent(after) : "";
export const programme = {
  entitlement: (courseId: string) =>
    get<{
      course_id: string;
      wallets: { kind: "handholding" | "ai_interview"; balance: number }[];
      ai_enabled: false;
      billing_mode: "included";
    }>("/courses/" + courseId + "/entitlement"),
  sessions: (courseId: string, after?: string) =>
    get<Page<Session>>(
      "/sessions?course_id=" + encodeURIComponent(courseId) + query(after),
    ),
  book: (
    sessionId: string,
    input: { request_id: string; topic: string; note?: string },
  ) => write<Booking>("POST", "/sessions/" + sessionId + "/bookings", input),
  bookings: (after?: string) =>
    get<Page<Booking>>("/bookings?limit=30" + query(after)),
  reschedule: (id: string, input: { request_id: string; session_id: string }) =>
    write<Booking>("POST", "/bookings/" + id + "/reschedule", input),
  calendar: (id: string) =>
    get<{ filename: string; content_type: "text/calendar"; content: string }>(
      "/bookings/" + id + "/calendar",
    ),
  cancelBooking: (id: string) =>
    write<Booking>("PATCH", "/bookings/" + id, { status: "cancelled" }),
  jobs: (search = "", after?: string) =>
    get<Page<Job>>("/jobs?q=" + encodeURIComponent(search) + query(after)),
  apply: (
    id: string,
    input: { request_id: string; statement?: string; consent: true },
  ) => write<Application>("POST", "/jobs/" + id + "/applications", input),
  applications: (after?: string) =>
    get<Page<Application>>("/applications?limit=30" + query(after)),
  withdraw: (id: string) =>
    write<Application>("PATCH", "/applications/" + id, { status: "withdrawn" }),
  internships: () =>
    get<
      Page<{ id: string; course_id: string; status: string; project: string }>
    >("/internships"),
  applyInternship: (input: {
    request_id: string;
    course_id: string;
    eligible_declaration: true;
  }) => write("POST", "/internships", input),
  screening: (courseId: string) =>
    get<{
      configured: boolean;
      aptitude_exam_id?: string;
      technical_exam_id?: string;
      passed?: Record<string, boolean>;
    }>("/courses/" + courseId + "/screening"),
  internshipReviews: (id: string) =>
    get<{ id: string; note: string; rating: number; created_at: string }[]>(
      "/internships/" + id + "/reviews",
    ),
  recommendationLetter: (id: string) =>
    get<{ url: string; expires_in: number }>("/internships/" + id + "/letter"),
  preferences: () => get<Preferences>("/preferences"),
  updatePreferences: (input: Partial<Preferences>) =>
    write<Preferences>("PATCH", "/preferences", input),
  inbox: (after?: string) =>
    get<
      Page<{
        id: string;
        title: string;
        body: string;
        course_id: string | null;
        read_at: string | null;
        created_at: string;
      }> & { unread_count: number }
    >("/inbox?limit=30" + query(after)),
};
