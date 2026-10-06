const AI4={};
AI4.tracks=[
 {id:'fde',n:'01',fam:'Build',title:'Forward Deployed AI Engineer',badge:'Flagship',desc:'Own an AI solution end to end — from client discovery to a deployed, monitored system.',level:'Advanced',dur:'12–24 weeks',weekly:'8–10 hrs',proj:'4 incl. capstone',projN:'4',fee:'₹69,999',need:'Programming fundamentals in any language',roles:'Forward Deployed Engineer · Applied AI Engineer · AI Solutions Engineer'},
 {id:'dp',n:'02',fam:'Data',title:'Data & AI Platform Engineer',desc:'Build reliable batch and streaming platforms that feed analytics and AI workloads.',level:'Intermediate',dur:'12–16 weeks',weekly:'8–10 hrs',proj:'4 incl. capstone',projN:'4',fee:'₹49,999'},
 {id:'ds',n:'03',fam:'Data',title:'Data Science, Analytics & Decision Intelligence',desc:'Turn messy business data into analysis, models and recommendations leaders act on.',level:'Beginner–Intermediate',dur:'10–12 weeks',weekly:'8–10 hrs',proj:'5 incl. capstone',projN:'5',fee:'₹39,999'},
 {id:'ml',n:'04',fam:'Build',title:'Applied AI & Machine Learning Engineer',desc:'Train, deploy and monitor ML models as reliable services, not notebook experiments.',level:'Intermediate',dur:'12–16 weeks',weekly:'8–10 hrs',proj:'4 incl. capstone',projN:'4',fee:'₹49,999'},
 {id:'gen',n:'05',fam:'Build',title:'Generative AI & Agentic Systems Engineer',desc:'Build retrieval, tool-using agents and evaluation pipelines that hold up in production.',level:'Intermediate–Advanced',dur:'10–12 weeks',weekly:'8–10 hrs',proj:'4 incl. capstone',projN:'4',fee:'₹44,999'},
 {id:'prod',n:'06',fam:'Product',title:'AI Product & Automation Builder',desc:'Find AI opportunities, write the PRD, prototype and launch workflows people adopt.',level:'All Levels',dur:'8–10 weeks',weekly:'8–10 hrs',proj:'4 incl. capstone',projN:'4',fee:'₹34,999'}
];
AI4.meta=t=>[{label:'Level',value:t.level},{label:'Duration',value:t.dur},{label:'Weekly',value:t.weekly},{label:'Projects',value:t.proj}];
AI4.finder=[['Ship AI into real businesses','fde'],['Build data platforms and pipelines','dp'],['Turn data into decisions','ds'],['Train and deploy ML models','ml'],['Build LLM apps and agents','gen'],['Lead AI products and automation','prod']];
AI4.links=[{id:'tracks',label:'Career tracks'},{id:'how',label:'How it works'},{id:'projects',label:'Projects'},{id:'cert',label:'Certification'}];
AI4.announce=['Free webinar this Sunday · Sun, 11 Oct, 11:00 AM – 1:00 PM IST','Data & GenAI Career Masterclass','Worth ₹4,999 — now FREE','Live with Puneet Nischal & team'];
AI4.trainers=[['Bhaskar M','BM','teal','Azure data engineering, Databricks and lakehouse design'],['Kamal K Naidu','KN','navy','Analytics, SQL, KPIs and business storytelling'],['Shuja L P','SL','amber','Data visualisation, storytelling and dashboards'],['Naveen G','NG','teal','Statistics, machine learning and model evaluation'],['Puneet Nischal','PN','navy','LLM applications, RAG and agentic systems'],['Ritesh','R','amber','Product discovery, PRDs, metrics and launches']];
AI4.footerCols=[{title:'Career tracks',links:AI4.tracks.map(t=>t.title)},{title:'Programme',links:['Programme+','Certification','Verify a certificate','Trainers']},{title:'For employers',links:['Hire from us','Become a partner consultancy']}];
AI4.compareCols=[{key:'title',label:'Track'},{key:'fam',label:'Family',muted:true},{key:'level',label:'Level'},{key:'dur',label:'Duration'},{key:'weeklyW',label:'Weekly effort'},{key:'projN',label:'Projects'},{key:'fee',label:'Fee',align:'right'}];
AI4.compareRows=AI4.tracks.map(t=>({...t,weeklyW:t.weekly+'/week'}));
window.AI4=AI4;
