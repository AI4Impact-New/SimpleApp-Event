import React from 'react';
const TONES={accent:'var(--text-body)',onDark:'var(--text-on-dark-body)',promo:'var(--text-on-dark-body)',muted:'var(--text-muted)'};
const MONO_TONES={accent:'var(--text-accent)',onDark:'var(--text-on-dark-accent)',promo:'var(--text-promo)',muted:'var(--text-muted)'};
export function Eyebrow({tone='accent',variant='mono',line,children,style}){
  if(variant==='mono'){
    const c=MONO_TONES[tone]||MONO_TONES.accent;
    return <div style={{display:'flex',alignItems:'center',gap:12,font:'var(--type-eyebrow)',letterSpacing:'var(--ls-eyebrow)',textTransform:'uppercase',color:c,...style}}>
      {line!==false?<span style={{width:24,height:1,background:'currentColor',flexShrink:0}}></span>:null}
      <span>{children}</span>
    </div>;
  }
  const c=TONES[tone]||TONES.accent;
  return <div style={{display:'flex',alignItems:'center',gap:10,font:'500 14px/1.3 var(--font-body)',color:c,...style}}>
    {line?<span style={{width:16,height:1,background:c,flexShrink:0}}></span>:null}
    <span>{children}</span>
  </div>;
}
