import React from 'react';
export function MetaGrid({items=[],columns=2,theme='light',style}){
  const dark=theme==='dark';
  return <div style={{display:'grid',gridTemplateColumns:'repeat('+columns+',minmax(0,1fr))',columnGap:24,rowGap:14,...style}}>
    {items.map(function(it,i){return <div key={i} style={{display:'flex',flexDirection:'column',gap:4,minWidth:0}}>
      <span style={{font:'400 13px/1.3 var(--font-body)',color:dark?'var(--text-on-dark-muted)':'var(--text-muted)'}}>{it.label}</span>
      <span style={{font:'500 15px/1.4 var(--font-body)',color:dark?'var(--text-on-dark)':'var(--text-strong)'}}>{it.value}</span>
    </div>})}
  </div>;
}
