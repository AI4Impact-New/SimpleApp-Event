import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Checkbox({checked,defaultChecked=false,onChange,theme='dark',children,style}){
  const [inner,setInner]=React.useState(defaultChecked);
  const on=checked!==undefined?checked:inner;
  const dark=theme==='dark';
  function toggle(){const n=!on;if(checked===undefined)setInner(n);if(onChange)onChange(n);}
  return <label onClick={toggle} style={{display:'flex',alignItems:'flex-start',gap:12,cursor:'pointer',...style}}>
    <span style={{width:16,height:16,marginTop:2,flexShrink:0,borderRadius:'var(--radius-xs)',border:'1px solid '+(on?'var(--teal-500)':dark?'var(--border-dark-strong)':'var(--border-strong)'),background:on?'var(--teal-500)':dark?'var(--surface-dark-raised)':'var(--surface-card)',display:'flex',alignItems:'center',justifyContent:'center',boxSizing:'border-box'}}>{on?<Icon name="check" size={12} strokeWidth={3} color="var(--white)"/>:null}</span>
    <span style={{font:'400 13px/1.55 var(--font-body)',color:dark?'var(--text-on-dark-body)':'var(--text-body)'}}>{children}</span>
  </label>;
}
