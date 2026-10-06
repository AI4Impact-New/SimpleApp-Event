import React from 'react';
export function CellGrid({columns=4,children,style}){
  return <div style={{display:'grid',gridTemplateColumns:'repeat('+columns+',minmax(0,1fr))',gap:1,background:'var(--border-default)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-3xl)',overflow:'hidden',...style}}>{children}</div>;
}
