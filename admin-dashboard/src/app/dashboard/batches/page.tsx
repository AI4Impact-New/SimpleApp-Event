"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "@/services/api";
import { errorMessage } from "@/services/learning";

type Person = { id: string; name: string | null; email: string };
type Course = { id: string; title: string };
type Batch = {
  id: string;
  code: string;
  name: string | null;
  starts_on: string;
  ends_on: string | null;
  archived_at: string | null;
  trainers: Person[];
  student_count: number;
};
type Student = Person & {
  batch_id: string | null;
  batch_code: string | null;
  status: string;
};
type Roster = { items: Student[]; next: string | null };

const endpoint = "/admin/batches";
const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
const button =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50";
const primary =
  "rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50";
const panel = "rounded-xl border border-slate-200 bg-white p-4 sm:p-5";
const label = (batch: Batch) => batch.name || batch.code;

export default function BatchesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [course, setCourse] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [after, setAfter] = useState<string[]>([]);
  const [roster, setRoster] = useState<Roster>({ items: [], next: null });
  const [checked, setChecked] = useState<string[]>([]);
  const [destination, setDestination] = useState("");
  const [editor, setEditor] = useState<Batch | "new" | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const moveRequest = useRef({ signature: "", id: "" });

  useEffect(() => {
    let live = true;
    api
      .learningRequest<Course[]>("GET", endpoint + "/courses")
      .then((data) => {
        if (!live) return;
        setCourses(data);
        setCourse(data[0]?.id || "");
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!course) return;
    let live = true;
    api
      .learningRequest<Batch[]>(
        "GET",
        endpoint + "?include_archived=true&course_id=" + course,
      )
      .then((data) => {
        if (live) setBatches(data);
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      });
    return () => {
      live = false;
    };
  }, [course, refresh]);

  useEffect(() => {
    if (!course) return;
    let live = true;
    const query = new URLSearchParams({ course_id: course, search });
    if (scope === "unassigned") query.set("unassigned", "true");
    else if (scope !== "all") query.set("batch_id", scope);
    if (after.length) query.set("after", after[after.length - 1]);
    setLoading(true);
    const timer = window.setTimeout(() => {
      api
        .learningRequest<Roster>("GET", endpoint + "/roster?" + query)
        .then((data) => {
          if (live) setRoster(data);
        })
        .catch((e) => {
          if (live) {
            setRoster({ items: [], next: null });
            setError(errorMessage(e));
          }
        })
        .finally(() => {
          if (live) setLoading(false);
        });
    }, 180);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [course, scope, search, after, refresh]);

  function clearSelection() {
    moveRequest.current = { signature: "", id: "" };
    setChecked([]);
    setDestination("");
  }

  function selectScope(next: string) {
    clearSelection();
    setRoster({ items: [], next: null });
    setAfter([]);
    setScope(next);
  }

  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const activeBatch = batches.find((batch) => batch.id === scope);
  const selectedStudents = roster.items.filter((student) =>
    checked.includes(student.id),
  );

  return (
    <div className="space-y-5 text-slate-900">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
          <p className="mt-1 text-sm text-slate-600">
            Group enrolled students by course and assign trainers.
          </p>
        </div>
        <button
          className={primary}
          disabled={!course || busy || !!editor}
          onClick={() => setEditor("new")}
        >
          New batch
        </button>
      </header>
      <label className="flex max-w-md flex-col gap-1 text-sm font-medium">
        Course
        <select
          className={input}
          value={course}
          disabled={busy || !!editor}
          onChange={(e) => {
            selectScope("all");
            setBatches([]);
            setCourse(e.target.value);
          }}
        >
          {courses.length === 0 && (
            <option value="">No courses available</option>
          )}
          {courses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {notice}
        </p>
      )}
      {editor && (
        <BatchEditor
          key={editor === "new" ? "new" : editor.id}
          batch={editor === "new" ? undefined : editor}
          busy={busy}
          close={() => {
            setEditor(null);
            setError("");
          }}
          save={(values) =>
            run(async () => {
              const isNew = editor === "new";
              const saved = await api.learningRequest<Batch>(
                isNew ? "POST" : "PATCH",
                isNew ? endpoint : endpoint + "/" + editor.id,
                isNew ? { ...values, course_id: course } : values,
              );
              setEditor(null);
              selectScope(saved.id);
              setRefresh((n) => n + 1);
              setNotice(isNew ? "Batch created." : "Batch updated.");
            })
          }
        />
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(230px,1fr)_minmax(0,3fr)]">
        <aside className={panel} aria-label="Batch list">
          <div className="space-y-1">
            {[
              ["all", "All enrolled students"],
              ["unassigned", "Unassigned students"],
            ].map(([key, title]) => (
              <button
                key={key}
                className="block w-full rounded-lg p-2 text-left text-sm aria-pressed:bg-primary-50 aria-pressed:font-semibold"
                disabled={busy || !!editor}
                aria-pressed={scope === key}
                onClick={() => selectScope(key)}
              >
                {title}
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t pt-3">
            {batches.length === 0 && (
              <p className="px-2 text-sm text-slate-500">
                No batches for this course.
              </p>
            )}
            {batches.map((batch) => (
              <button
                key={batch.id}
                className="block w-full break-words rounded-lg p-2 text-left aria-pressed:bg-primary-50"
                disabled={busy || !!editor}
                aria-pressed={scope === batch.id}
                onClick={() => selectScope(batch.id)}
              >
                <span className="block text-sm font-semibold">
                  {label(batch)}
                </span>
                <span className="block text-xs text-slate-600">
                  {batch.code} · {batch.student_count} enrolled
                  {batch.archived_at ? " · Archived" : ""}
                </span>
              </button>
            ))}
          </div>
        </aside>
        <section className={panel} aria-label="Student roster">
          <div className="flex flex-wrap justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-xl font-semibold">
                {activeBatch
                  ? label(activeBatch)
                  : scope === "unassigned"
                    ? "Unassigned students"
                    : "All enrolled students"}
              </h2>
              {activeBatch && (
                <>
                  <p className="mt-1 break-words text-sm text-slate-600">
                    {activeBatch.code} · {activeBatch.starts_on}
                    {activeBatch.ends_on ? " to " + activeBatch.ends_on : ""}
                    {activeBatch.archived_at ? " · Archived" : ""}
                  </p>
                  <p className="mt-2 break-words text-sm">
                    {activeBatch.trainers.length
                      ? "Trainers · " +
                        activeBatch.trainers
                          .map(
                            (trainer, i) =>
                              (trainer.name || trainer.email) +
                              (i === 0 ? " (lead)" : ""),
                          )
                          .join(", ")
                      : "No trainers assigned"}
                  </p>
                </>
              )}
            </div>
            {activeBatch && (
              <div className="flex flex-wrap items-start gap-2">
                <button
                  className={button}
                  disabled={busy || !!editor}
                  onClick={() => setEditor(activeBatch)}
                >
                  Edit batch
                </button>
                <button
                  className={button}
                  disabled={busy || !!editor}
                  onClick={() =>
                    void run(async () => {
                      const archived = !activeBatch.archived_at;
                      await api.learningRequest(
                        "PATCH",
                        endpoint + "/" + activeBatch.id,
                        { archived },
                      );
                      setRefresh((n) => n + 1);
                      setNotice(
                        archived
                          ? "Batch archived. Its roster is available for transfers."
                          : "Batch restored.",
                      );
                    })
                  }
                >
                  {activeBatch.archived_at ? "Restore batch" : "Archive batch"}
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
              Search students
              <input
                className={input}
                placeholder="Name or email"
                value={search}
                disabled={busy}
                onChange={(e) => {
                  clearSelection();
                  setRoster({ items: [], next: null });
                  setAfter([]);
                  setSearch(e.target.value);
                }}
              />
            </label>
            {selectedStudents.length > 0 && (
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Move {selectedStudents.length} selected
                  <select
                    className={input}
                    value={destination}
                    disabled={busy}
                    onChange={(e) => setDestination(e.target.value)}
                  >
                    <option value="">Choose destination</option>
                    <option value="unassigned">Unassigned</option>
                    {batches
                      .filter((batch) => !batch.archived_at)
                      .map((batch) => (
                        <option key={batch.id} value={batch.id}>
                          {label(batch)} · {batch.code}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  className={primary}
                  disabled={busy || loading || !destination}
                  onClick={() =>
                    void run(async () => {
                      const payload = {
                        course_id: course,
                        batch_id:
                          destination === "unassigned" ? null : destination,
                        registrations: selectedStudents.map((student) => ({
                          id: student.id,
                          previous_batch_id: student.batch_id,
                        })),
                      };
                      const signature = JSON.stringify(payload);
                      if (moveRequest.current.signature !== signature) {
                        moveRequest.current = {
                          signature,
                          id: crypto.randomUUID(),
                        };
                      }
                      const result = await api.learningRequest<{
                        changed: number;
                      }>("POST", endpoint + "/assign", {
                        ...payload,
                        request_id: moveRequest.current.id,
                      });
                      clearSelection();
                      setRefresh((n) => n + 1);
                      setNotice(
                        result.changed
                          ? `${result.changed} student${result.changed === 1 ? "" : "s"} updated.`
                          : "The selected students are already in that destination.",
                      );
                    })
                  }
                >
                  Move students
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 overflow-x-auto" aria-busy={loading}>
            {loading ? (
              <p className="py-3 text-sm text-slate-600">Loading students…</p>
            ) : roster.items.length === 0 ? (
              <p className="py-3 text-sm text-slate-600">
                {search
                  ? "No students match your search."
                  : "No students in this view."}
              </p>
            ) : (
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead className="border-b text-slate-600">
                  <tr>
                    <th className="p-2">
                      <input
                        type="checkbox"
                        aria-label="Select all students on this page"
                        disabled={busy}
                        checked={checked.length === roster.items.length}
                        onChange={(e) =>
                          setChecked(
                            e.target.checked
                              ? roster.items.map((student) => student.id)
                              : [],
                          )
                        }
                      />
                    </th>
                    <th className="p-2">Student</th>
                    <th className="p-2">Batch ID</th>
                    <th className="p-2">Enrollment</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.items.map((student) => (
                    <tr key={student.id} className="border-b">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          aria-label={`Select ${student.name || student.email}`}
                          disabled={busy}
                          checked={checked.includes(student.id)}
                          onChange={(e) =>
                            setChecked((ids) =>
                              e.target.checked
                                ? [...ids, student.id]
                                : ids.filter((id) => id !== student.id),
                            )
                          }
                        />
                      </td>
                      <td className="p-2">
                        <span className="block font-medium">
                          {student.name || student.email}
                        </span>
                        {student.name && (
                          <span className="text-xs text-slate-600">
                            {student.email}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {student.batch_code || "Unassigned"}
                      </td>
                      <td className="p-2 capitalize">{student.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {(after.length > 0 || roster.next) && (
            <div className="mt-3 flex gap-2">
              <button
                className={button}
                disabled={busy || loading || !after.length}
                onClick={() => {
                  clearSelection();
                  setAfter((pages) => pages.slice(0, -1));
                }}
              >
                Previous page
              </button>
              <button
                className={button}
                disabled={busy || loading || !roster.next}
                onClick={() => {
                  clearSelection();
                  if (roster.next)
                    setAfter((pages) => [...pages, roster.next!]);
                }}
              >
                Next page
              </button>
            </div>
          )}
          <button
            className={button + " mt-3"}
            disabled={busy || loading}
            onClick={() => {
              clearSelection();
              setError("");
              setRefresh((n) => n + 1);
            }}
          >
            Refresh roster
          </button>
        </section>
      </div>
    </div>
  );
}

function BatchEditor({
  batch,
  busy,
  close,
  save,
}: {
  batch?: Batch;
  busy: boolean;
  close: () => void;
  save: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [trainers, setTrainers] = useState<Person[]>(batch?.trainers || []);
  const [matches, setMatches] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [trainerError, setTrainerError] = useState("");
  const [finding, setFinding] = useState(false);
  const request = useRef({ signature: "", id: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      ...values,
      trainer_ids: trainers.map((trainer) => trainer.id),
    };
    const signature = JSON.stringify(payload);
    if (signature !== request.current.signature)
      request.current = { signature, id: crypto.randomUUID() };
    await save(
      batch ? payload : { ...payload, request_id: request.current.id },
    );
  }

  return (
    <section className={panel} aria-label={batch ? "Edit batch" : "New batch"}>
      <h2 className="mb-4 text-xl font-semibold">
        {batch ? "Edit batch" : "New batch"}
      </h2>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Batch name
            <input
              className={input}
              name="name"
              defaultValue={batch ? label(batch) : ""}
              required
              maxLength={120}
            />
          </label>
          {!batch && (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Batch ID (optional)
              <input
                className={input}
                name="code"
                placeholder="Generated if left blank"
                maxLength={100}
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium">
            Start date
            <input
              className={input}
              type="date"
              name="starts_on"
              defaultValue={batch?.starts_on}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            End date (optional)
            <input
              className={input}
              type="date"
              name="ends_on"
              defaultValue={batch?.ends_on || ""}
            />
          </label>
        </fieldset>
        <div className="border-t pt-4">
          <h3 className="font-semibold">Trainers</h3>
          <p className="my-1 text-sm text-slate-600">
            The first trainer is the lead shown in the payments ledger.
          </p>
          <ul className="my-2 space-y-2">
            {trainers.map((trainer, index) => (
              <li
                key={trainer.id}
                className="flex flex-wrap items-center gap-2 text-sm"
              >
                <span>
                  {trainer.name || trainer.email}
                  {index === 0 ? " (lead)" : ""}
                </span>
                {index > 0 && (
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      setTrainers([
                        trainer,
                        ...trainers.filter((item) => item.id !== trainer.id),
                      ])
                    }
                  >
                    Make lead
                  </button>
                )}
                <button
                  type="button"
                  className={button}
                  disabled={busy}
                  aria-label={`Remove ${trainer.name || trainer.email}`}
                  onClick={() =>
                    setTrainers(
                      trainers.filter((item) => item.id !== trainer.id),
                    )
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Find trainers
              <input
                disabled={busy || finding}
                className={input}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setMatches([]);
                }}
              />
            </label>
            <button
              type="button"
              className={button}
              disabled={busy || finding || search.trim().length < 2}
              onClick={async () => {
                setFinding(true);
                setTrainerError("");
                try {
                  const data = await api.learningRequest<Person[]>(
                    "GET",
                    endpoint + "/trainers?search=" + encodeURIComponent(search),
                  );
                  setMatches(data);
                  if (!data.length) setTrainerError("No matching accounts.");
                } catch (e) {
                  setTrainerError(errorMessage(e));
                } finally {
                  setFinding(false);
                }
              }}
            >
              Find accounts
            </button>
          </div>
          {trainerError && (
            <p role="status" className="mt-2 text-sm text-slate-600">
              {trainerError}
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {matches
              .filter(
                (item) => !trainers.some((trainer) => trainer.id === item.id),
              )
              .map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    className={button + " break-all text-left"}
                    disabled={busy || trainers.length >= 20}
                    onClick={() => setTrainers([...trainers, person])}
                  >
                    Add {person.name ? person.name + " · " : ""}
                    {person.email}
                  </button>
                </li>
              ))}
          </ul>
        </div>
        <div className="flex gap-2">
          <button className={primary} disabled={busy}>
            {busy ? "Saving…" : "Save batch"}
          </button>
          <button
            type="button"
            className={button}
            disabled={busy}
            onClick={close}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
