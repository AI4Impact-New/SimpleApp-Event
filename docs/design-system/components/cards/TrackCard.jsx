import React from 'react';
import { Badge } from '../core/Badge.jsx';
import { Button } from '../core/Button.jsx';
import { MetaGrid } from '../data/MetaGrid.jsx';
export function TrackCard({number,family,title,description,badge,meta=[],onExplore,onEnrol,style}){
  return <div style={{display:'flex',flexDirection:'column',background:'var(--surface-card)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-3xl)',padding:24,boxSizing:'border-box',minWidth:0,...style}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',minHeight:22}}>
      <span style={{font:'400 13px/1 var(--font-body)',color:'var(--text-muted)'}}>{family}</span>
      {badge?<Badge>{badge}</Badge>:null}
    </div>
    <h3 style={{margin:'14px 0 0',font:'700 20px/1.25 var(--font-display)',letterSpacing:'-0.02em',color:'var(--text-strong)',textWrap:'balance'}}>{title}</h3>
    <p style={{margin:'10px 0 0',font:'400 14px/1.65 var(--font-body)',color:'var(--text-body)',textWrap:'pretty'}}>{description}</p>
    <MetaGrid items={meta.slice(0,2)} style={{marginTop:20,paddingTop:18,borderTop:'1px solid var(--border-default)'}}/>
    <div style={{flex:1,minHeight:24}}></div>
    <div style={{display:'flex',gap:8}}>
      <Button size="sm" variant="primary" onClick={onExplore} style={{flex:1}}>Explore course</Button>
      <Button size="sm" variant="outline" onClick={onEnrol} style={{flex:1}}>Enrol</Button>
    </div>
  </div>;
}
