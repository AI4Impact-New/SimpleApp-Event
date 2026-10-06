import React from 'react';
const V={
  outline:{height:30,padding:'0 15px',borderRadius:'var(--radius-pill)',border:'1px solid var(--border-default)',background:'var(--surface-card)',color:'var(--text-strong)',font:'400 14px/1 var(--font-body)'},
  tag:{height:22,padding:'0 7px',borderRadius:'var(--radius-sm)',background:'var(--navy-600)',color:'var(--text-on-dark)',font:'400 11px/1 var(--font-mono)'},
  code:{height:22,padding:'0 6px',borderRadius:'var(--radius-xs)',border:'1px solid var(--teal-500)',color:'var(--teal-400)',font:'400 11px/1 var(--font-mono)'},
  'code-amber':{height:22,padding:'0 6px',borderRadius:'var(--radius-xs)',border:'1px solid var(--amber-500)',color:'var(--amber-500)',font:'400 11px/1 var(--font-mono)'}
};
export function Chip({variant='outline',children,style}){
  return <span style={{display:'inline-flex',alignItems:'center',whiteSpace:'nowrap',boxSizing:'border-box',...V[variant],...style}}>{children}</span>;
}
