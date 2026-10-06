import React from 'react';
import { Eyebrow } from '../core/Eyebrow.jsx';
export function SectionHeader({eyebrow,eyebrowTone,title,lead,theme='light',size='md',aside,style}){
  const dark=theme==='dark';
  const fs=size==='lg'?52:size==='sm'?36:44;
  return <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:32,...style}}>
    <div style={{display:'flex',flexDirection:'column',maxWidth:760}}>
      {eyebrow?<Eyebrow tone={eyebrowTone||(dark?'onDark':'accent')}>{eyebrow}</Eyebrow>:null}
      <h2 style={{margin:eyebrow?'18px 0 0':0,font:'700 '+fs+'px/1.04 var(--font-display)',letterSpacing:'-0.03em',color:dark?'var(--text-on-dark)':'var(--text-strong)',textWrap:'balance'}}>{title}</h2>
      {lead?<p style={{margin:'18px 0 0',maxWidth:620,font:'400 17px/1.7 var(--font-body)',color:dark?'var(--text-on-dark-body)':'var(--text-body)',textWrap:'pretty'}}>{lead}</p>:null}
    </div>
    {aside?<div style={{flexShrink:0}}>{aside}</div>:null}
  </div>;
}
