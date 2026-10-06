function HeroVisual(){
  const {Icon}=window.AI4ImpactDesignSystem_a75035;
  const row=(t,done)=><span style={{display:'flex',gap:10,alignItems:'center',font:'400 14px/1.3 var(--font-body)',color:done?'var(--text-on-dark)':'var(--text-on-dark-muted)'}}><Icon name={done?'circle-check':'circle-dashed'} size={15} color={done?'var(--teal-400)':'var(--text-on-dark-muted)'}/>{t}</span>;
  return <div style={{background:'var(--surface-dark-raised)',border:'1px solid var(--border-dark)',borderRadius:'var(--radius-3xl)',padding:'28px 28px 30px'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:16}}>
      <span style={{font:'600 17px/1.3 var(--font-display)',color:'var(--text-on-dark)'}}>Data &amp; AI Platform Engineer</span>
      <span style={{font:'400 13px/1 var(--font-body)',color:'var(--text-on-dark-body)',whiteSpace:'nowrap'}}>Week 9 of 16</span>
    </div>
    <div style={{height:4,borderRadius:4,background:'var(--navy-600)',margin:'18px 0 26px'}}><div style={{width:'56%',height:'100%',borderRadius:4,background:'var(--teal-400)'}}></div></div>
    <div style={{display:'flex',flexDirection:'column',gap:14}}>{row('Lakehouse ingestion pipeline — reviewed',true)}{row('Data-quality suite — reviewed',true)}{row('Capstone — in progress',false)}</div>
  </div>;
}
function HomeHero({onNavigate}){
  const {Eyebrow,Button,Stat}=window.AI4ImpactDesignSystem_a75035;
  return <section style={{background:'var(--bg-hero)'}}>
    <div style={{maxWidth:'var(--container)',margin:'0 auto',padding:'96px var(--container-pad) 100px',display:'grid',gridTemplateColumns:'1.2fr 1fr',gap:72,alignItems:'center'}}>
      <div>
        <h1 style={{margin:0,font:'700 68px/0.98 var(--font-display)',letterSpacing:'-0.035em',color:'var(--text-on-dark)'}}>Choose the role.<br/>Build the skills.<br/><span style={{color:'var(--teal-400)'}}>Prove you can do the work.</span></h1>
        <p style={{margin:'28px 0 0',maxWidth:560,font:'400 17px/1.75 var(--font-body)',color:'var(--text-on-dark-body)'}}>AI4Impact combines structured learning, real-world projects, personal guidance and career acceleration to help you move from learning AI to doing the work.</p>
        <div style={{display:'flex',gap:12,marginTop:32}}><Button variant="light" size="lg" icon="arrow-right" onClick={()=>onNavigate('tracks')}>Explore career tracks</Button><Button variant="dark-ghost" size="lg" onClick={()=>onNavigate('guidance')}>Book free career guidance</Button></div>
      </div>
      <HeroVisual/>
    </div>
  </section>;
}
Object.assign(window,{HomeHero,HeroVisual});
