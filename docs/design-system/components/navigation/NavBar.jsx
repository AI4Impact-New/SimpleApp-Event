import React from 'react';
import { Logo } from '../core/Logo.jsx';
import { Button } from '../core/Button.jsx';
export function NavBar({links=[],active,onNavigate,basePath='',onLogin,onGuidance,style}){
  return <div style={{height:64,background:'var(--slate-50)',borderBottom:'1px solid var(--border-default)',...style}}>
    <div style={{maxWidth:'var(--container)',margin:'0 auto',padding:'0 var(--container-pad)',height:'100%',display:'flex',alignItems:'center',gap:24,boxSizing:'border-box'}}>
      <a onClick={function(){onNavigate&&onNavigate('home')}} style={{cursor:'pointer'}}><Logo basePath={basePath} height={30}/></a>
      <nav style={{display:'flex',gap:24,marginLeft:'auto',marginRight:'auto',height:'100%'}}>
        {links.map(function(l){const on=l.id===active;return <a key={l.id} onClick={function(){onNavigate&&onNavigate(l.id)}} style={{display:'flex',alignItems:'center',height:'100%',font:'400 14px/1 var(--font-body)',color:on?'var(--text-strong)':'var(--text-body)',fontWeight:on?500:400,cursor:'pointer',textDecoration:'none',boxShadow:on?'inset 0 -2px 0 var(--teal-600)':'none',whiteSpace:'nowrap'}}>{l.label}</a>})}
      </nav>
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        <a onClick={onGuidance} style={{font:'500 14px/1 var(--font-body)',color:'var(--text-strong)',cursor:'pointer',whiteSpace:'nowrap'}}>Free career guidance</a>
        <Button variant="outline" size="sm" leadingIcon="log-in" onClick={onLogin} style={{height:32,padding:'0 10px'}}>Student login</Button>
      </div>
    </div>
  </div>;
}
