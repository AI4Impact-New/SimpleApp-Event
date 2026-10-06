import React from 'react';
export function Stat({value,label,theme='dark',style}){
  const dark=theme==='dark';
  return <div style={{display:'flex',flexDirection:'column',gap:8,...style}}>
    <span style={{font:'700 32px/1 var(--font-display)',letterSpacing:'-0.02em',color:dark?'var(--text-on-dark)':'var(--text-strong)'}}>{value}</span>
    <span style={{font:'400 14px/1.3 var(--font-body)',color:dark?'var(--text-on-dark-body)':'var(--text-body)'}}>{label}</span>
  </div>;
}
