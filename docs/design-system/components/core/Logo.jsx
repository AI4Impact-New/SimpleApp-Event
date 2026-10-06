import React from 'react';
export function Logo({variant='light',height=32,basePath='',style}){
  const src=basePath+'assets/'+(variant==='dark'?'logo-dark.png':'logo-light.png');
  return <img src={src} alt="AI4Impact" style={{height:height,width:'auto',maxWidth:'none',display:'block',alignSelf:'flex-start',flexShrink:0,objectFit:'contain',...style}}/>;
}
