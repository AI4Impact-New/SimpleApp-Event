import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Eyebrow } from '../core/Eyebrow.jsx';
export function CheckCard({eyebrow,title,subtitle,items=[],footer,highlighted=false,style}){
  return <div style={{background:'var(--surface-card)',border:highlighted?'2px solid var(--teal-600)':'1px solid var(--border-default)',borderRadius:'var(--radius-3xl)',padding:highlighted?'23px 25px 21px':'24px 26px 22px',display:'flex',flexDirection:'column',minWidth:0,...style}}>
    {eyebrow?<Eyebrow tone="muted">{eyebrow}</Eyebrow>:null}
    <span style={{marginTop:14,font:'700 20px/1.2 var(--font-display)',letterSpacing:'-0.02em',color:'var(--text-strong)'}}>{title}</span>
    {subtitle?<span style={{marginTop:10,font:'400 14px/1.5 var(--font-body)',color:'var(--text-body)'}}>{subtitle}</span>:null}
    <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:18}}>{items.map(function(it,i){return <span key={i} style={{display:'flex',gap:12,alignItems:'center',font:'400 14px/1.4 var(--font-body)',color:'var(--text-strong)'}}><Icon name="check" size={14} color="var(--text-strong)"/>{it}</span>})}</div>
    {footer?<div style={{marginTop:22,paddingTop:18,borderTop:'1px solid var(--border-default)',font:'500 13px/1.4 var(--font-body)',color:'var(--text-strong)'}}>{footer}</div>:null}
  </div>;
}
