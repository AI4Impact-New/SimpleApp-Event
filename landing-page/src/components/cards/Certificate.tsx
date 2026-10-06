type FieldProps = { label: string; value: string; mono?: boolean };

function Field({ label, value, mono = false }: FieldProps) {
  return (
    <div className="flex flex-col gap-(--space-1)">
      <span className="font-(family-name:--font-mono) text-(length:--fs-label) uppercase leading-none tracking-(--ls-label) text-(--text-muted)">
        {label}
      </span>
      <span
        className={`text-(length:--fs-label) leading-(--lh-snug) text-(--text-strong) ${mono ? "font-(family-name:--font-mono)" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}

function Signature({ role }: { role: string }) {
  return (
    <div className="border-t border-(--cream-200) pt-(--space-1) text-(length:--fs-label) leading-none text-(--text-body)">
      {role}
    </div>
  );
}

type CertificateProps = {
  learner?: string;
  programme?: string;
  capstone?: string;
  assessment?: string;
  issued?: string;
  credentialId?: string;
};

/** Sample professional certificate on cream paper. The only cream surface in the system. */
export function Certificate({
  learner = "Sample Learner",
  programme = "Forward Deployed AI Engineer",
  capstone = "Payments reconciliation copilot engagement",
  assessment = "Passed with distinction",
  issued = "20 Mar 2026",
  credentialId = "IIAA-FDE-2026-000123",
}: CertificateProps) {
  return (
    <figure
      aria-label={`Sample certificate: AI4Impact Professional Certificate in ${programme}`}
      className="rounded-(--radius-3xl) border border-(--cream-200) bg-(--cream-50) p-(--space-4) shadow-(--shadow-float)"
    >
      <div className="flex min-h-(--space-30) flex-col rounded-(--radius-md) border-2 border-(--cream-200) px-(--space-5) pt-(--space-5) pb-(--space-4)">
        <div className="flex items-start justify-between gap-(--space-3)">
          <div className="flex items-center gap-(--space-2)">
            <span className="flex size-(--space-6) shrink-0 items-center justify-center rounded-(--radius-sm) bg-(--navy-800) font-(family-name:--font-display) text-(length:--fs-label) font-bold text-(--white)">
              A4
            </span>
            <span className="flex flex-col gap-(--space-1)">
              <span className="font-(family-name:--font-display) text-(length:--fs-eyebrow) font-semibold leading-none text-(--text-strong)">
                AI4Impact Institute of Applied AI (IIAA)
              </span>
              <span className="text-(length:--fs-label) leading-none text-(--text-body)">
                in academic collaboration with XYZ University
              </span>
            </span>
          </div>
          <span className="font-(family-name:--font-mono) text-(length:--fs-label) leading-none tracking-(--ls-eyebrow) text-(--text-muted)">
            SAMPLE
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-(--space-2) py-(--space-12) text-center">
          <span className="font-(family-name:--font-mono) text-(length:--fs-label) uppercase leading-none tracking-(--ls-eyebrow) text-(--text-muted)">
            This certifies that
          </span>
          <span className="font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-snug) text-(--text-strong)">
            {learner}
          </span>
          <span className="text-(length:--fs-label) leading-none text-(--text-body)">
            has met the assessed standard for the
          </span>
          <span className="font-(family-name:--font-display) text-(length:--fs-xs) font-semibold leading-(--lh-snug) text-(--teal-700)">
            AI4Impact Professional Certificate in {programme}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-[1.5fr_1.2fr_1fr_auto] items-end gap-(--space-3)">
          <div className="flex flex-col gap-(--space-2)">
            <Field label="Course" value={programme} />
            <Field label="Capstone" value={capstone} />
            <Field label="Assessment" value={assessment} />
          </div>
          <div className="flex flex-col gap-(--space-2)">
            <Field label="Issued" value={issued} />
            <Field label="Credential ID" value={credentialId} mono />
            <Signature role="Director, IIAA" />
          </div>
          <Signature role="Dean, XYZ University" />
          <div className="flex flex-col items-center gap-(--space-1)">
            <span className="flex size-(--space-12) items-center justify-center border border-dashed border-(--slate-400) font-(family-name:--font-mono) text-(length:--fs-label) text-(--text-muted)">
              QR
            </span>
            <span className="font-(family-name:--font-mono) text-(length:--fs-label) leading-none text-(--text-muted)">
              ai4impact.in/verify
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
