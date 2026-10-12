import { CalendarCheck, FolderGit2, MonitorPlay, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Eyebrow } from "@/components/core/Eyebrow";
import { Section } from "@/components/layout/Section";
import { LoginForm } from "@/components/login/LoginForm";
import { LOGIN_FEATURES } from "@/content/site";

export const metadata: Metadata = {
  title: "Student login · AI4Impact",
  description: "Enrolled students sign in here for course content, live calls, project reviews and career support.",
};

const FEATURE_ICONS = {
  recordings: MonitorPlay,
  calls: CalendarCheck,
  projects: FolderGit2,
  certificates: ShieldCheck,
};

export default function LoginPage() {
  return (
    <Section id="login" pad="sm">
      <div className="grid items-center gap-(--space-12) lg:grid-cols-[1.15fr_1fr] lg:gap-(--space-20)">
        <div className="rounded-(--radius-3xl) bg-(--bg-hero) p-(--space-8) lg:p-(--space-12)">
          <Eyebrow tone="promo" line={false}>
            Learner portal
          </Eyebrow>
          <h1 className="mt-(--space-5) font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-heading) tracking-(--ls-heading) text-(--text-on-dark)">
            Welcome back. Your next milestone is waiting.
          </h1>
          <p className="mt-(--space-4) text-(length:--fs-body) leading-(--lh-body) text-(--text-on-dark-body)">
            Enrolled students sign in here for course content, live calls, project reviews and career support.
          </p>
          <ul className="mt-(--space-8) grid gap-(--space-6) sm:grid-cols-2">
            {LOGIN_FEATURES.map(({ icon, title, body }) => {
              const Icon = FEATURE_ICONS[icon];
              return (
                <li key={title} className="flex gap-(--space-4)">
                  <span
                    aria-hidden
                    className="flex size-(--space-10) shrink-0 items-center justify-center rounded-(--radius-lg) bg-(--surface-dark-raised) text-(--text-promo)"
                  >
                    <Icon size={18} />
                  </span>
                  <div>
                    <h2 className="text-(length:--fs-body) font-medium leading-(--lh-snug) text-(--text-on-dark)">
                      {title}
                    </h2>
                    <p className="mt-(--space-1) text-(length:--fs-sm) leading-(--lh-body) text-(--text-on-dark-body)">
                      {body}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="max-w-md">
          <h2 className="font-(family-name:--font-display) text-(length:--fs-h4) font-bold leading-(--lh-snug) tracking-(--ls-heading) text-(--text-strong)">
            Student sign in
          </h2>
          <p className="mt-(--space-2) text-(length:--fs-body) leading-(--lh-body) text-(--text-body)">
            Use the email or student ID from your enrolment confirmation.
          </p>
          <div className="mt-(--space-8)">
            <LoginForm />
          </div>
          <p className="text-(length:--fs-sm) leading-(--lh-body) text-(--text-body)">
            Not enrolled yet?{" "}
            <a
              href="/courses"
              className="font-medium text-(--text-strong) underline decoration-1 underline-offset-4 hover:text-(--text-accent)"
            >
              Explore career tracks
            </a>
          </p>
        </div>
      </div>
    </Section>
  );
}
