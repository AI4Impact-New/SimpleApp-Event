import React from 'react';
function Field({label,value,mono}){return <div style={{display:'flex',flexDirection:'column',gap:3}}><span style={{font:'400 7px/1 var(--font-mono)',letterSpacing:'0.08em',textTransform:'uppercase',color:'var(--text-muted)'}}>{label}</span><span style={{font:(mono?'400 8px/1.2 var(--font-mono)':'500 8px/1.2 var(--font-body)'),color:'var(--text-strong)'}}>{value}</span></div>}
export function Certificate({learner='Sample Learner',programme='Forward Deployed AI Engineer',capstone='Payments reconciliation copilot engagement',assessment='Passed with distinction',issued='20 Mar 2026',credentialId='IIAA-FDE-2026-000123',sample=true,style}){
  return <div style={{background:'var(--cream-50)',borderRadius:'var(--radius-3xl)',padding:16,boxShadow:'var(--shadow-float)',border:'1px solid #efeadf',...style}}>
    <div style={{border:'1.5px solid var(--cream-200)',borderRadius:'var(--radius-md)',padding:'20px 20px 18px',display:'flex',flexDirection:'column',minHeight:300,boxSizing:'border-box'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{width:18,height:18,borderRadius:5,background:'var(--navy-800)',color:'var(--white)',font:'700 7px/18px var(--font-display)',textAlign:'center'}}>A4</span>
          <span style={{display:'flex',flexDirection:'column',gap:2}}><span style={{font:'600 8px/1 var(--font-display)',color:'var(--text-strong)'}}>AI4Impact Institute of Applied AI (IIAA)</span><span style={{font:'400 7px/1 var(--font-body)',color:'var(--text-body)'}}>in academic collaboration with XYZ University</span></span>
        </div>
        {sample?<span style={{font:'400 6px/1 var(--font-mono)',letterSpacing:'0.2em',color:'var(--text-muted)'}}>SAMPLE</span>:null}
      </div>
      <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,padding:'24px 0'}}>
        <span style={{font:'400 7px/1 var(--font-mono)',letterSpacing:'0.25em',color:'var(--text-muted)'}}>THIS CERTIFIES THAT</span>
        <span style={{font:'700 22px/1.1 var(--font-display)',color:'var(--text-strong)'}}>{learner}</span>
        <span style={{font:'400 7px/1 var(--font-body)',color:'var(--text-body)'}}>has met the assessed standard for the</span>
        <span style={{font:'600 10px/1.2 var(--font-display)',color:'var(--teal-700)',textAlign:'center'}}>AI4Impact Professional Certificate in {programme}</span>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr 1fr 56px',gap:12,alignItems:'end'}}>
        <div style={{display:'flex',flexDirection:'column',gap:7}}><Field label="Course" value={programme}/><Field label="Capstone" value={capstone}/><Field label="Assessment" value={assessment}/></div>
        <div style={{display:'flex',flexDirection:'column',gap:7}}><Field label="Issued" value={issued}/><Field label="Credential ID" value={credentialId} mono/><div style={{borderTop:'1px solid var(--cream-200)',paddingTop:4,font:'400 7px/1 var(--font-body)',color:'var(--text-body)'}}>Director, IIAA</div></div>
        <div style={{borderTop:'1px solid var(--cream-200)',paddingTop:4,font:'400 7px/1 var(--font-body)',color:'var(--text-body)'}}>Dean, XYZ University</div>
        <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'center'}}><span style={{width:44,height:44,border:'1px dashed var(--slate-400)',display:'flex',alignItems:'center',justifyContent:'center',font:'400 7px/1 var(--font-mono)',color:'var(--text-muted)'}}>QR</span><span style={{font:'400 6px/1 var(--font-mono)',color:'var(--text-muted)'}}>ai4impact.in/verify</span></div>
      </div>
    </div>
  </div>;
}
