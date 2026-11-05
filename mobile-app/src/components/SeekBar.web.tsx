import React, { useRef, useState } from 'react';
import type { SeekBarProps } from './SeekBar.types';
import { formatDuration } from '@/utils/datetime';

/** Native HTML slider supplies pointer capture, touch and keyboard accessibility. */
export function SeekBar({ position, duration, disabled, onSeek }: SeekBarProps) {
  const [preview, setPreview] = useState<number | null>(null);
  const dragging = useRef(false);
  const latest = useRef(position);
  const maximum = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const value = Math.max(0, Math.min(maximum, preview ?? position));
  const commit = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setPreview(null);
    onSeek(latest.current);
  };
  return <>
    <style>{`.ai4impact-seek{appearance:none;-webkit-appearance:none;touch-action:none}
      .ai4impact-seek:focus-visible{outline:2px solid #5eead4;outline-offset:2px;border-radius:4px}
      .ai4impact-seek::-webkit-slider-runnable-track{height:4px;background:transparent}
      .ai4impact-seek::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#f8fafc;margin-top:-5px}
      .ai4impact-seek::-moz-range-track{height:4px;background:transparent}
      .ai4impact-seek::-moz-range-thumb{width:14px;height:14px;border:0;border-radius:50%;background:#f8fafc}`}</style>
    <input className="ai4impact-seek" type="range" aria-label="Seek" min={0} max={maximum || 1} step={0.1}
      value={value} disabled={disabled || maximum === 0}
      aria-valuetext={`${formatDuration(value)} of ${formatDuration(maximum)}`}
      onPointerDown={e => { dragging.current = true; latest.current = value; e.currentTarget.setPointerCapture(e.pointerId); }}
      onChange={e => {
        latest.current = Number(e.currentTarget.value);
        if (dragging.current) setPreview(latest.current);
        else onSeek(latest.current); // keyboard/assistive-technology changes
      }}
      onKeyDown={e => {
        const changes: Record<string, number> = { ArrowLeft: value - 10, ArrowDown: value - 10,
          ArrowRight: value + 10, ArrowUp: value + 10, PageDown: value - 30, PageUp: value + 30,
          Home: 0, End: maximum };
        if (e.key in changes) { e.preventDefault(); onSeek(Math.max(0, Math.min(maximum, changes[e.key]))); }
      }}
      onPointerUp={commit} onLostPointerCapture={commit} onBlur={commit}
      onPointerCancel={() => { dragging.current = false; setPreview(null); }}
      style={{ width: '100%', minWidth: 0, height: 28, margin: 0, cursor: disabled ? 'default' : 'pointer',
        background: `linear-gradient(to right,#2dd4bf ${maximum ? value / maximum * 100 : 0}%,#334155 ${maximum ? value / maximum * 100 : 0}%) center / 100% 4px no-repeat` }} />
  </>;
}
