"use client";
import {
  CalendarDays,
  Briefcase,
  MessagesSquare,
  Settings2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Select } from '@/components/ui/Select';
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  programme,
  ProgrammeRow as Row,
  ProgrammePage,
  zonedInputToIso,
  isoToZonedInput,
} from "@/services/programme";
import { api } from "@/services/api";
import { errorMessage } from "@/services/learning";

type Field = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  optional?: boolean;
  initial?: string;
};
const text = (r: Row, key: string) => String(r[key] ?? "");
const input =
  "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm";
function Editor({
  fields,
  initial,
  onSave,
  busy,
  label = "Save",
}: {
  fields: Field[];
  initial?: Row | null;
  onSave: (v: Record<string, string>) => Promise<void>;
  busy: boolean;
  label?: string;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        initial && initial[f.name] !== undefined
          ? String(initial[f.name])
          : f.initial || "",
      ]),
    ),
  );
  const request = useRef({ id: "", signature: "" });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const signature = JSON.stringify(values);
    if (request.current.signature !== signature)
      request.current = { id: crypto.randomUUID(), signature };
    await onSave({ ...values, request_id: request.current.id });
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <label className="block text-sm font-medium" key={f.name}>
            {f.label}
            {f.type === "textarea" ? (
              <textarea
                aria-label={f.label}
                className={input}
                required={!f.optional}
                maxLength={15000}
                rows={3}
                value={values[f.name]}
                onChange={(e) =>
                  setValues({ ...values, [f.name]: e.target.value })
                }
              />
            ) : f.options ? (
              <Select
                aria-label={f.label}
                className={input}
                required={!f.optional}
                value={values[f.name]}
                onChange={(e) =>
                  setValues({ ...values, [f.name]: e.target.value })
                }
              >
                <option value="">Select</option>
                {f.options.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            ) : (
              <input
                aria-label={f.label}
                className={input}
                type={f.type || "text"}
                required={!f.optional}
                value={values[f.name]}
                onChange={(e) =>
                  setValues({ ...values, [f.name]: e.target.value })
                }
              />
            )}
          </label>
        ))}
      </div>
      <button
        disabled={busy}
        className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Saving…" : label}
      </button>
    </form>
  );
}
function options(values: string[]) {
  return values.map((value) => ({ value, label: value.replaceAll("_", " ") }));
}
const sections = [
  {
    name: "Training",
    icon: CalendarDays,
    tabs: ["Sessions", "Bookings", "Educators", "Entitlements", "Credits"],
    description: "Schedule sessions and support your learners.",
  },
  {
    name: "Careers",
    icon: Briefcase,
    tabs: ["Jobs", "Applications", "Companies", "Internships", "Screening"],
    description: "Manage opportunities and review applications.",
  },
  {
    name: "Communications",
    icon: MessagesSquare,
    tabs: ["Webinars", "Announcements"],
    description: "Reach learners with webinars and course updates.",
  },
  {
    name: "Settings",
    icon: Settings2,
    tabs: ["Delivery"],
    description: "Monitor notification delivery and channel controls.",
  },
];
const taskCopy: Record<string, [string, string, string]> = {
  Sessions: [
    "New session",
    "Schedule a group clarification or a personal support slot.",
    "No sessions yet. Create a session to open booking for learners.",
  ],
  Bookings: [
    "",
    "Review bookings and mark attendance or cancellations.",
    "No bookings yet. Bookings appear after learners reserve a session.",
  ],
  Educators: [
    "Assign educator",
    "Choose who can run sessions for this course.",
    "No educators assigned to this course.",
  ],
  Entitlements: [
    "Manage access",
    "Grant or update a learner's Programme+ access.",
    "No Programme+ access records for this course.",
  ],
  Credits: [
    "Adjust credits",
    "Add or remove learner session credits with a recorded reason.",
    "",
  ],
  Jobs: [
    "New job",
    "Publish roles students can discover and apply for.",
    "No jobs yet. Add a company, then create your first role.",
  ],
  Applications: [
    "",
    "Track each candidate from application to outcome.",
    "No job applications yet.",
  ],
  Companies: [
    "Add company",
    "Maintain the companies offering roles to your learners.",
    "No companies yet. Add a recruitment partner to get started.",
  ],
  Internships: [
    "",
    "Review internship applications and mentor feedback.",
    "No internship applications yet.",
  ],
  Screening: [
    "Configure screening",
    "Select the published exams used for this course's screening.",
    "",
  ],
  Webinars: [
    "New webinar",
    "Schedule webinars and control their landing-page campaigns.",
    "No webinars yet. Create a draft campaign to get started.",
  ],
  Announcements: [
    "New announcement",
    "Send a course update to enrolled learners.",
    "No announcements for this course.",
  ],
  Delivery: [
    "",
    "Check email and push delivery, or pause a channel when needed.",
    "No delivery records yet.",
  ],
};
const sectionLabel = (value: string) =>
  (
    ({
      Entitlements: "Learner access",
      Credits: "Session credits",
      Delivery: "Notification delivery",
      Internships: "Internship reviews",
    }) as Record<string, string>
  )[value] || value;
function EditorDialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      aria-label={title}
      className="max-h-[90dvh] w-[min(800px,94vw)] overflow-y-auto rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-slate-900/40"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={close}
          aria-label="Close editor"
          className="rounded-lg p-2 hover:bg-slate-100"
        >
          <X size={20} />
        </button>
      </header>
      <div className="p-5 sm:p-6">{children}</div>
    </dialog>
  );
}
export default function ProgrammeWorkspace() {
  const [editorOpen, setEditorOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("Sessions"),
    [isAdmin, setAdmin] = useState(false),
    [courses, setCourses] = useState<Row[]>([]),
    [course, setCourse] = useState(""),
    [users, setUsers] = useState<Row[]>([]),
    [educators, setEducators] = useState<Row[]>([]),
    [companies, setCompanies] = useState<Row[]>([]),
    [rows, setRows] = useState<Row[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [edit, setEdit] = useState<Row | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [version, setVersion] = useState(0),
    [delivery, setDelivery] = useState<Record<string, unknown>>({});
  const [exams, setExams] = useState<Row[]>([]),
    [mentorReviews, setMentorReviews] = useState<Row[]>([]),
    [registrantCursor, setRegistrantCursor] = useState<string | null>(null);
  const [review, setReview] = useState<Row | null>(null),
    [registrants, setRegistrants] = useState<Row[]>([]),
    [campaign, setCampaign] = useState("");
  const [userCursor, setUserCursor] = useState<string | undefined>();
  const generation = useRef(0);
  useEffect(() => {
    let live = true;
    void programme
      .access()
      .then(async (access) => {
        if (!live) return;
        setAdmin(access.admin);
        const list = access.admin
          ? await api.getCourses()
          : access.courses.map((c) => ({ id: c.course_id, title: c.title }));
        if (live) {
          setCourses(list);
          setCourse(list[0]?.id || "");
        }
        if (access.admin) {
          const raw = await api.getUsers();
          if (live) {
            setUsers(raw.users || []);
            setUserCursor(raw.next_token);
          }
        }
      })
      .catch((e) => live && setError(errorMessage(e)));
    return () => {
      live = false;
    };
  }, []);
  const prefix = isAdmin ? "/admin/programme" : "/programme/staff";
  const load = useCallback(
    async (after?: string) => {
      if (
        !course &&
        [
          "Sessions",
          "Bookings",
          "Educators",
          "Credits",
          "Entitlements",
          "Announcements",
          "Screening",
        ].includes(tab)
      )
        return;
      const token = ++generation.current;
      const paths: Record<string, string> = {
        Sessions: "/sessions?course_id=" + course,
        Bookings: "/bookings?course_id=" + course,
        Educators: "/courses/" + course + "/educators",
        Entitlements: "/courses/" + course + "/entitlements",
        Companies: "/companies",
        Jobs: "/jobs?",
        Applications: "/applications?",
        Internships: "/internships?",
        Webinars: "/campaigns",
        Announcements: "/announcements?course_id=" + course,
        Delivery: "/deliveries?",
      };
      if (tab === "Screening") {
        const [settings, available] = await Promise.all([
          programme.request<Row>(
            "GET",
            prefix + "/courses/" + course + "/screening",
          ),
          programme.request<Row[]>(
            "GET",
            "/admin/courses/" + course + "/exams",
          ),
        ]);
        if (token === generation.current) {
          setExams(available);
          setEdit({ ...settings, id: "screening" });
          setRows([]);
        }
        return;
      }
      if (tab === "Credits") {
        setRows([]);
        return;
      }
      let path = paths[tab];
      if (!path) return;
      if (after)
        path +=
          (path.includes("?") ? "&" : "?") +
          "after=" +
          encodeURIComponent(after);
      const result = await programme.request<
        Row[] | ProgrammePage | Record<string, unknown>
      >("GET", prefix + path);
      if (token !== generation.current) return;
      const paged = result as ProgrammePage;
      setRows((old) =>
        after
          ? [...old, ...(paged.items || [])]
          : Array.isArray(result)
            ? result
            : paged.items || [],
      );
      setCursor(paged.next_cursor || null);
      if (tab === "Delivery") setDelivery(result as Record<string, unknown>);
      if (["Sessions", "Bookings"].includes(tab)) {
        const list = await programme.request<Row[]>(
          "GET",
          prefix + "/courses/" + course + "/educators",
        );
        if (token === generation.current) setEducators(list);
      }
      if (tab === "Jobs") {
        const list = await programme.request<Row[]>(
          "GET",
          prefix + "/companies",
        );
        if (token === generation.current) setCompanies(list);
      }
    },
    [course, tab, prefix],
  );
  useEffect(() => {
    setError("");
    let active = true;
    setLoading(true);
    void load()
      .catch((e) => active && setError(errorMessage(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [load, version]);
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice("Saved successfully.");
      setEditorOpen(false);
      setEdit(null);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const choose = (next: string) => {
    ++generation.current;
    setTab(next);
    setSearch("");
    setEditorOpen(false);
    setRows([]);
    setEdit(null);
    setCursor(null);
    setNotice("");
  };
  const courseOptions = courses.map((r) => ({
    value: r.id,
    label: text(r, "title"),
  }));
  const userOptions = users.map((r) => ({
    value: r.id,
    label: text(r, "name") + " " + text(r, "email"),
  }));
  const educatorOptions = educators
    .filter((r) => r.active)
    .map((r) => ({ value: text(r, "user_id"), label: text(r, "name") }));
  const f = (
    name: string,
    label: string,
    type?: string,
    initial?: string,
    optional = false,
  ): Field => ({ name, label, type, initial, optional });
  const fields: Record<string, Field[]> = {
    Sessions: [
      { name: "educator_id", label: "Educator", options: educatorOptions },
      f("kind", "Session type", undefined, "group"),
      f("title", "Title"),
      f("description", "Description", "textarea", "", true),
      f("timezone", "Time zone", undefined, "Asia/Kolkata"),
      f("starts_at", "Starts in selected time zone", "datetime-local"),
      f("ends_at", "Ends in selected time zone", "datetime-local"),
      {
        name: "ambiguity",
        label: "Daylight-saving overlap",
        initial: "reject",
        options: options(["reject", "earlier", "later"]),
      },
      f("capacity", "Seats", "number", "1"),
      f("meeting_url", "Meeting link", "url", "", true),
      {
        name: "status",
        label: "Status",
        initial: "published",
        options: options(["published", "cancelled"]),
      },
    ],
    Educators: [
      { name: "user_id", label: "Educator account", options: userOptions },
      {
        name: "active",
        label: "Assignment",
        initial: "true",
        options: [
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive" },
        ],
      },
    ],
    Screening: [
      {
        name: "aptitude_exam_id",
        label: "Aptitude exam",
        options: exams
          .filter((e) => e.published)
          .map((e) => ({ value: e.id, label: text(e, "title") })),
      },
      {
        name: "technical_exam_id",
        label: "Technical exam",
        options: exams
          .filter((e) => e.published)
          .map((e) => ({ value: e.id, label: text(e, "title") })),
      },
    ],
    Entitlements: [
      { name: "user_id", label: "Learner", options: userOptions },
      {
        name: "active",
        label: "Programme access",
        initial: "true",
        options: options(["true", "false"]),
      },
      f("timezone", "Expiry time zone", undefined, "Asia/Kolkata"),
      f("expires_at", "Expiry (optional)", "datetime-local", "", true),
      f("reason", "Reason", "textarea"),
    ],
    Credits: [
      { name: "user_id", label: "Learner", options: userOptions },
      {
        name: "kind",
        label: "Benefit",
        initial: "handholding",
        options: options(["handholding", "ai_interview"]),
      },
      f("delta", "Credit adjustment (+ or -)", "number"),
      f("reason", "Reason", "textarea"),
    ],
    Announcements: [
      f("title", "Announcement title"),
      f("body", "Message", "textarea"),
    ],
    Companies: [
      f("name", "Company name"),
      f("website", "Website", "url", "", true),
      f("description", "Description", "textarea", "", true),
      {
        name: "active",
        label: "Status",
        initial: "true",
        options: [
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive" },
        ],
      },
    ],
    Jobs: [
      {
        name: "company_id",
        label: "Company",
        options: companies.map((r) => ({
          value: r.id,
          label: text(r, "name"),
        })),
      },
      f("title", "Job title"),
      f("description", "Description", "textarea"),
      f("location", "Location"),
      f("partner", "Recruitment / consultancy partner", undefined, "", true),
      {
        name: "work_mode",
        label: "Work mode",
        initial: "onsite",
        options: options(["onsite", "hybrid", "remote"]),
      },
      {
        name: "employment_type",
        label: "Employment type",
        initial: "full_time",
        options: options(["full_time", "contract", "internship"]),
      },
      f("experience_min", "Minimum experience (years)", "number", "0"),
      f("experience_max", "Maximum experience (years)", "number", "0"),
      f("salary_min", "Minimum annual salary", "number", "", true),
      f("salary_max", "Maximum annual salary", "number", "", true),
      {
        name: "salary_currency",
        label: "Salary currency",
        initial: "INR",
        options: options([
          "INR",
          "USD",
          "GBP",
          "EUR",
          "AED",
          "SGD",
          "CAD",
          "AUD",
        ]),
      },
      {
        name: "remote",
        label: "Remote role",
        initial: "false",
        options: options(["true", "false"]),
      },
      f("skills", "Skills, separated by commas", undefined, "", true),
      f(
        "apply_url",
        "External application link (leave blank for in-app applications)",
        "url",
        "",
        true,
      ),
      f("timezone", "Deadline time zone", undefined, "Asia/Kolkata"),
      f("deadline", "Application deadline", "datetime-local"),
      {
        name: "status",
        label: "Status",
        initial: "draft",
        options: options(["draft", "published", "archived"]),
      },
    ],
    Webinars: [
      f("title", "Webinar title"),
      f("body", "Message", "textarea"),
      f("speakers", "Speakers", undefined, "", true),
      f("timezone", "Time zone", undefined, "Asia/Kolkata"),
      f("starts_at", "Webinar starts", "datetime-local"),
      f("ends_at", "Webinar ends", "datetime-local"),
      f("display_from", "Show campaign from", "datetime-local"),
      f("display_until", "Hide campaign after", "datetime-local"),
      f("delay_seconds", "Show after seconds", "number", "15"),
      f("frequency_hours", "Repeat no more often than hours", "number", "24"),
      {
        name: "variant",
        label: "Presentation",
        initial: "modal",
        options: options(["modal", "toast"]),
      },
      f("meeting_url", "Registered attendee join link", "url", "", true),
      {
        name: "status",
        label: "Status",
        initial: "draft",
        options: options(["draft", "published", "paused", "cancelled"]),
      },
    ],
  };
  if (fields.Sessions)
    fields.Sessions[1] = {
      name: "kind",
      label: "Session type",
      initial: "group",
      options: options(["group", "handholding", "internship_interview"]),
    };
  const initial: Row | null = edit
    ? {
        ...edit,
        skills: Array.isArray(edit.skills)
          ? edit.skills.join(", ")
          : edit.skills,
      }
    : null;
  if (initial)
    for (const key of [
      "starts_at",
      "ends_at",
      "display_from",
      "display_until",
      "deadline",
      "expires_at",
    ])
      if (initial[key])
        initial[key] = isoToZonedInput(
          String(initial[key]),
          String(initial.timezone || "Asia/Kolkata"),
        );
  const save = async (values: Record<string, string>) =>
    act(async () => {
      const body: Record<string, unknown> = {
        ...values,
        request_id: values.request_id || crypto.randomUUID(),
      };
      for (const k of [
        "capacity",
        "delta",
        "delay_seconds",
        "frequency_hours",
        "experience_min",
        "experience_max",
      ])
        if (k in body) body[k] = Number(body[k]);
      for (const k of ["salary_min", "salary_max"])
        if (k in body) body[k] = body[k] === "" ? null : Number(body[k]);
      for (const k of ["active", "remote"])
        if (k in body) body[k] = body[k] === "true";
      if ("skills" in body)
        body.skills = String(body.skills)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      for (const k of [
        "starts_at",
        "ends_at",
        "display_from",
        "display_until",
        "deadline",
        "expires_at",
      ])
        if (body[k])
          body[k] = zonedInputToIso(
            String(body[k]),
            String(body.timezone || "Asia/Kolkata"),
            (values.ambiguity || "reject") as "reject" | "earlier" | "later",
          );
      delete body.ambiguity;
      const resource: Record<string, string> = {
        Sessions: "sessions",
        Companies: "companies",
        Jobs: "jobs",
        Webinars: "campaigns",
      };
      let path = prefix + "/" + resource[tab],
        method: "POST" | "PUT" = "POST";
      if (["Sessions"].includes(tab)) body.course_id = course;
      if (tab === "Educators") {
        path = prefix + "/courses/" + course + "/educators";
        method = "PUT";
      }
      if (tab === "Screening") {
        path = prefix + "/courses/" + course + "/screening";
        method = "PUT";
      }
      if (tab === "Announcements") {
        path = prefix + "/announcements";
        body.course_id = course;
      }
      if (tab === "Entitlements") {
        path = prefix + "/courses/" + course + "/entitlements";
        method = "PUT";
      }
      if (tab === "Credits") path = prefix + "/courses/" + course + "/credits";
      if (edit && resource[tab]) {
        path += "/" + edit.id;
        method = "PUT";
      }
      await programme.request(method, path, body);
    });
  const editRow = (r: Row) => {
    setEdit(r);
    setEditorOpen(true);
  };
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary-700">
            Learner experience
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Programme+ workspace
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sessions, careers and communications, in one place.
          </p>
        </div>
      </header>
      <nav
        className="grid grid-cols-2 gap-2 rounded-2xl border bg-white p-2 lg:grid-cols-4"
        aria-label="Programme areas"
      >
        {sections
          .filter(
            (section) =>
              isAdmin ||
              section.tabs.some((t) =>
                ["Sessions", "Bookings", "Announcements"].includes(t),
              ),
          )
          .map((section) => {
            const active = section.tabs.includes(tab);
            const Icon = section.icon;
            return (
              <button
                key={section.name}
                aria-pressed={active}
                onClick={() =>
                  choose(
                    section.tabs.find(
                      (t) =>
                        isAdmin ||
                        ["Sessions", "Bookings", "Announcements"].includes(t),
                    )!,
                  )
                }
                className={`flex items-center gap-2 rounded-xl px-3 py-3 text-left transition ${active ? "bg-primary-50 text-primary-800 ring-1 ring-inset ring-primary-200" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon size={18} aria-hidden="true" className="shrink-0" />
                <span className="font-semibold text-xs sm:text-sm">
                  {section.name}
                </span>
              </button>
            );
          })}
      </nav>
      <section className="rounded-2xl border bg-white p-4 sm:p-5">
        <nav
          className="flex gap-1 overflow-x-auto border-b pb-3"
          aria-label="Programme sections"
        >
          {sections
            .find((section) => section.tabs.includes(tab))!
            .tabs.filter(
              (t) =>
                isAdmin ||
                ["Sessions", "Bookings", "Announcements"].includes(t),
            )
            .map((t) => (
              <button
                key={t}
                aria-pressed={tab === t}
                onClick={() => choose(t)}
                className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${tab === t ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {sectionLabel(t)}
              </button>
            ))}
        </nav>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{sectionLabel(tab)}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {taskCopy[tab][1]}
            </p>
          </div>
          {fields[tab] && (
            <button
              disabled={
                busy ||
                loading ||
                ([
                  "Sessions",
                  "Educators",
                  "Credits",
                  "Entitlements",
                  "Announcements",
                  "Screening",
                ].includes(tab) &&
                  !course)
              }
              onClick={() => {
                if (tab !== "Screening") setEdit(null);
                setEditorOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Plus size={16} />
              {taskCopy[tab][0]}
            </button>
          )}
        </div>
      </section>
      {[
        "Sessions",
        "Bookings",
        "Educators",
        "Credits",
        "Entitlements",
        "Announcements",
        "Screening",
      ].includes(tab) && (
        <label className="block max-w-lg text-sm font-medium">
          Course
          <Select
            aria-label="Course"
            className={input}
            value={course}
            onChange={(e) => {
              setCourse(e.target.value);
              setEdit(null);
            }}
          >
            {courseOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </label>
      )}
      {isAdmin &&
        ["Educators", "Credits", "Entitlements", "Internships"].includes(tab) &&
        userCursor && (
          <button
            className="text-sm underline"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const result = await api.getUsers("All", userCursor);
                setUsers((old) => [
                  ...old,
                  ...result.users.filter(
                    (u: Row) => !old.some((item) => item.id === u.id),
                  ),
                ]);
                setUserCursor(result.next_token);
              })
            }
          >
            Load more accounts
          </button>
        )}
      {error && !editorOpen && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">
          {notice}
        </p>
      )}
      {tab === "Sessions" && (
        <p className="text-sm text-gray-600">
          Handholding slots are 30 minutes, one seat. Cancellation at least 24
          hours ahead refunds a learner credit; staff cancellation refunds it
          regardless of timing.
        </p>
      )}
      {fields[tab] && editorOpen && (
        <EditorDialog
          title={edit ? `Edit ${tab.toLowerCase()}` : taskCopy[tab][0]}
          close={() => {
            setEditorOpen(false);
            setEdit(null);
          }}
        >
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </p>
          )}
          <p className="mb-5 text-sm text-slate-500">{taskCopy[tab][1]}</p>
          {tab === "Sessions" && !educatorOptions.length && (
            <p className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              No educator is assigned to this course.{" "}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => choose("Educators")}
                  className="font-semibold underline"
                >
                  Assign an educator first
                </button>
              ) : (
                "Ask an administrator to assign an educator before scheduling."
              )}
            </p>
          )}
          {tab === "Jobs" && !companies.length && (
            <p className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Add a company before publishing a role.{" "}
              <button
                type="button"
                onClick={() => choose("Companies")}
                className="font-semibold underline"
              >
                Go to companies
              </button>
            </p>
          )}
          <Editor
            key={`${tab}-${course}-${edit?.id || "new"}-${version}`}
            fields={fields[tab]}
            initial={initial}
            onSave={save}
            busy={busy}
          />
        </EditorDialog>
      )}
      {tab === "Entitlements" && (
        <p className="text-sm text-gray-600">
          {rows.length} entitlements loaded. Balances are granted once per
          enrolled course; disabling access does not reset consumed credits.
        </p>
      )}
      {tab === "Screening" && !loading && (
        <section className="grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-2">
          {["aptitude_exam_id", "technical_exam_id"].map((key) => (
            <div key={key}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {key === "aptitude_exam_id"
                  ? "Aptitude exam"
                  : "Technical exam"}
              </p>
              <p className="mt-2 font-medium">
                {(exams.find((e) => e.id === edit?.[key])?.title as string) ||
                  "Not configured"}
              </p>
            </div>
          ))}
        </section>
      )}
      {tab === "Credits" && (
        <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">
          Choose <strong>Adjust credits</strong> to update a learner's balance.
          Each adjustment requires a reason and is kept in the activity record.
        </div>
      )}
      {tab === "Delivery" && (
        <section className="flex flex-wrap gap-3">
          {["email", "push"].map((channel) => {
            const controls = (delivery.controls || []) as Row[];
            const paused = controls.some(
              (c) => c.channel === channel && c.paused,
            );
            return (
              <button
                key={channel}
                className="rounded border bg-white px-4 py-2 text-sm"
                disabled={busy}
                onClick={() =>
                  void act(() =>
                    programme.request("PATCH", prefix + "/delivery-controls", {
                      channel,
                      paused: !paused,
                      reason: paused
                        ? "Resumed by administrator"
                        : "Paused by administrator",
                    }),
                  )
                }
              >
                {paused ? "Resume" : "Pause"} {channel}
              </button>
            );
          })}
        </section>
      )}
      {tab === "Delivery" && (
        <div className="rounded-xl border bg-white p-4 text-sm">
          Email delivery:{" "}
          {delivery.email_enabled ? "enabled" : "waiting for Resend activation"}{" "}
          · Native push:{" "}
          {delivery.push_enabled
            ? "configured"
            : "waiting for app configuration"}
          . Provider acceptance does not prove that the recipient read the
          message.
        </div>
      )}
      {!["Credits", "Screening"].includes(tab) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {loading
              ? "Loading records…"
              : `${rows.length} ${rows.length === 1 ? "record" : "records"}${cursor ? " loaded" : ""}`}
          </p>
          <label className="relative block w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-3 text-slate-400"
              aria-hidden="true"
            />
            <input
              aria-label={`Search ${sectionLabel(tab).toLowerCase()}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${sectionLabel(tab).toLowerCase()}…`}
              className="w-full rounded-lg border bg-white py-2.5 pl-9 pr-3 text-sm"
            />
          </label>
        </div>
      )}
      <div className="space-y-3" aria-busy={loading}>
        {rows
          .filter(
            (r) =>
              !search ||
              Object.values(r).some((value) =>
                String(value ?? "")
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              ),
          )
          .map((r) => (
            <article
              key={r.id || text(r, "user_id")}
              className="rounded-xl border bg-white p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">
                    {text(r, "title") ||
                      text(r, "name") ||
                      text(r, "applicant_name") ||
                      text(r, "email") ||
                      text(r, "topic") ||
                      "Record"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {[
                      text(r, "company_name"),
                      text(r, "kind"),
                      text(r, "status"),
                      text(r, "educator_name"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {r.starts_at ? (
                    <p className="mt-2 text-sm">
                      {new Intl.DateTimeFormat(undefined, {
                        timeZone: String(r.timezone),
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(String(r.starts_at)))}{" "}
                      –{" "}
                      {new Intl.DateTimeFormat(undefined, {
                        timeZone: String(r.timezone),
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(String(r.ends_at)))}{" "}
                      ({text(r, "timezone")})
                    </p>
                  ) : null}
                  {r.capacity ? (
                    <p className="text-sm">
                      {text(r, "booked") || "0"} / {text(r, "capacity")} seats
                      booked
                    </p>
                  ) : null}
                  {r.applicant_email ? (
                    <p className="text-sm">{text(r, "applicant_email")}</p>
                  ) : null}
                  {r.error_code ? (
                    <p className="text-sm text-red-700">
                      {text(r, "error_code")}
                    </p>
                  ) : null}
                  {tab === "Webinars" && (
                    <p className="text-sm">
                      {text(r, "registrations")} registrations ·{" "}
                      {text(r, "impressions")} impressions · {text(r, "clicks")}{" "}
                      clicks
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {["Sessions", "Companies", "Jobs", "Webinars"].includes(
                    tab,
                  ) && (
                    <button
                      className="rounded-lg border px-3 py-2 text-sm"
                      onClick={() => editRow(r)}
                    >
                      Edit
                    </button>
                  )}
                  {tab === "Announcements" &&
                    text(r, "status") === "pending" && (
                      <button
                        disabled={busy}
                        className="rounded-lg border px-3 py-2 text-sm"
                        onClick={() =>
                          void act(() =>
                            programme.request(
                              "PATCH",
                              prefix + "/announcements/" + r.id,
                              {
                                status: "cancelled",
                                reason: "Cancelled in Programme workspace",
                              },
                            ),
                          )
                        }
                      >
                        Cancel pending sends
                      </button>
                    )}
                  {tab === "Bookings" &&
                    text(r, "status") === "confirmed" &&
                    ["completed", "no_show", "cancelled"].map((state) => (
                      <button
                        disabled={busy}
                        className="rounded-lg border px-3 py-2 text-sm"
                        key={state}
                        onClick={() =>
                          void act(() =>
                            programme.request(
                              "PATCH",
                              prefix + "/bookings/" + r.id,
                              { status: state },
                            ),
                          )
                        }
                      >
                        {state.replace("_", " ")}
                      </button>
                    ))}
                  {tab === "Applications" && (
                    <Select
                      aria-label="Application status"
                      className="rounded border p-2 text-sm"
                      value={text(r, "status")}
                      disabled={busy}
                      onChange={(e) =>
                        void act(() =>
                          programme.request(
                            "PATCH",
                            prefix + "/applications/" + r.id,
                            { status: e.target.value },
                          ),
                        )
                      }
                    >
                      {options([
                        "submitted",
                        "reviewing",
                        "shortlisted",
                        "forwarded",
                        "interview",
                        "offered",
                        "rejected",
                        "withdrawn",
                      ]).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  )}
                  {tab === "Webinars" && (
                    <button
                      className="rounded-lg border px-3 py-2 text-sm"
                      onClick={() =>
                        void act(async () => {
                          const response =
                            await programme.request<ProgrammePage>(
                              "GET",
                              prefix + "/campaigns/" + r.id + "/registrations",
                            );
                          setRegistrants(response.items);
                          setRegistrantCursor(response.next_cursor);
                          setCampaign(r.id);
                        })
                      }
                    >
                      View registrants
                    </button>
                  )}
                  {tab === "Internships" && (
                    <button
                      className="rounded-lg border px-3 py-2 text-sm"
                      onClick={() => {
                        setReview(r);
                        void programme
                          .request<Row[]>(
                            "GET",
                            prefix + "/internships/" + r.id + "/reviews",
                          )
                          .then(setMentorReviews)
                          .catch((e) => setError(errorMessage(e)));
                      }}
                    >
                      Review application
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
      </div>
      {cursor && (
        <button
          disabled={busy}
          className="rounded-lg border px-4 py-2"
          onClick={() => {
            setBusy(true);
            void load(cursor)
              .catch((e) => setError(errorMessage(e)))
              .finally(() => setBusy(false));
          }}
        >
          Load more
        </button>
      )}
      {!loading && !rows.length && !["Credits", "Screening"].includes(tab) && (
        <div className="rounded-2xl border border-dashed bg-white px-6 py-12 text-center">
          <h3 className="font-semibold text-slate-800">{taskCopy[tab][2]}</h3>
          <p className="mt-2 text-sm text-slate-500">
            {fields[tab]
              ? `Use "${taskCopy[tab][0]}" above to get started.`
              : "Select another course or return later."}
          </p>
        </div>
      )}
      {search &&
        rows.length > 0 &&
        !rows.some((r) =>
          Object.values(r).some((value) =>
            String(value ?? "")
              .toLowerCase()
              .includes(search.toLowerCase()),
          ),
        ) && (
          <p className="rounded-xl border bg-white p-6 text-sm text-slate-500">
            No matches in the loaded records. Try a different search
            {cursor ? " or load more records" : ""}.
          </p>
        )}
      {review && (
        <div className="rounded-xl border p-4">
          <h2 className="mb-3 font-semibold">
            Internship review for {text(review, "name")}
          </h2>
          <Editor
            key={review.id}
            busy={busy}
            initial={review}
            fields={[
              {
                name: "status",
                label: "Status",
                options: options([
                  "submitted",
                  "screening",
                  "interview",
                  "accepted",
                  "rejected",
                  "completed",
                ]),
              },
              f("project", "Project", "textarea", "", true),
              {
                name: "mentor_id",
                label: "Mentor",
                optional: true,
                options: userOptions,
              },
              f("review_note", "Staff review note", "textarea", "", true),
            ]}
            onSave={(v) =>
              act(async () => {
                await programme.request(
                  "PATCH",
                  prefix + "/internships/" + review.id,
                  v,
                );
                setReview(null);
              })
            }
          />
          <h3 className="mt-5 font-semibold">Mentor feedback</h3>
          {mentorReviews.map((r) => (
            <p key={r.id} className="mt-2 text-sm">
              {text(r, "rating")}/100 · {text(r, "note")}
            </p>
          ))}
          <Editor
            key={"mentor-" + review.id}
            busy={busy}
            fields={[
              f("note", "Feedback for the learner", "textarea"),
              f("rating", "Review score (0–100)", "number"),
            ]}
            onSave={(v) =>
              act(async () => {
                await programme.request(
                  "POST",
                  prefix + "/internships/" + review.id + "/reviews",
                  { ...v, rating: Number(v.rating) },
                );
                setMentorReviews(
                  await programme.request<Row[]>(
                    "GET",
                    prefix + "/internships/" + review.id + "/reviews",
                  ),
                );
              })
            }
          />
          {text(review, "status") === "completed" && (
            <>
              <button
                className="mt-3 rounded border px-4 py-2 text-sm"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const result = await programme.request<{ id: string }>(
                      "POST",
                      prefix + "/internships/" + review.id + "/certificate",
                      {},
                    );
                    setNotice("Certificate ready: " + result.id);
                  })
                }
              >
                Issue internship certificate
              </button>
              <h3 className="mt-5 font-semibold">Recommendation letter</h3>
              <Editor
                key={"letter-" + review.id}
                busy={busy}
                fields={[
                  f("body", "Approved recommendation text", "textarea"),
                  f("signer", "Authorized signer"),
                ]}
                label="Issue recommendation letter"
                onSave={(v) =>
                  act(async () => {
                    const result = await programme.request<{ url: string }>(
                      "POST",
                      prefix + "/internships/" + review.id + "/letter",
                      v,
                    );
                    window.open(result.url, "_blank", "noopener,noreferrer");
                  })
                }
              />
            </>
          )}
        </div>
      )}
      {campaign && (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold">Webinar registrants</h2>
          <button className="text-sm underline" onClick={() => setCampaign("")}>
            Close registrants
          </button>
          <button
            className="ml-4 text-sm underline"
            onClick={() => {
              const cell = (v: unknown) =>
                '\"' +
                String(v ?? "")
                  .replace(/^[=+@\-\t\r]/, "'$&")
                  .replaceAll('\"', '\"\"') +
                '\"';
              const csv = [
                ["Name", "Email", "Status"],
                ...registrants.map((r) => [r.name, r.email, r.status]),
              ]
                .map((row) => row.map(cell).join(","))
                .join("\r\n");
              const url = URL.createObjectURL(
                new Blob([csv], { type: "text/csv" }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "webinar-registrants.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export listed registrants
          </button>
          {registrantCursor && (
            <button
              className="ml-4 text-sm underline"
              onClick={() =>
                void act(async () => {
                  const response = await programme.request<ProgrammePage>(
                    "GET",
                    prefix +
                      "/campaigns/" +
                      campaign +
                      "/registrations?after=" +
                      registrantCursor,
                  );
                  setRegistrants((old) => [...old, ...response.items]);
                  setRegistrantCursor(response.next_cursor);
                })
              }
            >
              Load more registrants
            </button>
          )}
          {registrants.map((r) => (
            <div
              key={r.id}
              className="mt-3 flex flex-wrap justify-between gap-2 border-t pt-3"
            >
              <span>
                {text(r, "name")} · {text(r, "email")} · {text(r, "status")}
              </span>
              <Select
                aria-label="Registration status"
                value={text(r, "status")}
                onChange={(e) =>
                  void act(async () => {
                    await programme.request(
                      "PATCH",
                      prefix +
                        "/campaigns/" +
                        campaign +
                        "/registrations/" +
                        r.id,
                      { status: e.target.value },
                    );
                    const response = await programme.request<ProgrammePage>(
                      "GET",
                      prefix + "/campaigns/" + campaign + "/registrations",
                    );
                    setRegistrants(response.items);
                  })
                }
              >
                {options([
                  "registered",
                  "cancelled",
                  "attended",
                  "no_show",
                ]).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
