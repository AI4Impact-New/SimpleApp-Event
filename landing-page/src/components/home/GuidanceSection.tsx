"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/core/Button";
import { Eyebrow } from "@/components/core/Eyebrow";
import { Checkbox } from "@/components/forms/Checkbox";
import { Input } from "@/components/forms/Input";
import { Select } from "@/components/forms/Select";
import { TRACKS } from "./content";
import { Section } from "./Section";

const INTERESTS = ["Not sure yet — help me choose", ...TRACKS.map((t) => t.title)];

export function GuidanceSection() {
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (consent) setSent(true);
  }

  return (
    <Section id="guidance" tone="dark">
      <div className="grid items-start gap-(--space-12) lg:grid-cols-2 lg:gap-(--space-20)">
        <div className="pt-(--space-2)">
          <Eyebrow tone="promo">Free career guidance</Eyebrow>
          <h2 className="mt-(--space-5) font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-heading) tracking-(--ls-heading) text-(--text-on-dark) md:text-(length:--fs-h2)">
            Not sure which
            <br />
            role fits you?
          </h2>
          <p className="mt-(--space-5) max-w-lg text-(length:--fs-lead) leading-(--lh-body) text-(--text-on-dark-body)">
            Book a free 20-minute call. We look at your background and tell you honestly which track fits, or if
            none of them do yet.
          </p>
        </div>

        <div
          aria-live="polite"
          className="rounded-(--radius-3xl) border border-(--border-dark) bg-(--surface-dark-raised) px-(--space-8) py-(--space-8)"
        >
          {sent ? (
            <div className="flex flex-col gap-(--space-3) py-(--space-10)">
              <span className="font-(family-name:--font-display) text-(length:--fs-h4) font-semibold leading-(--lh-snug) text-(--text-on-dark)">
                Request received.
              </span>
              <span className="text-(length:--fs-sm) leading-(--lh-body) text-(--text-on-dark-body)">
                We&apos;ll be in touch to schedule your call.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-(--space-5)">
              <Input label="Full name" name="name" autoComplete="name" required />
              <div className="grid gap-(--space-4) sm:grid-cols-2">
                <Input label="Email" name="email" type="email" autoComplete="email" required />
                <Input label="Phone / WhatsApp" name="phone" type="tel" autoComplete="tel" defaultValue="+91" required />
              </div>
              <Select label="I'm interested in" name="interest" options={INTERESTS} />
              <Checkbox name="consent" checked={consent} onChange={setConsent}>
                I agree to be contacted by AI4Impact via call, SMS, email and WhatsApp about courses and services. My
                data is handled in line with the DPDP Act 2023.
              </Checkbox>
              <Button variant="light" fullWidth disabled={!consent} type="submit">
                Book free career guidance
              </Button>
            </form>
          )}
        </div>
      </div>
    </Section>
  );
}
