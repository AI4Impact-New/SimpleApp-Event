"use client";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { errorMessage } from "@/services/learning";
export function MarketingAccess() {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [users, setUsers] = useState<{ email: string; name?: string }[]>([]);
  async function load() {
    const r = await api.learningRequest<{
      users: { email: string; name?: string }[];
    }>("GET", "/admin/marketing/users");
    setUsers(r.users);
  }
  useEffect(() => {
    void load().catch((e) => setError(errorMessage(e)));
  }, []);
  async function change(enabled: boolean) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api.learningRequest<{ message: string }>(
        "PUT",
        "/admin/marketing/users",
        { email: email.trim(), enabled },
      );
      setMessage(r.message);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-xl border bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold">Marketing-only access</h2>
      <p className="text-sm text-gray-600">
        Assign existing accounts to Marketing. Existing Admins privileges are unchanged by this control. Marketing members can see enquiry contacts and
        save follow-up notes; they cannot edit courses, enrol learners, manage
        fees or grant staff access.
      </p>
      <label className="block text-sm">
        Existing account email
        <input
          aria-label="Marketing account email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-lg border p-3"
        />
      </label>
      <div className="flex gap-3">
        <button
          disabled={busy || !email.trim()}
          onClick={() => void change(true)}
          className="rounded-lg bg-primary-600 text-white px-4 py-2 disabled:opacity-50"
        >
          Grant Marketing access
        </button>
        <button
          disabled={busy || !email.trim()}
          onClick={() => {
            if (confirm("Remove Marketing access for this account?"))
              void change(false);
          }}
          className="rounded-lg border px-4 py-2 disabled:opacity-50"
        >
          Remove Marketing access
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-green-800">
          {message}
        </p>
      )}
      <ul className="text-sm space-y-2">
        {users.map((u) => (
          <li key={u.email}>
            {u.name} · {u.email}
          </li>
        ))}
      </ul>
      {!users.length && (
        <p className="text-sm text-gray-500">
          No Marketing members assigned yet.
        </p>
      )}
    </section>
  );
}
