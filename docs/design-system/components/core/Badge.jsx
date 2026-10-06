import React from 'react';
const TONES={neutral:{background:'var(--slate-100)',color:'var(--slate-700)',border:'1px solid var(--border-default)'},promo:{background:'var(--amber-500)',color:'var(--amber-950)',border:'1px solid var(--amber-500)'},accent:{background:'var(--teal-100)',color:'var(--teal-700)',border:'1px solid var(--teal-100)'},dark:{background:'var(--navy-800)',color:'var(--white)',border:'1px solid var(--navy-800)'}};
export function Badge({tone='neutral',children,style}){
  return <span style={{display:'inline-flex',alignItems:'center',height:22,padding:'0 9px',borderRadius:'var(--radius-pill)',font:'500 12px/1 var(--font-body)',whiteSpace:'nowrap',boxSizing:'border-box',...TONES[tone],...style}}>{children}</span>;
}
