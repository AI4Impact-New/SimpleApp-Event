import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Select({label,options=[],value,defaultValue,onChange,theme='dark',style}){
  const dark=theme==='dark';
  return <label style={{display:'flex',flexDirection:'column',gap:10,minWidth:0,...style}}>
    {label?<span style={{font:'500 15px/1.2 var(--font-body)',color:dark?'var(--text-on-dark)':'var(--text-strong)'}}>{label}</span>:null}
    <span style={{position:'relative',display:'block'}}>
      <select value={value} defaultValue={defaultValue} onChange={onChange} style={{appearance:'none',WebkitAppearance:'none',width:'100%',height:36,padding:'0 36px 0 16px',borderRadius:'var(--radius-input)',border:'1px solid '+(dark?'var(--border-dark-strong)':'var(--border-default)'),background:dark?'var(--surface-dark-raised)':'var(--surface-card)',color:dark?'var(--text-on-dark)':'var(--text-strong)',font:'400 15px/1 var(--font-body)',outline:'none',cursor:'pointer'}}>
        {options.map(function(o){const v=typeof o==='string'?o:o.value;const l=typeof o==='string'?o:o.label;return <option key={v} value={v}>{l}</option>})}
      </select>
      <Icon name="chevron-down" size={14} color={dark?'var(--text-on-dark)':'var(--text-strong)'} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}/>
    </span>
  </label>;
}
