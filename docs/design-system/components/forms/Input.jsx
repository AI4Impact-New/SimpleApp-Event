import React from 'react';
export function Input({label,placeholder,value,defaultValue,onChange,type='text',theme='dark',style}){
  const dark=theme==='dark';
  const [focus,setFocus]=React.useState(false);
  return <label style={{display:'flex',flexDirection:'column',gap:10,minWidth:0,...style}}>
    {label?<span style={{font:'500 15px/1.2 var(--font-body)',color:dark?'var(--text-on-dark)':'var(--text-strong)'}}>{label}</span>:null}
    <input type={type} placeholder={placeholder} value={value} defaultValue={defaultValue} onChange={onChange} onFocus={function(){setFocus(true)}} onBlur={function(){setFocus(false)}}
      style={{height:34,padding:'0 12px',borderRadius:'var(--radius-input)',border:'1px solid '+(focus?'var(--teal-500)':dark?'var(--border-dark-strong)':'var(--border-default)'),background:dark?'var(--surface-dark-input)':'var(--surface-card)',color:dark?'var(--text-on-dark)':'var(--text-strong)',font:'400 15px/1 var(--font-body)',outline:'none',boxSizing:'border-box',width:'100%',transition:'border-color var(--dur-base) var(--ease-out)'}}/>
  </label>;
}
