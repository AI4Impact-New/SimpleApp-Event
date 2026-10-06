import React from 'react';
import { CodeWindow } from './CodeWindow.jsx';
export function ProjectCard({windowTitle,preview,title,description,tags=[],theme='dark',style}){
  const dark=theme==='dark';
  return <div style={{background:dark?'var(--surface-dark-raised)':'var(--surface-card)',border:'1px solid '+(dark?'var(--border-dark)':'var(--border-default)'),borderRadius:'var(--radius-3xl)',padding:24,display:'flex',flexDirection:'column',minWidth:0,...style}}>
    {preview?<CodeWindow title={windowTitle} style={{marginBottom:20}}>{preview}</CodeWindow>:null}
    <span style={{font:'600 18px/1.25 var(--font-display)',color:dark?'var(--text-on-dark)':'var(--text-strong)'}}>{title}</span>
    <span style={{marginTop:10,font:'400 14px/1.65 var(--font-body)',color:dark?'var(--text-on-dark-body)':'var(--text-body)'}}>{description}</span>
    {tags.length?<span style={{marginTop:18,paddingTop:16,borderTop:'1px solid '+(dark?'var(--border-dark)':'var(--border-default)'),font:'400 13px/1.5 var(--font-body)',color:dark?'var(--text-on-dark-muted)':'var(--text-muted)'}}>{tags.join(' · ')}</span>:null}
  </div>;
}
