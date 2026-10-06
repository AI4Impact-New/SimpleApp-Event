import React from 'react';
const TONES={accent:'var(--text-body)',onDark:'var(--text-on-dark-body)',promo:'var(--text-on-dark-body)',muted:'var(--text-muted)'};
export function Eyebrow({tone='accent',line=false,children,style}){
  const c=TONES[tone]||TONES.accent;
  return <div style={{display:'flex',alignItems:'center',gap:10,font:'500 14px/1.3 var(--font-body)',color:c,...style}}>
    {line?<span style={{width:16,height:1,background:c,flexShrink:0}}></span>:null}
    <span>{children}</span>
  </div>;
}
