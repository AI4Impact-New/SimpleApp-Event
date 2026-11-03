"use client";
import { FormEvent, useEffect, useRef, useState } from "react";
type Campaign = {
  id: string;
  title: string;
  body: string;
  speakers: string;
  starts_at: string;
  ends_at: string;
  timezone: string;
  display_until: string;
  delay_seconds: number;
  variant: "modal" | "toast";
  frequency_hours: number;
  version: number;
};
const base = (
  process.env.NEXT_PUBLIC_API_URL ||
  "https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com"
).replace(/\/$/, "");
export function WebinarCampaign() {
  const [campaign, setCampaign] = useState<Campaign | null>(null),
    [visible, setVisible] = useState(false),
    [register, setRegister] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    seen = useRef(""),
    request = useRef({ id: "", signature: "" }),
    dialog = useRef<HTMLDialogElement>(null),
    shownAt = useRef(0);
  const metric = (c: Campaign, event: string) => {
    void fetch(base + "/public/webinars/" + c.id + "/metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, event_id: crypto.randomUUID() }),
      keepalive: true,
    }).catch(() => {});
  };
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch(base + "/public/webinars", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) return;
        const { campaign: c } = (await response.json()) as {
          campaign: Campaign | null;
        };
        if (!active) return;
        const key = c ? c.id + ":" + c.version : "";
        if (!c || Date.parse(c.display_until) <= Date.now()) {
          setVisible(false);
          setRegister(false);
          setCampaign(null);
          if (timer.current) clearTimeout(timer.current);
          seen.current = "";
          return;
        }
        if (seen.current === key) return;
        if (timer.current) clearTimeout(timer.current);
        seen.current = key;
        setCampaign(c);
        setVisible(false);
        setRegister(false);
        setDone(false);
        let suppressed = false;
        try {
          suppressed =
            Number(localStorage.getItem("webinar-seen:" + c.id) || 0) >
            Date.now();
        } catch {}
        if (suppressed) return;
        const elapsed = shownAt.current ? Date.now() - shownAt.current : 0;
        timer.current = setTimeout(
          () => {
            if (active && Date.parse(c.display_until) > Date.now()) {
              setVisible(true);
              shownAt.current = Date.now();
              metric(c, "impression");
              try {
                localStorage.setItem(
                  "webinar-seen:" + c.id,
                  String(Date.now() + c.frequency_hours * 3600000),
                );
              } catch {}
            }
          },
          Math.max(0, c.delay_seconds * 1000 - elapsed),
        );
      } catch {
        /* A campaign outage must not block the website. */
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 30000);
    const expiry = setInterval(() => {
      setCampaign((old) => {
        if (old && Date.parse(old.display_until) <= Date.now()) {
          setVisible(false);
          setRegister(false);
          return null;
        }
        return old;
      });
    }, 1000);
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
      clearInterval(expiry);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (visible && (campaign?.variant === "modal" || register)) {
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
  }, [visible, campaign, register]);
  const close = () => {
    if (campaign) metric(campaign, "dismiss");
    setVisible(false);
    setRegister(false);
  };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!campaign) return;
    const form = new FormData(e.currentTarget);
    const signature = JSON.stringify(Array.from(form.entries()));
    if (signature !== request.current.signature)
      request.current = { id: crypto.randomUUID(), signature };
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        base + "/public/webinars/" + campaign.id + "/registrations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            request_id: request.current.id,
            version: campaign.version,
            name: form.get("name"),
            email: form.get("email"),
            phone: form.get("phone"),
            website: form.get("website"),
            consent: form.get("consent") === "on",
            utm_source:
              new URLSearchParams(location.search).get("utm_source") || "",
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || "Registration could not be saved. Please retry.",
        );
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const content = campaign && (
    <>
      <button
        type="button"
        onClick={close}
        aria-label="Close webinar invitation"
        className="absolute right-4 top-3 rounded p-2 text-xl"
      >
        ×
      </button>
      <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">
        Live webinar
      </p>
      <h2 id="webinar-title" className="mt-3 pr-7 text-xl font-bold">
        {campaign.title}
      </h2>
      <p className="mt-3 text-sm">{campaign.body}</p>
      <p className="mt-3 text-sm font-medium">
        {new Intl.DateTimeFormat(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZoneName: undefined,
        }).format(new Date(campaign.starts_at))}{" "}
        ({Intl.DateTimeFormat().resolvedOptions().timeZone})
      </p>
      {campaign.speakers && (
        <p className="mt-1 text-sm">With {campaign.speakers}</p>
      )}
      {!register ? (
        <button
          className="mt-5 rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white"
          onClick={() => {
            metric(campaign, "click");
            request.current = { id: "", signature: "" };
            setRegister(true);
          }}
        >
          Register free
        </button>
      ) : done ? (
        <p role="status" className="mt-5 rounded bg-teal-50 p-4">
          Registration received. The team will share joining details using the
          contact information provided.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-sm">
            Full name
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="block text-sm">
            Email
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="block text-sm">
            Phone (optional)
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={30}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <input
            name="website"
            aria-hidden="true"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
          />
          <label className="flex gap-2 text-xs">
            <input type="checkbox" name="consent" required />I agree to receive
            information about this webinar. See our{" "}
            <a className="underline" href="/privacy">
              privacy policy
            </a>
            .
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Confirm registration"}
          </button>
        </form>
      )}
    </>
  );
  if (!campaign || !visible) return null;
  return (
    <>
      {campaign.variant === "toast" && !register && (
        <aside
          aria-label="Webinar invitation"
          className="fixed right-4 top-24 z-40 max-h-[80vh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border bg-white p-6 text-slate-950 shadow-xl"
        >
          {content}
        </aside>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="webinar-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        className="fixed m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border bg-white p-6 text-slate-950 shadow-xl backdrop:bg-slate-950/50"
      >
        {content}
      </dialog>
    </>
  );
}
