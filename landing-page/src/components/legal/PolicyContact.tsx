import { COMPANY_NAME } from "@/content/legal";

type PolicyContactProps = { email: string };

/** Closing callout naming the issuing company and pointing readers to support with policy questions. */
export function PolicyContact({ email }: PolicyContactProps) {
  return (
    <p className="rounded-(--radius-xl) border border-(--border-default) bg-(--surface-alt) px-(--space-6) py-(--space-5) text-(length:--fs-2xs) leading-(--lh-body) text-(--text-body)">
      This policy is issued by {COMPANY_NAME}, which owns and manages the AI4Impact platform. Questions about this policy? Write to{" "}
      <a href={`mailto:${email}`} className="font-medium text-(--text-strong) underline underline-offset-2">
        {email}
      </a>
      .
    </p>
  );
}
