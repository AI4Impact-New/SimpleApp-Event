"use client";

import { useState, useRef, type FormEvent } from "react";
import { Button } from "@/components/core/Button";
import { Card } from "@/components/core/Card";
import { Checkbox } from "@/components/forms/Checkbox";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";

/** Employer enquiry card on /hire-from-us. Light theme counterpart of the guidance form. */
export function HireRequestForm() {
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reference, setReference] = useState("");
  const retry = useRef<{ signature: string; id: string } | null>(null);
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!consent || busy) return;
    const f = new FormData(e.currentTarget);
    const details = {
      name: String(f.get("name") || "").trim(),
      email: String(f.get("email") || "").trim(),
      phone: String(f.get("phone") || "").trim(),
      organisation: String(f.get("organisation") || "").trim(),
      roles: String(f.get("roles") || "").trim(),
      consent,
      source_page: window.location.pathname,
      website: String(f.get("website") || ""),
    };
    const signature = JSON.stringify(details);
    if (!retry.current || retry.current.signature !== signature)
      retry.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const base =
        process.env.NEXT_PUBLIC_API_URL ||
        "https://ke8dywmhil.execute-api.ap-south-1.amazonaws.com";
      const r = await fetch(base.replace(/\/$/, "") + "/employer-enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, request_id: retry.current.id }),
      });
      const result = await r.json();
      if (!r.ok || !result.id)
        throw new Error(
          r.status === 429
            ? "Too many requests. Please wait and retry."
            : result.error || "Your request was not saved. Please retry.",
        );
      setReference(result.id);
      setSent(true);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Unable to connect. Please check your connection and retry."
          : e instanceof Error
            ? e.message
            : "Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      aria-live="polite"
      className="p-(--space-6) shadow-(--shadow-float) lg:p-(--space-8)"
    >
      <h2 className="font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
        Tell us what you need
      </h2>
      <p className="mt-(--space-2) text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
        Send your hiring requirements to our placement team.
      </p>
      {sent ? (
        <div className="mt-(--space-8) flex flex-col gap-(--space-3) py-(--space-8)">
          <span className="font-(family-name:--font-display) text-(length:--fs-h4) font-semibold leading-(--lh-snug) text-(--text-strong)">
            Request received.
          </span>
          <span className="text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
            Our placement team will follow up using your contact details.
          </span>
          <span className="text-xs break-all">Reference: {reference}</span>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-(--space-6) flex flex-col gap-(--space-5)"
        >
          <Input
            theme="light"
            label="Full name"
            name="name"
            autoComplete="name"
            minLength={2}
            maxLength={120}
            required
          />
          <Input
            theme="light"
            label="Organisation"
            name="organisation"
            autoComplete="organization"
            maxLength={255}
            required
          />
          <div className="grid gap-(--space-4) sm:grid-cols-2">
            <Input
              theme="light"
              label="Work email"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
            />
            <Input
              theme="light"
              label="Phone / WhatsApp"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue="+91"
              minLength={10}
              maxLength={30}
              pattern="[+0-9 ]{10,30}"
              required
            />
          </div>
          <Textarea
            theme="light"
            label="Roles you are hiring for"
            name="roles"
            maxLength={2000}
            placeholder="e.g. 3 Data Engineers, 2 Data Analysts — Bengaluru / remote"
            required
          />
          <Checkbox
            theme="light"
            name="consent"
            checked={consent}
            onChange={setConsent}
          >
            I agree to be contacted by AI4Impact via call, SMS, email and
            WhatsApp about courses and services. My data is handled in line with
            the DPDP Act 2023.
          </Checkbox>
          <input
            name="website"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            className="hidden"
          />
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-red-800 text-sm"
            >
              {error}
            </p>
          )}
          <Button
            variant="primary"
            fullWidth
            disabled={!consent || busy}
            type="submit"
          >
            {busy ? "Saving request…" : "Request candidates"}
          </Button>
        </form>
      )}
    </Card>
  );
}
