"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/core/Button";
import { Card } from "@/components/core/Card";
import { Checkbox } from "@/components/forms/Checkbox";
import { Input } from "@/components/forms/Input";
import { Textarea } from "@/components/forms/Textarea";

/** Employer enquiry card on /hire-from-us. Light theme counterpart of the guidance form. */
export function HireRequestForm() {
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (consent) setSent(true);
  }

  return (
    <Card aria-live="polite" className="p-(--space-6) shadow-(--shadow-float) lg:p-(--space-8)">
      <h2 className="font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
        Tell us what you need
      </h2>
      <p className="mt-(--space-2) text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
        Our placement team responds within two working days.
      </p>
      {sent ? (
        <div className="mt-(--space-8) flex flex-col gap-(--space-3) py-(--space-8)">
          <span className="font-(family-name:--font-display) text-(length:--fs-h4) font-semibold leading-(--lh-snug) text-(--text-strong)">
            Request received.
          </span>
          <span className="text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
            Our placement team will be in touch shortly.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-(--space-6) flex flex-col gap-(--space-5)">
          <Input theme="light" label="Full name" name="name" autoComplete="name" required />
          <Input theme="light" label="Organisation" name="organisation" autoComplete="organization" required />
          <div className="grid gap-(--space-4) sm:grid-cols-2">
            <Input theme="light" label="Work email" name="email" type="email" autoComplete="email" required />
            <Input
              theme="light"
              label="Phone / WhatsApp"
              name="phone"
              type="tel"
              autoComplete="tel"
              defaultValue="+91"
              required
            />
          </div>
          <Textarea
            theme="light"
            label="Roles you are hiring for"
            name="roles"
            placeholder="e.g. 3 Data Engineers, 2 Data Analysts — Bengaluru / remote"
            required
          />
          <Checkbox theme="light" name="consent" checked={consent} onChange={setConsent}>
            I agree to be contacted by AI4Impact via call, SMS, email and WhatsApp about courses and services. My data
            is handled in line with the DPDP Act 2023.
          </Checkbox>
          <Button variant="primary" fullWidth disabled={!consent} type="submit">
            Request candidates
          </Button>
        </form>
      )}
    </Card>
  );
}
