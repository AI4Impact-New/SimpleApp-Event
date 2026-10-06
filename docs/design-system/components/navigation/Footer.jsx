import React from 'react';
import { Logo } from '../core/Logo.jsx';
export function Footer({columns=[],tagline='Learn AI. Build real systems. Create impact.',note,legal,legalRight,basePath='',style}){
  return <footer style={{background:'var(--surface-dark)',...style}}>
    <div style={{maxWidth:'var(--container)',margin:'0 auto',padding:'48px var(--container-pad) 40px',display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr 1fr',gap:48,alignItems:'start',boxSizing:'border-box'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:16,maxWidth:320}}>
        <Logo variant="dark" basePath={basePath} height={30}/>
        <p style={{margin:0,font:'400 17px/1.5 var(--font-display)',color:'var(--text-on-dark)'}}>{tagline}</p>
        {note?<p style={{margin:0,font:'400 12px/1.65 var(--font-body)',color:'var(--text-on-dark-muted)'}}>{note}</p>:null}
      </div>
      {columns.map(function(c){return <div key={c.title} style={{display:'flex',flexDirection:'column',gap:12}}>
        <span style={{font:'500 14px/1 var(--font-body)',color:'var(--text-on-dark)',marginBottom:6}}>{c.title}</span>
        {c.links.map(function(l){return <a key={l} style={{font:'400 14px/1.4 var(--font-body)',color:'var(--text-on-dark-body)',cursor:'pointer'}}>{l}</a>})}
      </div>})}
    </div>
    <div style={{borderTop:'1px solid var(--border-dark)'}}>
      <div style={{maxWidth:'var(--container)',margin:'0 auto',padding:'20px var(--container-pad) 24px',display:'flex',justifyContent:'space-between',gap:24,font:'400 12px/1.5 var(--font-body)',color:'var(--text-on-dark-muted)',boxSizing:'border-box'}}><span>{legal}</span><span>{legalRight}</span></div>
    </div>
  </footer>;
}
