import React from 'react';
export function CodeWindow({title,children,style,bodyStyle}){
  return <div style={{background:'var(--navy-950)',border:'1px solid var(--border-dark)',borderRadius:'var(--radius-xl)',overflow:'hidden',...style}}>
    <div style={{display:'flex',alignItems:'center',gap:12,height:36,padding:'0 12px',borderBottom:'1px solid var(--border-dark)'}}>
      <span style={{display:'flex',gap:5}}><i style={{width:7,height:7,borderRadius:9,background:'var(--navy-500)'}}></i><i style={{width:7,height:7,borderRadius:9,background:'var(--navy-500)'}}></i><i style={{width:7,height:7,borderRadius:9,background:'var(--navy-500)'}}></i></span>
      <span style={{font:'400 11px/1 var(--font-mono)',color:'var(--text-on-dark-body)'}}>{title}</span>
    </div>
    <div style={{padding:'16px 14px',font:'400 11px/1.75 var(--font-mono)',color:'var(--text-on-dark-body)',...bodyStyle}}>{children}</div>
  </div>;
}
