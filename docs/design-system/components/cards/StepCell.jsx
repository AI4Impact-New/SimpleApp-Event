import React from 'react';
export function StepCell({number,title,subtitle,description,style}){
  return <div style={{background:'var(--surface-card)',padding:'24px 22px 28px',display:'flex',flexDirection:'column',minWidth:0,...style}}>
    <span style={{font:'400 13px/1 var(--font-body)',color:'var(--text-muted)',fontVariantNumeric:'tabular-nums'}}>{number}</span>
    <span style={{marginTop:14,font:'700 22px/1.1 var(--font-display)',letterSpacing:'-0.02em',color:'var(--text-strong)'}}>{title}</span>
    <span style={{marginTop:10,font:'500 14px/1.45 var(--font-body)',color:'var(--text-strong)'}}>{subtitle}</span>
    <span style={{marginTop:8,font:'400 13px/1.7 var(--font-body)',color:'var(--text-body)',textWrap:'pretty'}}>{description}</span>
  </div>;
}
