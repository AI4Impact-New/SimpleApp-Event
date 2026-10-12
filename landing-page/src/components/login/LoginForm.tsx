"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/core/Button";
import { Checkbox } from "@/components/forms/Checkbox";
import { Input } from "@/components/forms/Input";

/** Student sign-in form. Auth isn't wired yet, so submit only shows a notice. */
export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-(--space-5)">
      <Input
        theme="light"
        label="Email or student ID"
        name="identifier"
        autoComplete="username"
        placeholder="you@example.com or AI4I-2026-0001"
        required
      />
      <label className="flex min-w-0 flex-col gap-(--space-2)">
        <span className="flex items-baseline justify-between gap-(--space-4)">
          <span className="text-(length:--fs-sm) font-medium leading-(--lh-snug) text-(--text-strong)">Password</span>
          <a
            href="#"
            className="text-(length:--fs-xs) leading-(--lh-snug) text-(--text-body) hover:text-(--text-strong)"
          >
            Forgot password?
          </a>
        </span>
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-(--h-input) w-full rounded-(--radius-input) border border-(--border-default) bg-(--surface-card) pr-(--space-10) pl-(--space-3) text-(length:--fs-sm) leading-none text-(--text-strong) outline-none transition-colors duration-(--dur-base) ease-(--ease-out) focus:border-(--teal-500)"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-(--space-2) flex size-(--space-6) -translate-y-1/2 cursor-pointer items-center justify-center rounded-(--radius-xs) text-(--text-strong) hover:text-(--text-accent)"
          >
            {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        </span>
      </label>
      <Checkbox theme="light" name="remember" checked={remember} onChange={setRemember}>
        <span className="text-(length:--fs-sm) text-(--text-strong)">Keep me signed in on this device</span>
      </Checkbox>
      <Button variant="primary" fullWidth leadingIcon={LogIn} type="submit">
        Sign in
      </Button>
      <p aria-live="polite" className="text-(length:--fs-xs) leading-(--lh-body) text-(--text-body)">
        {submitted ? "The learner portal isn’t live yet. Check your enrolment email for access details." : null}
      </p>
    </form>
  );
}
