'use client';
import { ReactNode, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * Full-width create/edit view shown in the page's main area in place of the list it belongs to.
 * The action bar sticks to the bottom of the window while the form scrolls.
 */
export function EditorView({ title, label, subtitle, backLabel, onClose, footer, children, busy = false }: {
  title: ReactNode; label: string; subtitle?: ReactNode; backLabel: string; onClose: () => void; footer?: ReactNode; children: ReactNode; busy?: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    root.current?.querySelector<HTMLElement>('[data-autofocus], input:not([type=hidden]), textarea')?.focus({ preventScroll: true });
  }, []);

  return <section ref={root} aria-label={label} >
    <button type="button" disabled={busy} onClick={onClose} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary-700"><ArrowLeft size={16} />{backLabel}</button>
    <div className="rounded-xl border bg-white">
      <header className="border-b px-6 py-5">
        {typeof title === 'string' ? <h2 className="text-lg font-semibold text-gray-900">{title}</h2> : title}
        {subtitle && <div className="mt-1 text-sm text-gray-500">{subtitle}</div>}
      </header>
      <div className="mx-auto max-w-3xl px-6 py-6">{children}</div>
      {footer && <footer className="sticky bottom-0 z-10 rounded-b-xl border-t bg-white/95 px-6 py-4 backdrop-blur">{footer}</footer>}
    </div>
  </section>;
}
