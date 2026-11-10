import React, { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { playbackSpeedLabel, type PlaybackSettingsProps } from './PlaybackSettings.types';

/** Embedded popover remains inside the fullscreen player and supports keyboard navigation. */
export function PlaybackSettings({ speed, speeds, disabled, onSpeed }: PlaybackSettingsProps) {
  const [page, setPage] = useState<'settings' | 'speeds' | null>(null);
  const [height, setHeight] = useState(300);
  const root = useRef<HTMLDivElement>(null);
  const gear = useRef<HTMLButtonElement>(null);
  const open = () => {
    const stage = root.current?.closest('[data-testid="protected-video-stage"]');
    if (stage && gear.current) setHeight(Math.max(100, Math.min(320, gear.current.getBoundingClientRect().top - stage.getBoundingClientRect().top - 16)));
    setPage('settings');
  };
  const close = (restoreFocus = true) => { setPage(null); if (restoreFocus) gear.current?.focus(); };
  useEffect(() => {
    if (!page) return;
    const outside = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setPage(null); };
    document.addEventListener('pointerdown', outside);
    const first = root.current?.querySelector<HTMLButtonElement>('[aria-checked="true"], [role="menuitem"]');
    first?.focus();
    return () => document.removeEventListener('pointerdown', outside);
  }, [page]);
  useEffect(() => { if (disabled) setPage(null); }, [disabled]);
  const keydown = (e: React.KeyboardEvent) => {
    e.stopPropagation(); // player shortcuts must not seek/toggle while choosing a setting
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'ArrowLeft' && page === 'speeds') { e.preventDefault(); setPage('settings'); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key) || !page) return;
    e.preventDefault();
    const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]') || []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 :
      (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };
  return <div ref={root} style={{ position: 'relative', display: 'flex', flexShrink: 0 }} onKeyDown={keydown} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setPage(null); }}>
    <style>{`.video-setting-item:hover,.video-setting-item:focus-visible{background:#263650!important;outline:none}.video-setting-gear:hover{background:#263650!important}.video-setting-gear:focus-visible{outline:2px solid #2dd4bf}`}</style>
    <button ref={gear} type="button" className="video-setting-gear" aria-label="Settings" title="Settings"
      aria-haspopup="menu" aria-expanded={!!page} disabled={disabled}
      onClick={() => page ? close() : open()}
      style={{ width: 32, height: 32, border: 0, borderRadius: 6, padding: 0, background: 'transparent', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
      <Ionicons name="settings-outline" size={19} color="#f8fafc" />
    </button>
    {page ? <div role="menu" aria-label={page === 'settings' ? 'Video settings' : 'Playback speed'}
      style={{ boxSizing: 'border-box', position: 'absolute', right: 0, bottom: 42, zIndex: 20, width: 230, maxHeight: height, overflowY: 'auto', padding: '6px 0', borderRadius: 10, border: '1px solid #334155', background: '#13223a', color: '#f8fafc', boxShadow: '0 8px 30px #0006' }}>
      {page === 'settings' ? <button type="button" role="menuitem" className="video-setting-item" style={item}
        onClick={() => setPage('speeds')}>
        <span>Playback speed</span><span style={{ color: '#cbd5e1' }}>{playbackSpeedLabel(speed)} ›</span>
      </button> : <>
        <button type="button" aria-label="Back to settings" className="video-setting-item" style={{ ...item, borderBottom: '1px solid #334155', marginBottom: 4 }} onClick={() => setPage('settings')}>‹ Playback speed</button>
        {speeds.map(value => <button key={value} type="button" role="menuitemradio" aria-checked={speed === value}
          className="video-setting-item" style={item} onClick={() => { onSpeed(value); close(); }}>
          <span>{playbackSpeedLabel(value)}</span><span aria-hidden="true">{speed === value ? '✓' : ''}</span>
        </button>)}
      </>}
    </div> : null}
  </div>;
}
const item: React.CSSProperties = { width: '100%', padding: '10px 16px', border: 0, background: 'transparent', color: '#f8fafc', font: 'inherit', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textAlign: 'left' };
