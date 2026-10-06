import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function FeatureCell({icon,title,description,style}){
  return <div style={{background:'var(--surface-card)',padding:'22px 22px 26px',display:'flex',flexDirection:'column',minWidth:0,...style}}>
    {icon?<Icon name={icon} size={18} color="var(--text-strong)"/>:null}
    <span style={{marginTop:18,font:'600 17px/1.25 var(--font-display)',color:'var(--text-strong)'}}>{title}</span>
    <span style={{marginTop:10,font:'400 13px/1.7 var(--font-body)',color:'var(--text-body)',textWrap:'pretty'}}>{description}</span>
  </div>;
}
