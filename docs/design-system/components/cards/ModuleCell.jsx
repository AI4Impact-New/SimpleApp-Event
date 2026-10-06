import React from 'react';
export function ModuleCell({title,description,note,style}){
  return <div style={{background:'var(--surface-card)',padding:'24px 24px 26px',display:'flex',flexDirection:'column',minWidth:0,...style}}>
    <span style={{font:'600 18px/1.25 var(--font-display)',color:'var(--text-strong)'}}>{title}</span>
    <span style={{marginTop:8,font:'400 13px/1.7 var(--font-body)',color:'var(--text-body)'}}>{description}</span>
    {note?<span style={{marginTop:6,font:'400 12px/1.5 var(--font-body)',color:'var(--text-muted)'}}>{note}</span>:null}
  </div>;
}
