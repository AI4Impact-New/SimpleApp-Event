import React from 'react';
import { Icon } from './Icon.jsx';
const SIZES={sm:{h:30,px:16,fs:14,r:8,gap:8},md:{h:38,px:18,fs:15,r:8,gap:8},lg:{h:46,px:22,fs:16,r:10,gap:10}};
const VARIANTS={
  primary:{background:'var(--navy-800)',color:'var(--white)',border:'1px solid var(--navy-800)'},
  outline:{background:'var(--surface-card)',color:'var(--text-strong)',border:'1px solid var(--border-default)'},
  light:{background:'var(--slate-100)',color:'var(--text-strong)',border:'1px solid var(--slate-100)'},
  'dark-ghost':{background:'var(--surface-dark-raised)',color:'var(--text-on-dark)',border:'1px solid var(--border-dark-strong)'},
  promo:{background:'var(--amber-500)',color:'var(--amber-950)',border:'1px solid var(--amber-500)'},
  link:{background:'transparent',color:'var(--text-body)',border:'1px solid transparent'}
};
const HOVER={primary:{background:'var(--navy-700)'},outline:{borderColor:'var(--border-strong)'},light:{background:'var(--white)'},'dark-ghost':{borderColor:'var(--slate-500)'},promo:{background:'var(--amber-600)'},link:{color:'var(--text-strong)'}};
export function Button({variant='primary',size='md',icon,leadingIcon,fullWidth=false,disabled=false,children,onClick,href,style}){
  const [hover,setHover]=React.useState(false);
  const s=SIZES[size]||SIZES.md;
  const isLink=variant==='link';
  const base={display:fullWidth?'flex':'inline-flex',width:fullWidth?'100%':undefined,alignItems:'center',justifyContent:'center',gap:s.gap,height:isLink?'auto':s.h,padding:isLink?0:'0 '+s.px+'px',borderRadius:s.r,font:'500 '+s.fs+'px/1 var(--font-body)',whiteSpace:'nowrap',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.45:1,textDecoration:'none',transition:'background var(--dur-base) var(--ease-out),border-color var(--dur-base) var(--ease-out),color var(--dur-base) var(--ease-out)',boxSizing:'border-box',...VARIANTS[variant],...(hover&&!disabled?HOVER[variant]:null),...style};
  const Tag=href?'a':'button';
  return <Tag href={href} onClick={disabled?undefined:onClick} disabled={Tag==='button'?disabled:undefined} style={base} onMouseEnter={function(){setHover(true)}} onMouseLeave={function(){setHover(false)}}>
    {leadingIcon?<Icon name={leadingIcon} size={s.fs+2}/>:null}
    {children}
    {icon?<Icon name={icon} size={s.fs}/>:null}
  </Tag>;
}
