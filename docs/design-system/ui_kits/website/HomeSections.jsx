function TracksSection({onNavigate,onExplore}){
  const {SectionHeader,Button}=window.AI4ImpactDesignSystem_a75035;
  return <Section id="tracks-home"><SectionHeader eyebrow="Career tracks" title={<>Six roles. One standard:<br/>can you do the work?</>} lead="Every track is built backwards from a real job: what the role does, what it ships and what hiring managers check." aside={<Button variant="outline" size="sm" icon="arrow-right" onClick={()=>onNavigate('compare')}>Compare all tracks</Button>}/><div style={{marginTop:40}}><TrackGrid tracks={AI4.tracks} onExplore={onExplore}/></div></Section>;
}
function FinderSection({onNavigate}){
  const {SectionHeader,ChoiceOption,Eyebrow,MetaGrid,Button}=window.AI4ImpactDesignSystem_a75035;
  const [sel,setSel]=React.useState(0);
  const t=AI4.tracks.find(x=>x.id===AI4.finder[sel][1]);
  const items=[{label:"You'll need",value:t.need||t.level},{label:'Time',value:t.dur+' · '+t.weekly+'/week'}];
  return <Section id="finder" tone="alt"><SectionHeader eyebrow="Is this right for me?" title="Start from where you want to be."/>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:40,marginTop:48,alignItems:'start'}}>
      <div style={{display:'flex',flexDirection:'column',gap:9}}><span style={{font:'400 14px/1 var(--font-body)',color:'var(--text-body)',marginBottom:10}}>What do you want to be doing in a year?</span>{AI4.finder.map((f,i)=><ChoiceOption key={f[0]} selected={i===sel} onClick={()=>setSel(i)}>{f[0]}</ChoiceOption>)}</div>
      <div style={{marginTop:24,background:'var(--surface-card)',border:'1px solid var(--border-default)',borderRadius:'var(--radius-3xl)',padding:'34px 32px 30px'}}>
        <Eyebrow line={false}>Your best-fit track</Eyebrow>
        <h3 style={{margin:'26px 0 0',font:'700 28px/1.15 var(--font-display)',letterSpacing:'-0.02em',color:'var(--text-strong)'}}>{t.title}</h3>
        <p style={{margin:'20px 0 0',font:'400 16px/1.7 var(--font-body)',color:'var(--text-body)'}}>{t.desc}</p>
        <div style={{height:1,background:'var(--border-default)',margin:'26px 0'}}></div>
        <MetaGrid items={items}/>
        {t.roles?<div style={{marginTop:20}}><MetaGrid columns={1} items={[{label:'Roles it prepares you for',value:t.roles}]}/></div>:null}
        <div style={{display:'flex',gap:12,marginTop:26}}><Button size="sm" icon="arrow-right" onClick={()=>onNavigate('tracks')}>Explore this track</Button><Button size="sm" variant="outline" onClick={()=>onNavigate('guidance')}>Still unsure? Talk to us</Button></div>
      </div>
    </div></Section>;
}
function HowSection(){
  const {SectionHeader,CellGrid,StepCell,FeatureCell}=window.AI4ImpactDesignSystem_a75035;
  const steps=[['01','Choose','Pick a role, not a topic','Six tracks, each mapped to a job you can apply for. A free call helps you choose.'],['02','Learn','Recorded lessons, weekly live help','Learn at your pace. Bring questions to the weekly clarification session.'],['03','Build','Projects on realistic data','Three or four reviewed projects and a fintech-first capstone.'],['04','Prove','Earn the professional certificate','Pass an independently reviewed capstone and defend it.'],['05','Move','Optional Programme+','Internship, mock interviews and recruiter recommendations.']];
  const feats=[['circle-play','01','Recorded lessons','Short, structured lessons you watch on your schedule.'],['hammer','02','Hands-on labs','Every week ends with something built, not just watched.'],['messages-square','03','Weekly live clarification','Bring blockers to a live session with your trainer.'],['calendar-clock','04','Assessed projects','Reviewed against a rubric, then rolled into your portfolio.']];
  return <Section id="how" tone="alt"><SectionHeader eyebrow="How AI4Impact works" title="From choosing a role to doing it." lead="Structured learning, real projects, personal guidance and career acceleration, in that order."/>
    <CellGrid columns={5} style={{marginTop:48}}>{steps.map(s=><StepCell key={s[0]} number={s[0]} title={s[1]} subtitle={s[2]} description={s[3]}/>)}</CellGrid></Section>;
}
function ProjectsSection(){
  const {SectionHeader,ProjectCard,Chip}=window.AI4ImpactDesignSystem_a75035;
  const k=s=><span style={{color:'var(--teal-400)'}}>{s}</span>;const a=<span style={{color:'var(--text-on-dark-muted)'}}>→</span>;
  const tile=(l,v)=><div style={{border:'1px solid var(--border-dark-strong)',borderRadius:4,padding:'7px 8px'}}><div>{l}</div><div style={{marginTop:4,font:'600 13px/1 var(--font-body)',color:'var(--text-on-dark)'}}>{v}</div></div>;
  const bars=[24,36,30,46,40,54,48,58,52,60];
  const p=[
    ['Forward Deployed AI Engineer','POST /v1/score',<div>{'{'}<br/>&nbsp;&nbsp;{k('"transaction_id"')}: "txn_8816",<br/>&nbsp;&nbsp;{k('"score"')}: <span style={{color:'var(--amber-500)'}}>0.87</span>,<br/>&nbsp;&nbsp;{k('"decision"')}: "review",<br/>&nbsp;&nbsp;{k('"latency_ms"')}: 41<br/>{'}'}</div>,'Merchant settlements API','A production-style API that exposes daily merchant settlements with auth, pagination and audit logs.','Synthetic merchant transactions and settlement batches',['OpenAPI spec','Test suite','Deployed endpoint']],
    ['Data & AI Platform Engineer','dags/transactions_daily.py',<div style={{paddingTop:22}}><div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}><Chip variant="code">extract</Chip>{a}<Chip variant="code">validate</Chip>{a}<Chip variant="code">load</Chip>{a}<Chip variant="code">dbt run</Chip>{a}<Chip variant="code-amber">test</Chip></div><div style={{marginTop:14}}>rows_loaded=1,284,512 · null_rate=0.02% · sla=met</div></div>,'Fintech transaction pipeline','Incremental ingestion of card transactions into a tested, documented warehouse.','Card transactions, merchants and FX rates',['DAG','dbt docs','Quality report']],
    ['Data Science, Analytics & Decision Intelligence','Payments Conversion · Power BI',<div><div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>{tile('Auth rate','94.1%')}{tile('Failed','3.2%')}{tile('Drop-off','12%')}</div><div style={{display:'flex',gap:6,alignItems:'flex-end',height:60,marginTop:14}}>{bars.map((h,i)=><div key={i} style={{flex:1,height:h,borderRadius:4,background:i===bars.length-1?'var(--amber-500)':'var(--teal-500)',opacity:i===bars.length-1?1:.85}}></div>)}</div></div>,'Payments conversion dashboard','A dashboard tracking authorisation rates, failure reasons and conversion by method and bank.','Checkout sessions and payment attempts',['Dashboard','KPI dictionary','Insight summary']]
  ];
  return <Section id="projects"><SectionHeader eyebrow="What you build" title="Projects that look like the job." lead="Pipelines, dashboards, models and agents built on realistic fintech data, then reviewed against a rubric."/>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:20,marginTop:48}}>{p.map(x=><div key={x[0]} style={{display:'flex',flexDirection:'column',gap:14,minWidth:0}}><span style={{font:'500 14px/1.3 var(--font-body)',color:'var(--text-body)'}}>{x[0]}</span><ProjectCard theme="light" title={x[3]} description={x[4]} tags={x[6]} style={{flex:1}}/></div>)}</div></Section>;
}
function CertSection(){
  const {SectionHeader,Button,Certificate,CheckCard}=window.AI4ImpactDesignSystem_a75035;
  return <Section id="cert" tone="alt"><div style={{display:'grid',gridTemplateColumns:'1fr 1.05fr',gap:56,alignItems:'center'}}><div><SectionHeader eyebrow="Certification" title={<>Earn proof of what<br/>you can actually build.</>} lead="Professional certificates are issued by the AI4Impact Institute of Applied AI (IIAA) and can be verified by any employer."/><Button size="sm" icon="arrow-right" style={{marginTop:28}}>Explore certification standards</Button></div><Certificate/></div>
    {false&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:48}}>
      <CheckCard eyebrow="What you get by finishing" title="Course completion" subtitle="You watched the lessons and submitted the work." items={['90%+ of lessons completed','All weekly assignments submitted','Quizzes attempted']} footer="Record of completion in your learner profile"/>
      <CheckCard highlighted eyebrow="What employers can verify" title="Professional certificate" subtitle="You proved you can do the work, under assessment." items={['Overall assessed score of 70% or more','Capstone passed by an independent reviewer','Capstone defence: a recorded walkthrough and Q&A']} footer="Verifiable certificate with credential ID and QR code"/>
    </div>}</Section>;
}
function ProgrammeSection(){
  const {SectionHeader,Chip,Icon,Button,CellGrid,ModuleCell}=window.AI4ImpactDesignSystem_a75035;
  const steps=['Learn','Build','Intern','Practise','Apply','Interview'];
  return <Section id="programme" tone="alt"><div style={{display:'grid',gridTemplateColumns:'1fr 1.1fr',gap:56,alignItems:'start'}}>
    <div><SectionHeader eyebrowTone="promo" eyebrow="Optional career layer" title={<>Programme+. One<br/>bundle for the<br/>move into the role.</>} lead={<>Add it to any track. Five modules that take you from a finished capstone to real interviews, for <b style={{color:'var(--text-strong)'}}>₹24,999</b>.</>}/>
      <div style={{display:'flex',flexWrap:'wrap',gap:'10px 8px',alignItems:'center',marginTop:24,maxWidth:440}}>{steps.map((s,i)=><React.Fragment key={s}><Chip>{s}</Chip>{i<steps.length-1?<Icon name="arrow-right" size={14} color="var(--text-body)"/>:null}</React.Fragment>)}</div>
      <Button size="sm" icon="arrow-right" style={{marginTop:28}}>See what Programme+ includes</Button></div>
    <CellGrid columns={2}><ModuleCell style={{gridColumn:'span 2'}} number="01" title="Real-World Internship" description="3 months on a live project, with mentor reviews." note="Freshers and recent graduates only. Subject to eligibility and project availability."/><ModuleCell number="02" title="Interview Builder" description="CV review, 10 AI-assisted mock interviews and a plan to improve."/><ModuleCell number="03" title="Recruitment Support" description="Recommendations through 10+ recruitment and consultancy relationships."/><ModuleCell number="04" title="Weekly Group Clarification" description="A recurring live session every week for questions and reviews."/><ModuleCell number="05" title="Personal Handholding" description="Five individual 30-minute sessions, booked when you need them."/></CellGrid>
  </div></Section>;
}
function TrainersSection(){
  const {SectionHeader,TrainerCard,Button}=window.AI4ImpactDesignSystem_a75035;
  return <Section id="trainers"><SectionHeader eyebrow="Trainers" title={<>Learn from people<br/>who do this work.</>}/>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:16,marginTop:44}}>{AI4.trainers.map(t=><TrainerCard key={t[0]} name={t[0]} initials={t[1]} subtitle={t[3]}/>)}</div>
    <Button variant="outline" size="sm" style={{marginTop:24}}>Meet all trainers</Button></Section>;
}
function HomeScreen({onNavigate}){
  return <div data-screen-label="Home"><HomeHero onNavigate={onNavigate}/><TracksSection onNavigate={onNavigate} onExplore={()=>onNavigate('tracks')}/><HowSection/><ProjectsSection/><CertSection/><GuidanceSection/></div>;
}
Object.assign(window,{HomeScreen});
