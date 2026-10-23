const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
function load(file,mocks,globals={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:name=>{if(name in mocks)return mocks[name];throw Error('Unmocked '+name)},console,...globals});return module.exports;}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
test('offline heartbeat pauses playback, serializes recovery and opens a new session without autoplay',async()=>{
 const effects=[],events={},intervals=[];let paused=0,played=0,sessions=0,beats=0,reads=0,offline=true,release;
 const player={pause(){paused++},play(){played++},replaceAsync:async()=>{},playbackRate:1};
 const react={useCallback:f=>f,useRef:v=>({current:v}),useState:v=>[v,()=>{}],useEffect:f=>effects.push(f)};
 const api={getPlayback:async()=>({session_id:'s'+(++sessions),resume_seconds:12,duration_seconds:90,expires_in:3600,url:'https://example.invalid/video'}),sendLectureProgress:async()=>{beats++;if(offline)throw Error('Network error');return{}},getCourseProgress:()=>{reads++;return new Promise(r=>{release=()=>r({classes:[{id:'lecture',duration_seconds:90,watched_seconds:12}]})})}};
 const component=load('screens/LecturePlayerScreen.tsx',{'react':react,'react/jsx-runtime':{jsx:()=>null,jsxs:()=>null},'react-native':{StyleSheet:{create:x=>x},AppState:{addEventListener:()=>({remove(){}})}},'@expo/vector-icons':{},expo:{useEventListener:(_,event,fn)=>events[event]=fn},'expo-video':{useVideoPlayer:()=>player},'@tanstack/react-query':{useQueryClient:()=>({invalidateQueries(){}})},'@/components/ScreenHeader':{},'@/components/SafeAreaView':{},'@/services/api':{api},'@/services/apiErrors':{apiErrorMessage:(_,s)=>s},'@/theme/colors':{colors:{},spacing:{},borderRadius:{}},'@/utils/datetime':{formatDuration:()=>''}},{setTimeout:()=>1,clearTimeout(){},setInterval:f=>{intervals.push(f);return 1},clearInterval(){}});
 component.LecturePlayerScreen({classId:'lecture',courseId:'course',title:'Lecture',onBack(){}});effects.forEach(f=>f());await flush();assert.equal(sessions,1);
 events.timeUpdate({currentTime:24});events.playingChange({isPlaying:true});intervals[0]();await flush();assert.equal(beats,1);assert.equal(paused,1);
 intervals[0]();intervals[0]();assert.equal(reads,1);assert.equal(beats,1);offline=false;release();await flush();assert.equal(sessions,2);assert.equal(played,0);
 events.playingChange({isPlaying:true});intervals[0]();await flush();assert.equal(beats,2);
});
test('browser alerts preserve each non-cancel action and escape dismissal',()=>{
 const nodes=[],Alert={};let viewed=0,ok=0,dismissed=0;
 const document={createElement:tag=>{const n={tag,style:{},children:[],setAttribute(){},append(...x){this.children.push(...x)},showModal(){},close(){},remove(){}};nodes.push(n);return n},body:{append(){}}};
 load('utils/webAlert.ts',{'react-native':{Alert,Platform:{OS:'web'}}},{window:{alert(){},confirm:()=>false},document});
 Alert.alert('Certificate issued','Ready',[{text:'View certificates',onPress:()=>viewed++},{text:'OK',onPress:()=>ok++}]);let d=nodes.find(n=>n.tag==='dialog');d.children.find(n=>n.textContent==='View certificates').onclick();assert.equal(viewed,1);assert.equal(ok,0);
 Alert.alert('Options','',[{text:'One'},{text:'Two'},{text:'Three'}],{onDismiss:()=>dismissed++});nodes.filter(n=>n.tag==='dialog').at(-1).oncancel({preventDefault(){}});assert.equal(dismissed,1);
});
for(const status of [500,404])test('push rotation handles old-device removal '+status,async()=>{
 let registrations=0,written=null;const stored={deviceId:'old-id',token:'old-token'};
 const api={removeDevice:async()=>{throw {response:{status}}},registerDevice:async()=>{registrations++;return{id:'new-id'}}};
 const notifications={setNotificationHandler(){},getPermissionsAsync:async()=>({status:'granted'}),getExpoPushTokenAsync:async()=>({data:'new-token'})};
 const mod=load('services/push.ts',{'react-native':{Platform:{OS:'ios'}},'expo-notifications':notifications,'expo-device':{isDevice:true},'expo-constants':{expoConfig:{extra:{eas:{projectId:'project'}}}},'@react-native-async-storage/async-storage':{getItem:async()=>null},'./api':{api},'@/utils/userStorage':{userStore:async()=>({read:async()=>stored,write:async x=>{written=x}})}},{process:{env:{}}});
 const result=await mod.registerForPush();assert.equal(result.ok,status===404);assert.equal(registrations,status===404?1:0);assert.equal(written?.deviceId,status===404?'new-id':undefined);
});
test('profile data never replaces the stored Cognito user id that keys per-user stores',async()=>{
 const store={user_data:JSON.stringify({id:'cognito-sub',email:'a@example.com'})};
 const secure={getItemAsync:async k=>store[k]??null,setItemAsync:async(k,v)=>{store[k]=v},deleteItemAsync:async k=>{delete store[k]}};
 const {authService}=load('services/auth.ts',{'aws-amplify/auth':{},'@/utils/secureStorage':secure});
 const next=await authService.updateStoredUserData({id:'database-user-id',name:'A'});
 assert.equal(next.id,'cognito-sub');assert.equal(next.name,'A');assert.equal(JSON.parse(store.user_data).id,'cognito-sub');
});
test('live class times show an end time and the device timezone',()=>{
 const dt=load('utils/datetime.ts',{},{Intl,Date});
 assert.match(dt.localTimezoneLabel(new Date()),/^GMT[+-]\d{1,2}(:\d{2})?$/);
 const range=dt.formatLocalTimeRange('2026-10-27T12:30:00Z','2026-10-27T14:00:00Z');
 assert.match(range,/–/);assert.match(range,/\(GMT[+-]/);
 assert.equal(dt.formatLocalTimeRange(null,null),'Schedule TBD');
});

test('deep links accept only exact owned paths and valid IDs',()=>{
 const {parseDeepLink}=load('utils/deepLinks.ts',{}, {URL});
 const id='00000000-0000-0000-0000-000000000001';
 for(const url of [`ai4impact://checkout/${id}`,`https://admin.ai4impact.in/checkout?source=email&order=${id}`])assert.deepEqual(JSON.parse(JSON.stringify(parseDeepLink(url))),{kind:'checkout',id});
 assert.equal(parseDeepLink(`ai4impact://course/${id}`).kind,'course');
 for(const url of [`https://evil.example/checkout/${id}`,`https://admin.ai4impact.in/unknown/checkout/${id}`,`ai4impact://checkout/${id}extra`,`http://admin.ai4impact.in/checkout?order=${id}`,`https://admin.ai4impact.in@evil.example/course/${id}`,null,'not a URL'])assert.equal(parseDeepLink(url),null);
});

test('exam requests calculate server clock offset and tolerate a missing Date header',async()=>{
 let headers={date:'Tue, 27 Oct 2026 12:00:00 GMT'};
 const deviceNow=Date.parse('2026-10-27T13:00:00Z');
 const client={interceptors:{request:{use(){}},response:{use(){}}},post:async()=>({data:{id:'attempt'},headers}),get:async()=>({data:{id:'attempt'},headers})};
 class DeviceDate extends Date{static now(){return deviceNow}}
 const {api}=load('services/api.ts',{'axios':{create:()=>client},'./auth':{authService:{}}},{process:{env:{}},Date:DeviceDate});
 assert.equal((await api.startExamAttempt('exam')).clock_offset_ms,-3600000);
 headers={};assert.equal((await api.getExamAttempt('attempt')).clock_offset_ms,0);
});
