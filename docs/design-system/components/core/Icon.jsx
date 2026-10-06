import React from 'react';
const LUCIDE_URL='https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js';
let loading=null;
function loadLucide(){
  if(typeof window==='undefined')return Promise.resolve(null);
  if(window.lucide)return Promise.resolve(window.lucide);
  if(!loading){loading=new Promise(function(res){const s=document.createElement('script');s.src=LUCIDE_URL;s.onload=function(){res(window.lucide)};s.onerror=function(){res(null)};document.head.appendChild(s);});}
  return loading;
}
function pascal(n){return n.split('-').map(function(s){return s.charAt(0).toUpperCase()+s.slice(1)}).join('')}
export function Icon({name,size=16,strokeWidth=2,color='currentColor',style}){
  const [lib,setLib]=React.useState(typeof window!=='undefined'?window.lucide||null:null);
  React.useEffect(function(){if(!lib)loadLucide().then(function(l){if(l)setLib(l)})},[]);
  let node=lib&&((lib.icons&&lib.icons[pascal(name)])||lib[pascal(name)]);
  let kids=[];
  if(Array.isArray(node))kids=node[0]==='svg'?node[2]||[]:node;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0,display:'inline-block',verticalAlign:'middle',...style}}>
    {kids.map(function(k,i){return React.createElement(k[0],{key:i,...k[1]})})}
  </svg>;
}
