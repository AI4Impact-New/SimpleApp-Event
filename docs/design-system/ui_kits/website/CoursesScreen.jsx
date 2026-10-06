function CoursesScreen({onNavigate}){
  const {SectionHeader,Eyebrow}=window.AI4ImpactDesignSystem_a75035;
  const by=f=>AI4.tracks.filter(t=>t.fam===f).map((t,i)=>({...t,n:String(i+1).padStart(2,'0')}));
  const groups=[['Build','Build tracks','Ship AI systems into production.','page'],['Data','Data tracks','Build the data that AI runs on.','alt'],['Product','Product tracks','Decide what gets built, and why.','page']];
  return <div data-screen-label="Career tracks">
    <section style={{background:'var(--bg-hero)'}}><div style={{maxWidth:'var(--container)',margin:'0 auto',padding:'96px var(--container-pad) 104px'}}>
      <h1 style={{margin:0,font:'700 56px/1.02 var(--font-display)',letterSpacing:'-0.035em',color:'var(--text-on-dark)'}}>Pick the role<br/>you want to do.</h1>
      <p style={{margin:'26px 0 0',maxWidth:600,font:'400 17px/1.75 var(--font-body)',color:'var(--text-on-dark-body)'}}>Each track is designed backwards from a job: what it ships, what it is measured on and what a hiring manager checks.</p>
    </div></section>
    {groups.map(g=><Section key={g[0]} tone={g[3]} pad={96}><SectionHeader eyebrow={g[1]} title={g[2]} size="sm"/><div style={{marginTop:36}}><TrackGrid tracks={by(g[0])} onExplore={()=>onNavigate('guidance')}/></div></Section>)}
    <CompareSection/><GuidanceSection/>
  </div>;
}
Object.assign(window,{CoursesScreen});
