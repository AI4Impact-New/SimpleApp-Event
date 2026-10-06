import React from 'react';
export function CompareTable({columns=[],rows=[],style}){
  return <div style={{background:'var(--surface-card)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-3xl)',overflow:'hidden',...style}}>
    <table style={{width:'100%',borderCollapse:'collapse'}}>
      <thead><tr>{columns.map(function(c,i){return <th key={i} style={{textAlign:c.align||'left',padding:'0 20px',height:40,background:'var(--slate-50)',borderBottom:'1px solid var(--border-default)',font:'500 13px/1 var(--font-body)',color:'var(--text-muted)',whiteSpace:'nowrap'}}>{c.label}</th>})}</tr></thead>
      <tbody>{rows.map(function(r,ri){return <tr key={ri}>{columns.map(function(c,ci){return <td key={ci} style={{textAlign:c.align||'left',padding:'0 20px',height:48,borderTop:ri===0?'none':'1px solid var(--border-default)',font:(ci===0?'500 14px/1.3 var(--font-body)':'400 14px/1.3 var(--font-body)'),fontVariantNumeric:'tabular-nums',color:c.muted?'var(--text-muted)':'var(--text-strong)',whiteSpace:ci===0?'normal':'nowrap'}}>{r[c.key]}</td>})}</tr>})}</tbody>
    </table>
  </div>;
}
