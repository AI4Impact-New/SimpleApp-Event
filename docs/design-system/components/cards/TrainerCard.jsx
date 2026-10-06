import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function TrainerCard({name,initials,subtitle,onClick,style}){
  const [hover,setHover]=React.useState(false);
  return <div onClick={onClick} onMouseEnter={function(){setHover(true)}} onMouseLeave={function(){setHover(false)}} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px 12px 12px',background:'var(--surface-card)',border:'1px solid '+(hover?'var(--border-strong)':'var(--border-default)'),borderRadius:'var(--radius-3xl)',cursor:'pointer',minWidth:0,transition:'border-color var(--dur-base) var(--ease-out)',...style}}>
    <span style={{width:40,height:40,borderRadius:'var(--radius-lg)',display:'flex',alignItems:'center',justifyContent:'center',font:'600 13px/1 var(--font-display)',flexShrink:0,background:'var(--slate-100)',color:'var(--text-strong)'}}>{initials}</span>
    <span style={{display:'flex',flexDirection:'column',gap:4,minWidth:0,flex:1}}>
      <span style={{font:'600 14px/1.2 var(--font-display)',color:'var(--text-strong)'}}>{name}</span>
      <span style={{font:'400 13px/1.3 var(--font-body)',color:'var(--text-body)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{subtitle}</span>
    </span>
    <Icon name="chevron-right" size={14} color="var(--text-muted)"/>
  </div>;
}
