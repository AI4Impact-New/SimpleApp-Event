import React from 'react';
export function ChoiceOption({selected=false,onClick,children,style}){
  const [hover,setHover]=React.useState(false);
  return <button onClick={onClick} onMouseEnter={function(){setHover(true)}} onMouseLeave={function(){setHover(false)}} style={{display:'flex',alignItems:'center',width:'100%',height:56,padding:'0 21px',borderRadius:'var(--radius-xl)',border:'1px solid '+(selected?'var(--teal-600)':hover?'var(--border-strong)':'var(--border-default)'),background:selected?'#d9ebed':'var(--surface-card)',color:'var(--text-strong)',font:'500 16px/1 var(--font-body)',textAlign:'left',cursor:'pointer',transition:'border-color var(--dur-base) var(--ease-out),background var(--dur-base) var(--ease-out)',boxSizing:'border-box',...style}}>{children}</button>;
}
