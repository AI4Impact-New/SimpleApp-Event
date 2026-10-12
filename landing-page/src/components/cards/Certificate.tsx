/** Amber anatomy marker; numbers map to CERT_ANATOMY on the certification page. */
function Marker({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span
      aria-hidden
      className="flex size-(--space-5) shrink-0 items-center justify-center rounded-(--radius-pill) bg-(--amber-500) font-(family-name:--font-display) text-(length:--fs-label) font-bold leading-none text-(--amber-950)"
    >
      {n}
    </span>
  );
}

type FieldProps = { label: string; value: string; mono?: boolean; marker?: number };

function Field({ label, value, mono = false, marker }: FieldProps) {
  return (
    <div className="flex items-center gap-(--space-2)">
      <Marker n={marker} />
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
    </div>
  );
}

/** Decorative QR: three finder squares plus a fixed pseudo-random module pattern. Not scannable. */
const QR_SIZE = 21;
const QR_MODULES = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => {
  const x = i % QR_SIZE;
  const y = Math.floor(i / QR_SIZE);
  const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
  return !inFinder && ((x * 7 + y * 13 + x * y * 3) % 5 < 2);
});

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <>
      <rect x={x} y={y} width={7} height={7} />
      <rect x={x + 1} y={y + 1} width={5} height={5} className="fill-(--cream-50)" />
      <rect x={x + 2} y={y + 2} width={3} height={3} />
    </>
  );
}

function QrMark() {
  return (
    <svg
      viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`}
      aria-hidden
      shapeRendering="crispEdges"
      className="size-(--space-12) fill-(--navy-900)"
    >
      <Finder x={0} y={0} />
      <Finder x={QR_SIZE - 7} y={0} />
      <Finder x={0} y={QR_SIZE - 7} />
      {QR_MODULES.map((on, i) =>
        on ? <rect key={i} x={i % QR_SIZE} y={Math.floor(i / QR_SIZE)} width={1} height={1} /> : null,
      )}
    </svg>
  );
}

function Signature({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="pb-(--space-1) text-(length:--fs-label) italic leading-none text-(--text-body)">{name}</span>
      <span className="border-t border-(--cream-200) pt-(--space-1) text-(length:--fs-label) leading-none text-(--text-muted)">
        {role}
      </span>
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
  /** Show the numbered anatomy markers (1–9). */
  annotated?: boolean;
};

/** Sample professional certificate on cream paper. The only cream surface in the system. */
export function Certificate({
  learner = "Sample Learner",
  programme = "Forward Deployed AI Engineer",
  capstone = "Payments reconciliation copilot engagement",
  assessment = "Passed with distinction",
  issued = "20 Mar 2026",
  credentialId = "IIAA-FDE-2026-000123",
  annotated = false,
}: CertificateProps) {
  const m = (n: number) => (annotated ? n : undefined);
  return (
    <figure
      aria-label={`Sample certificate: AI4Impact Professional Certificate in ${programme}`}
      className="flex flex-col rounded-(--radius-3xl) border border-(--cream-200) bg-(--cream-50) p-(--space-4) shadow-(--shadow-float) @container sm:aspect-[1.414/1]"
    >
      <div className="flex min-h-(--space-30) flex-1 flex-col rounded-(--radius-md) @max-[36rem]:[--fs-label:10px] @max-[36rem]:px-(--space-4) border-2 border-(--cream-200) px-(--space-5) pt-(--space-5) pb-(--space-4)">
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

        <div className="flex flex-1 flex-col items-center justify-center gap-(--space-2) py-(--space-8) text-center">
          <span className="font-(family-name:--font-mono) text-(length:--fs-label) uppercase leading-none tracking-(--ls-eyebrow) text-(--text-muted)">
            This certifies that
          </span>
          <span className="flex items-center gap-(--space-2) font-(family-name:--font-display) text-(length:--fs-h3) font-bold leading-(--lh-snug) text-(--text-strong)">
            <Marker n={m(1)} />
            {learner}
          </span>
          <span className="text-(length:--fs-label) leading-none text-(--text-body)">
            has met the assessed standard for the
          </span>
          <span className="flex items-center gap-(--space-2) font-(family-name:--font-display) text-(length:--fs-xs) font-semibold leading-(--lh-snug) text-(--teal-700)">
            <Marker n={m(2)} />
            AI4Impact Professional Certificate in {programme}
          </span>
        </div>

        <div className="grid grid-cols-2 items-end gap-(--space-4) sm:grid-cols-[1fr_1.2fr_auto] sm:gap-(--space-4)">
          <div className="flex min-w-0 flex-col gap-(--space-2)">
            <Field label="Course" value={programme} marker={m(3)} />
            <Field label="Capstone" value={capstone} marker={m(4)} />
            <Field label="Assessment" value={assessment} marker={m(5)} />
          </div>
          <div className="flex min-w-0 flex-col gap-(--space-2)">
            <Field label="Issued" value={issued} marker={m(6)} />
            <Field label="Credential ID" value={credentialId} mono marker={m(7)} />
            <div className="mt-(--space-2) flex items-start gap-(--space-3)">
              <Marker n={m(9)} />
              <Signature name="A. Rao" role="Director, IIAA" />
              <Signature name="S. Menon" role="Dean, XYZ University" />
            </div>
          </div>
          <div className="col-span-2 flex flex-col items-center gap-(--space-1) sm:col-span-1">
            <div className="relative">
              {annotated ? (
                <span className="absolute -top-(--space-2) -left-(--space-6)">
                  <Marker n={8} />
                </span>
              ) : null}
              <QrMark />
            </div>
            <span className="font-(family-name:--font-mono) text-(length:--fs-label) leading-none text-(--text-muted)">
              ai4impact.in/verify
            </span>
          </div>
        </div>
      </div>
    </figure>
  );
}
