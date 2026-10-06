const DS=window.AI4ImpactDesignSystem_a75035;
function Section({id,tone='page',children,pad=112}){
  const bg={page:'var(--surface-page)',alt:'var(--surface-alt)',dark:'var(--bg-hero)'}[tone];
  return <section id={id} style={{background:bg,padding:pad+'px 0'}}><div style={{maxWidth:'var(--container)',margin:'0 auto',padding:'0 var(--container-pad)'}}>{children}</div></section>;
}
function TrackGrid({tracks,onExplore}){
  const {TrackCard}=DS;
  return <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16}}>{tracks.map(t=><TrackCard key={t.id} number={t.n} family={t.fam} badge={t.badge} title={t.title} description={t.desc} meta={AI4.meta(t)} onExplore={()=>onExplore&&onExplore(t)} onEnrol={()=>onExplore&&onExplore(t)}/>)}</div>;
}
function CompareSection(){
  const {SectionHeader,CompareTable}=DS;
  return <Section id="compare" tone="alt" pad={96}><SectionHeader eyebrow="Compare" title="All tracks at a glance." size="sm"/><CompareTable style={{marginTop:36}} columns={AI4.compareCols} rows={AI4.compareRows}/></Section>;
}
function GuidanceSection(){
  const {Eyebrow,Input,Select,Checkbox,Button}=DS;
  const [sent,setSent]=React.useState(false);const [ok,setOk]=React.useState(false);
  return <Section id="guidance" tone="dark" pad={104}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'start'}}>
      <div style={{paddingTop:6}}>
        <Eyebrow tone="promo" line={false}>Free career guidance</Eyebrow>
        <h2 style={{margin:'20px 0 0',font:'700 44px/1.04 var(--font-display)',letterSpacing:'-0.03em',color:'var(--text-on-dark)'}}>Not sure which<br/>role fits you?</h2>
        <p style={{margin:'22px 0 0',maxWidth:500,font:'400 17px/1.7 var(--font-body)',color:'var(--text-on-dark-body)'}}>Book a free 20-minute call. We look at your background and tell you honestly which track fits, or if none of them do yet.</p>
      </div>
      <div style={{background:'var(--surface-dark-raised)',border:'1px solid var(--border-dark)',borderRadius:'var(--radius-3xl)',padding:'30px 32px',display:'flex',flexDirection:'column',gap:20}}>
        {sent?<div style={{padding:'40px 0',display:'flex',flexDirection:'column',gap:10}}><span style={{font:'600 22px/1.2 var(--font-display)',color:'var(--text-on-dark)'}}>Request received.</span><span style={{font:'400 15px/1.6 var(--font-body)',color:'var(--text-on-dark-body)'}}>We'll be in touch to schedule your call.</span></div>:<>
        <Input label="Full name"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}><Input label="Email"/><Input label="Phone / WhatsApp" defaultValue="+91"/></div>
        <Select label="I'm interested in" options={['Not sure yet — help me choose'].concat(AI4.tracks.map(t=>t.title))}/>
        <Checkbox checked={ok} onChange={setOk}>I agree to be contacted by AI4Impact via call, SMS, email and WhatsApp about courses and services. My data is handled in line with the DPDP Act 2023.</Checkbox>
        <Button variant="light" size="md" fullWidth disabled={!ok} onClick={()=>setSent(true)}>Book free career guidance</Button></>}
      </div>
    </div>
  </Section>;
}
function SiteFooter(){
  const {Footer}=DS;
  return <Footer basePath="../../" columns={AI4.footerCols} note="Issued by the AI4Impact Institute of Applied AI (IIAA) in academic collaboration with XYZ University. Final wording is subject to the approved collaboration language." legal="© 2026 AI4Impact. Professional certificates are not academic degrees. Career support does not guarantee employment." legalRight="Learner data is handled in line with the DPDP Act 2023."/>;
}
Object.assign(window,{Section,TrackGrid,CompareSection,GuidanceSection,SiteFooter});
