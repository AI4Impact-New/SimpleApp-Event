"use client";

import { useState, useRef, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/core/Button";
import { Eyebrow } from "@/components/core/Eyebrow";
import { Checkbox } from "@/components/forms/Checkbox";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { TRACKS } from "@/content/site";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/core/Card";

const CONTACT_EMAIL = "support@ai4impact.com";
// TODO: temporary number — replace with the permanent support line.
const CONTACT_PHONE = "+91 00000 00000";

const INTERESTS =["Not sure yet — help me choose", ...TRACKS.map((t) => t.title)];

const DEFAULT_TITLE = (
  <>
    Not sure which
    <br />
    role fits you?
  </>
);

export function GuidanceSection({ title = DEFAULT_TITLE }: { title?: ReactNode }) {
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const retry = useRef<{ signature: string; id: string } | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consent || busy) return;
    const form = new FormData(e.currentTarget);
    const details = { name: String(form.get("name") || "").trim(), email: String(form.get("email") || "").trim(), phone: String(form.get("phone") || "").trim(), interest: String(form.get("interest") || ""), consent, website: String(form.get("website") || ""), source_page: window.location.pathname };
    const signature = JSON.stringify(details);
    if (!retry.current || retry.current.signature !== signature) retry.current = { signature, id: crypto.randomUUID() };
    setBusy(true); setError("");
    try {
      const api = process.env.NEXT_PUBLIC_API_URL || "https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com";
      const response = await fetch(`${api.replace(/\/$/, "")}/enquiries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...details, request_id: retry.current.id }) });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(response.status === 429 ? "Too many requests. Please wait a moment and try again." : result.error || "Your request was not saved. Please try again.");
      }
      const result = await response.json();
      if (!result.id) throw new Error("Your request was not confirmed. Please try again.");
      setReference(result.id); setSent(true);
    } catch (cause) { setError(cause instanceof TypeError ? "Unable to connect. Check your connection and try again." : cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <Section id="guidance" tone="dark">
      <div className="grid items-start gap-(--space-12) lg:grid-cols-2 lg:gap-(--space-20)">
        <div className="pt-(--space-2)">
          <Eyebrow tone="promo">Free career guidance</Eyebrow>
          <h2 className="mt-(--space-5) font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-heading) tracking-(--ls-heading) text-(--text-on-dark) md:text-(length:--fs-h2)">
            {title}
          </h2>
          <p className="mt-(--space-5) max-w-lg text-(length:--fs-lead) leading-(--lh-body) text-(--text-on-dark-body)">
            Book a free 20-minute call. We look at your background and tell you honestly which track fits, or if
            none of them do yet.
          </p>
          <div className="mt-(--space-8) flex flex-col gap-(--space-2) text-(length:--fs-sm) leading-(--lh-body) text-(--text-on-dark-body)">
            <span className="font-medium text-(--text-on-dark)">Prefer to reach out directly?</span>
            <span>
              Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-(--text-on-dark) underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
            </span>
            <span>
              Call or WhatsApp{" "}
              <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`} className="font-medium text-(--text-on-dark) underline underline-offset-2">
                {CONTACT_PHONE}
              </a>
            </span>
          </div>
        </div>

        <Card theme="dark" aria-live="polite" className="p-(--space-8)">
          {sent ? (
            <div className="flex flex-col gap-(--space-3) py-(--space-10)">
              <span className="font-(family-name:--font-display) text-(length:--fs-h4) font-semibold leading-(--lh-snug) text-(--text-on-dark)">
                Request received.
              </span>
              <span className="text-(length:--fs-sm) leading-(--lh-body) text-(--text-on-dark-body)">
                We&apos;ll be in touch to schedule your call.
              </span>
              <span className="break-all text-xs text-(--text-on-dark-muted)">Reference: {reference}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-(--space-5)">
              <p className="text-xs text-(--text-on-dark-muted)">Fields marked * are required.</p>
              <Input label="Full name" name="name" autoComplete="name" required minLength={2} maxLength={120} />
              <div className="grid gap-(--space-4) sm:grid-cols-2">
                <Input label="Email" name="email" type="email" autoComplete="email" required maxLength={254} />
                <Input label="Phone / WhatsApp" name="phone" type="tel" autoComplete="tel" defaultValue="+91" required minLength={10} maxLength={30} pattern="[+0-9 ]{10,30}" />
              </div>
              <Select label="I'm interested in" name="interest" options={INTERESTS} />
              <Checkbox name="consent" checked={consent} onChange={setConsent}>
                I agree to be contacted by AI4Impact via call, SMS, email and WhatsApp about courses and services. My
                data is handled in line with the DPDP Act 2023.
              </Checkbox>
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
              {error && <p role="alert" className="rounded-lg border border-red-400 bg-red-950/30 p-3 text-sm text-red-100">{error}</p>}
              <Button variant="light" fullWidth disabled={!consent || busy} type="submit">
                {busy ? "Saving your request…" : "Book free career guidance"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </Section>
  );
}
