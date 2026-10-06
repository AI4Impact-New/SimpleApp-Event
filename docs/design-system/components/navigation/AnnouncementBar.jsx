import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { Button } from '../core/Button.jsx';
export function AnnouncementBar({items=[],ctaLabel='Register free',onCta,style}){
  const seq=items.concat(items);
  return <div style={{height:40,background:'var(--surface-topbar)',display:'flex',alignItems:'center',overflow:'hidden',position:'relative',...style}}>
    <div style={{flex:1,overflow:'hidden',maskImage:'linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 60px),transparent)',WebkitMaskImage:'linear-gradient(90deg,transparent,#000 40px,#000 calc(100% - 60px),transparent)'}}>
      <div style={{display:'flex',alignItems:'center',gap:32,width:'max-content',animation:'ai4-marquee 40s linear infinite'}}>
        {seq.map(function(t,i){return <React.Fragment key={i}><span style={{font:'500 14px/1 var(--font-body)',color:'var(--text-on-dark)',whiteSpace:'nowrap'}}>{t}</span><span style={{color:'var(--text-on-dark-muted)'}}>·</span></React.Fragment>})}
      </div>
    </div>
    <div style={{padding:'0 13px 0 12px'}}><Button variant="light" size="sm" icon="arrow-right" onClick={onCta} style={{height:26,padding:'0 10px',fontSize:13}}>{ctaLabel}</Button></div>
    <style>{'@keyframes ai4-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}'}</style>
  </div>;
}
