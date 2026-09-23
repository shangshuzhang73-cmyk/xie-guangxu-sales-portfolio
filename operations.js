// Standalone, browser-local recreation of the portfolio's simulated workflow.
const stores = ['西安一店','西安二店','西安三店','西安四店','西安五店'];
const advisors = [
  ['陈子轩','林雨桐','张明远','李佳宁'],
  ['王文博','赵思涵','刘嘉诚','周晓彤'],
  ['吴宇航','徐若宁','孙启明','朱雅文'],
  ['高一帆','何舒然','马致远','罗欣悦'],
  ['郑凯文','宋思宁','唐景行','许安然']
];
const people = [
  {id:'N0001',name:'李女士',model:'ET5',channel:'抖音',store:0,date:'2026-09-18',stage:'待邀约试驾',note:'希望周末体验',priority:'高',last:'',scene:'到店前提醒'},
  {id:'N0007',name:'郑女士',model:'ET9',channel:'抖音',store:3,date:'2026-09-18',stage:'待邀约试驾',note:'关注家庭空间',priority:'高',last:'',scene:'到店前提醒'},
  {id:'X0721',name:'闫先生',model:'ET5',channel:'抖音',store:0,date:'2026-09-18',stage:'待首次联系',note:'需求待沟通',priority:'中',last:'',scene:'到店前提醒'},
  {id:'X0724',name:'侯女士',model:'ES9',channel:'小红书',store:0,date:'2026-09-18',stage:'待首次联系',note:'需求待沟通',priority:'中',last:'',scene:'到店前提醒'},
  {id:'X0727',name:'陶先生',model:'ES8',channel:'懂车帝',store:0,date:'2026-09-18',stage:'待首次联系',note:'需求待沟通',priority:'中',last:'',scene:'到店前提醒'},
  {id:'X0730',name:'顾女士',model:'ET9',channel:'官网留资',store:0,date:'2026-09-18',stage:'待首次联系',note:'需求待沟通',priority:'中',last:'',scene:'到店前提醒'},
  {id:'X0733',name:'龚先生',model:'ES7',channel:'蔚来App',store:1,date:'2026-09-18',stage:'待首次联系',note:'需求待沟通',priority:'中',last:'',scene:'到店前提醒'},
  {id:'N0012',name:'王先生',model:'ET5',channel:'官网留资',store:0,date:'2026-09-16',stage:'已试驾待锁单',advisor:'陈子轩',last:'2026-09-16',test:'2026-09-17',note:'正在比较配置与费用',priority:'高',scene:'试驾后问候'},
  {id:'N0013',name:'赵女士',model:'ES6',channel:'蔚来App',store:1,date:'2026-09-14',stage:'已到店待试驾',advisor:'刘嘉诚',last:'2026-09-17',visit:'2026-09-17',note:'需协调试驾时间',priority:'高',scene:'到店前提醒'},
  {id:'N0014',name:'张先生',model:'ET9',channel:'转介绍',store:2,date:'2026-09-09',stage:'已试驾待锁单',advisor:'吴宇航',last:'2026-09-10',visit:'2026-09-10',test:'2026-09-11',note:'等待家人共同决定',priority:'高',scene:'试驾后问候'},
  {id:'N0015',name:'孙女士',model:'ES8',channel:'自然进店',store:3,date:'2026-09-06',stage:'已锁单待交付',advisor:'高一帆',last:'2026-09-15',visit:'2026-09-06',test:'2026-09-08',order:'2026-09-14',delivery:'2026-09-28',note:'需确认交付资料',priority:'中',scene:'待交付关怀'},
  {id:'N0016',name:'刘先生',model:'ET5',channel:'抖音',store:4,date:'2026-09-01',stage:'已交付',advisor:'郑凯文',last:'2026-09-17',visit:'2026-09-05',test:'2026-09-06',order:'2026-09-10',delivery:'2026-09-16',note:'提车后使用反馈',priority:'中',scene:'提车后回访'},
  {id:'N0017',name:'周女士',model:'ES7',channel:'小红书',store:2,date:'2026-08-22',stage:'已试驾待锁单',advisor:'徐若宁',last:'2026-08-30',visit:'2026-08-25',test:'2026-08-27',note:'咨询交付周期',priority:'高',scene:'试驾后问候'},
  {id:'N0018',name:'何先生',model:'ET9',channel:'自然进店',store:1,date:'2026-08-11',stage:'已锁单待交付',advisor:'王文博',last:'2026-09-13',visit:'2026-08-11',test:'2026-08-13',order:'2026-09-08',delivery:'2026-09-26',note:'车辆调拨中',priority:'中',scene:'待交付关怀'},
  {id:'N0019',name:'杨女士',model:'ES6',channel:'官网留资',store:4,date:'2026-07-23',stage:'已交付',advisor:'宋思宁',last:'2026-09-12',visit:'2026-07-26',test:'2026-07-27',order:'2026-08-05',delivery:'2026-09-02',note:'持续用车关怀',priority:'中',scene:'日常需求关怀'},
  {id:'N0020',name:'马先生',model:'ET5',channel:'抖音',store:3,date:'2026-07-05',stage:'已试驾待锁单',advisor:'何舒然',last:'2026-08-28',visit:'2026-07-09',test:'2026-07-10',note:'担心预算',priority:'高',scene:'试驾后问候'}
];
const online = new Set(['抖音','小红书','懂车帝','官网留资','蔚来App']);
const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const saved = (key, fallback) => {try{return JSON.parse(localStorage.getItem('portfolio-'+key)) ?? fallback}catch{return fallback}};
const persist = (key, value) => {try{localStorage.setItem('portfolio-'+key,JSON.stringify(value))}catch{}};
let assigned = saved('assigned',{}), careNotes = saved('care',{}), targets = saved('targets',{interaction:18,invite:10,test:6,order:3});
let view = 'allocation', strategyMode = 'priority', reviewMode = 'invite', reportMode = 'day', careAudience = 'prospect', strategyPage = 0;
const asof = () => $('asof').value;
const month = () => $('reportMonth').value;
const store = () => $('store').value;
const subset = list => list.filter(p => p.date <= asof() && (!store() || stores[p.store] === store()));
const owner = p => assigned[p.id] || p.advisor || '';
const withinMonth = p => p.date.startsWith(month());
const count = (list, fn) => list.filter(fn).length;
const fmt = d => d || '待确认';
function table(headers, rows, empty='当前范围无记录') {
  return rows.length ? `<div class="table-wrap" tabindex="0" role="region" aria-label="数据表，可滚动查看"><table><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="empty">${empty}</p>`;
}
function metric(label,value,note=''){return `<div class="metric"><small>${esc(label)}</small><strong>${value}</strong><span>${esc(note)}</span></div>`}
function pill(text){return `<span class="pill">${esc(text)}</span>`}
function customerButton(p){return `<button class="link-button" onclick="openCustomer('${p.id}')"><b>${esc(p.name)}</b></button><small>${esc(p.model)} · ${esc(p.id)}</small>`}
function notify(message){$('toast').textContent=message;$('toast').hidden=false;setTimeout(()=>$('toast').hidden=true,3200)}
function dialog(title,body){$('dialogTitle').textContent=title;$('dialogBody').innerHTML=body;$('detailDialog').showModal()}
function closeDialog(){$('detailDialog').close()}
function dateScope(){const first=month()+'-01';$('globalScope').textContent=`${store()||'全部门店'}销售组 · 截至 ${asof()}`;$('dateScope').textContent=`当日：${asof()}；本月累计：${first} 至 ${asof()}；漏斗：当月新增客户截至该日的进度；待跟进与待交付：截至该日的存量。展示记录：2026-07-01 至 2026-09-18，可跨月查看历史；无记录日期不补造数据。`}
function renderAllocation(){
  const all=subset(people), leads=all.filter(p=>online.has(p.channel)), today=leads.filter(p=>p.date===asof()), unassigned=leads.filter(p=>!owner(p));
  $('allocationMetrics').innerHTML=metric('当日线上留资',today.length,'仅统计线上获客渠道')+metric('待分配',unassigned.length,'含历史待分配线上留资')+metric('当日已分配',count(today,p=>!!owner(p)),'已建立顾问归属')+metric('未首次联系',count(all,p=>!p.last),'跟进真实建联结果');
  const used=advisors.flat().map(name=>({name,total:count(leads,p=>owner(p)===name)}));
  $('allocationShare').innerHTML=table(['顾问','所属门店销售组','分配参考占比','当前承接','剩余承接'],used.filter(a=>!store()||stores[advisors.findIndex(group=>group.includes(a.name))]===store()).map(a=>{const group=advisors.findIndex(g=>g.includes(a.name));return [esc(a.name),esc(stores[group]),['30%','25%','25%','20%'][advisors[group].indexOf(a.name)],a.total,Math.max(0,5-a.total)]}));
  const state=$('allocationState').value;let rows=leads.filter(p=>state==='unassigned'?!owner(p):state==='assigned'?!!owner(p)&&p.date===asof():true);
  $('allocationTable').innerHTML=table(['客户','获客渠道／需求','归属门店','负责顾问','获取日期','操作'],rows.map(p=>[customerButton(p),`${esc(p.channel)}<small class="note-cell">${esc(p.note)}</small>`,esc(stores[p.store]),owner(p)?esc(owner(p)):pill('待分配'),esc(p.date),`<button class="primary" onclick="openAssign('${p.id}')">${owner(p)?'调整顾问':'分配顾问'}</button>`]));
  $('allocationLogic').innerHTML=table(['分配判断','执行原则'],[['来源与归属','线上留资先查重；自然进店、转介绍由原顾问持续跟进。'],['本店承接','优先核对在岗、可接待时间和剩余容量，再参考分配占比。'],['跨店协同','原顾问查询试驾与车辆资源；调整归属时先确认负责人和客户意愿。']]);
}
function renderFunnel(){
  const all=subset(people), current=all.filter(withinMonth), ordered=all.filter(p=>p.order&&p.order<=asof()&&p.order.startsWith(month())), tested=current.filter(p=>p.test&&p.test<=asof());
  $('funnelMetrics').innerHTML=metric('当月新增客户',current.length)+metric('已到店',count(current,p=>!!p.visit&&p.visit<=asof()))+metric('已试驾',tested.length)+metric('本月锁单',ordered.length);
  const stages=[['新增',current.length],['建联',count(current,p=>!!p.last)],['到店',count(current,p=>!!p.visit&&p.visit<=asof())],['试驾',tested.length],['锁单',count(current,p=>!!p.order&&p.order<=asof())]];
  $('funnelChart').innerHTML=stages.map(([label,n])=>`<div class="bar-row"><span>${label}</span><div class="bar" style="width:${Math.max(5,100*n/Math.max(1,current.length))}%"></div><b>${n}</b></div>`).join('');
  $('funnelNote').textContent='自然进店不要求先邀约；历史客户本月锁单计入业绩，不混入本月新增漏斗。';
  $('funnelGroupTable').innerHTML=table(['销售组','新增客户','试驾','锁单'],stores.filter(s=>!store()||store()===s).map(s=>[esc(s),count(current,p=>stores[p.store]===s),count(current,p=>stores[p.store]===s&&!!p.test),count(current,p=>stores[p.store]===s&&!!p.order)]));
  $('conversionActions').innerHTML='<p>优先核对未试驾客户的到店阻碍，以及已试驾客户的订车顾虑；判断原因后明确下次跟进时间。</p>';
  const names=store()?advisors[stores.indexOf(store())]:advisors.flat();const selected=$('funnelAdvisor').value;$('funnelAdvisor').innerHTML='<option value="">全部顾问</option>'+names.map(n=>`<option>${esc(n)}</option>`).join('');
  $('funnelAdvisor').value=names.includes(selected)?selected:'';const chosen=$('funnelAdvisor').value;const staff=(chosen?[chosen]:names).filter(n=>current.some(p=>owner(p)===n));
  $('funnelAdvisorTable').innerHTML=table(['顾问','当月新增','试驾','锁单'],staff.map(n=>[esc(n),count(current,p=>owner(p)===n),count(current,p=>owner(p)===n&&!!p.test),count(current,p=>owner(p)===n&&!!p.order)]));
  $('visitsTable').innerHTML=table(['门店','自然进店','邀约到店','老车主到店'],stores.filter(s=>!store()||s===store()).map(s=>[esc(s),count(all,p=>stores[p.store]===s&&p.visit===asof()&&p.channel==='自然进店'),count(all,p=>stores[p.store]===s&&p.visit===asof()&&p.channel!=='自然进店'),0]));
  const channels=[...new Set(ordered.map(p=>p.channel))];$('channelTable').innerHTML=table(['获客渠道','锁单数','占比'],channels.map(ch=>[esc(ch),count(ordered,p=>p.channel===ch),`${Math.round(100*count(ordered,p=>p.channel===ch)/Math.max(1,ordered.length))}%`]));
  $('cycleTable').innerHTML=table(['客户','建联至锁单'],ordered.map(p=>[esc(p.name),`${Math.max(1,Math.round((new Date(p.order)-new Date(p.date))/86400000)+1)} 天`]));
  $('modelTable').innerHTML=table(['车型','锁单','待交付'],[...new Set(all.map(p=>p.model))].map(m=>[esc(m),count(ordered,p=>p.model===m),count(all,p=>p.model===m&&!!p.order&&(!p.delivery||p.delivery>asof()))]));
  $('carryNote').textContent='锁单与交付按当月事件统计；待交付为截至截止日已锁单且未交付的存量。';
}
function daysSince(date){return date?Math.floor((new Date(asof())-new Date(date))/86400000):Infinity}
function bucket(p){const n=daysSince(p.last);return !Number.isFinite(n)?'待首次联系':n>30?'超30天':n>14?'超14天':n>7?'超7天':'未超时'}
function renderStrategy(){
  const all=subset(people).filter(p=>!p.order), high=all.filter(p=>p.priority==='高');let list=strategyMode==='priority'?high:all;
  const q=$('customerSearch').value.trim().toLowerCase();list=list.filter(p=>(!q||[p.name,p.id,p.model,owner(p)].some(x=>String(x).toLowerCase().includes(q)))&&(!$('strategyBucket').value||bucket(p)===$('strategyBucket').value)&&(!$('strategyStage').value||p.stage===$('strategyStage').value));
  $('strategyPriority').setAttribute('aria-pressed',String(strategyMode==='priority'));$('strategyEvidence').setAttribute('aria-pressed',String(strategyMode==='evidence'));
  $('strategyMetrics').innerHTML=metric('高意向客户',high.length)+metric('待首次联系',count(all,p=>bucket(p)==='待首次联系'))+metric('跟进超 7 天',count(all,p=>daysSince(p.last)>7&&Number.isFinite(daysSince(p.last))))+metric('已试驾待锁单',count(all,p=>!!p.test));
  const size=8,max=Math.max(0,Math.ceil(list.length/size)-1);strategyPage=Math.min(strategyPage,max);const shown=list.slice(strategyPage*size,(strategyPage+1)*size);
  $('strategyTable').innerHTML=table(['客户','阶段','顾问','跟进档位','当前事实与下一步'],shown.map(p=>[customerButton(p),esc(p.stage),esc(owner(p)||'待分配'),pill(bucket(p)),`${esc(p.note)}<br><button onclick="openCustomer('${p.id}')">查看与记录</button>`]));
  $('strategyPager').innerHTML=`<button ${strategyPage===0?'disabled':''} onclick="strategyPage--;renderStrategy()">上一页</button> <span>${strategyPage+1} / ${max+1}</span> <button ${strategyPage===max?'disabled':''} onclick="strategyPage++;renderStrategy()">下一页</button>`;
  $('objectionSummary').innerHTML='<p>先确认客户关注的是费用、配置、交付还是体验；竞品信息和政策以核实结果为准，不用猜测替代客户结论。</p>';
}
function renderReview(){
  document.querySelectorAll('[data-review]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.review===reviewMode)));
  const all=subset(people);const list=all.filter(p=>reviewMode==='invite'?!p.test&&!p.order:reviewMode==='order'?!!p.test&&!p.order:!!p.order);
  $('reviewIntro').textContent=reviewMode==='invite'?'确认最近邀约、预约日期及阻碍到店的原因。':reviewMode==='order'?'记录实际试驾日期、订车顾虑及预计订车时间。':'并列核对锁单、车辆到店、计划交付和实际提车日期。';
  $('reviewTable').innerHTML=table(['客户','负责顾问','到店','试驾','锁单','交付计划','处理动作'],list.map(p=>[customerButton(p),esc(owner(p)||'待分配'),esc(fmt(p.visit)),esc(fmt(p.test)),esc(fmt(p.order)),esc(fmt(p.delivery)),`<button onclick="openCustomer('${p.id}')">记录节点</button>`]));
  $('deliverySummary').innerHTML='<p>车辆、手续、客户时间分别落实负责人；计划日期不当作已发生结果。</p>';
}
function renderReports(){
  const all=subset(people),day=new Date(`${asof()}T12:00:00`),weekStart=new Date(day);weekStart.setDate(day.getDate()-(day.getDay()+6)%7);const from=weekStart.toISOString().slice(0,10);const period=reportMode==='day'?asof():`${from} 至 ${asof()}`;$('reportPeriod').textContent=period;
  $('reportDay').setAttribute('aria-pressed',String(reportMode==='day'));$('reportWeek').setAttribute('aria-pressed',String(reportMode==='week'));
  const eventInPeriod=d=>!!d&&(reportMode==='day'?d===asof():d>=from&&d<=asof());const inPeriod=p=>eventInPeriod(p.last);
  const actual={interaction:count(all,inPeriod),invite:count(all,p=>inPeriod(p)&&!p.visit),test:count(all,p=>eventInPeriod(p.test)),order:count(all,p=>eventInPeriod(p.order))};
  const labels={interaction:'有效互动',invite:'邀约跟进',test:'试驾',order:'锁单'};
  $('targetInputs').innerHTML=Object.keys(labels).map(key=>`<label>${labels[key]}<input type="number" min="0" id="target-${key}" value="${Number(targets[key]||0)}"></label>`).join('');
  $('targetTable').innerHTML=table(['指标','目标','完成','达成率'],Object.keys(labels).map(key=>[labels[key],targets[key]||0,actual[key],`${Math.round(100*actual[key]/Math.max(1,targets[key]||1))}%`]));
  const names=store()?advisors[stores.indexOf(store())]:advisors.flat();$('reportStaff').innerHTML=table(['顾问','有效互动','试驾','锁单'],names.filter(n=>all.some(p=>owner(p)===n)).map(n=>[esc(n),count(all,p=>owner(p)===n&&inPeriod(p)),count(all,p=>owner(p)===n&&eventInPeriod(p.test)),count(all,p=>owner(p)===n&&eventInPeriod(p.order))]));
  $('reportOverdue').innerHTML=table(['客户','顾问','状态','最近跟进'],all.filter(p=>!p.order&&daysSince(p.last)>7).map(p=>[customerButton(p),esc(owner(p)||'待分配'),pill(bucket(p)),esc(fmt(p.last))]));
  $('reportLocks').innerHTML=table(['客户','车型','顾问','锁单日期'],all.filter(p=>eventInPeriod(p.order)).map(p=>[customerButton(p),esc(p.model),esc(owner(p)),esc(p.order)]));
  $('taskTable').innerHTML=table(['任务','执行检查'],[['线索跟进','核对待首次联系及超时记录'],['车辆与交付','核对待交付客户的车辆、手续和时间'],['活动承接','核对活动客户归属与后续到店']]);
  $('activitySummary').innerHTML='<p>活动客户保留原顾问归属，不重复进入线上留资分配池。先看建联与到店，再追踪试驾和锁单。</p>';
}
function audience(p){return p.order?(p.delivery&&p.delivery<=asof()?'owner':'pending'):'prospect'}
function renderCare(){
  document.querySelectorAll('[id^="careAudience-"]').forEach(b=>b.setAttribute('aria-pressed',String(b.id==='careAudience-'+careAudience)));
  const notes={prospect:'未购车客户：按到店与试驾阶段沟通，先确认联系偏好。',owner:'车主：提车后回访并处理用车反馈。',pending:'待交付：核对车辆、手续与交付时间。'};$('careAudienceNote').textContent=notes[careAudience];
  let list=subset(people).filter(p=>audience(p)===careAudience);const scene=$('careScene').value,status=$('careStatus').value;list=list.filter(p=>(!scene||p.scene===scene)&&(!status||(careNotes[p.id]?.status||'待关怀')===status));
  $('careMetrics').innerHTML=metric('当前客户',list.length)+metric('待关怀',count(list,p=>!careNotes[p.id]||careNotes[p.id].status==='待关怀'))+metric('需协同处理',count(list,p=>careNotes[p.id]?.status==='需协同处理'))+metric('已完成',count(list,p=>careNotes[p.id]?.status==='已完成'));
  $('careTable').innerHTML=table(['客户','场景','状态','下次联系','操作'],list.map(p=>[customerButton(p),esc(p.scene),pill(careNotes[p.id]?.status||'待关怀'),esc(careNotes[p.id]?.next||'待确认'),`<button class="primary" onclick="openCare('${p.id}')">编辑关怀</button>`]));
}
function renderAll(){dateScope();renderAllocation();renderFunnel();renderStrategy();renderReview();renderReports();renderCare()}
function go(id){view=['allocation','funnel','strategy','review','reports','care'].includes(id)?id:'allocation';document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==view);document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-current',b.dataset.view===view?'page':'false'));history.replaceState(null,'','#'+view);renderAll();window.scrollTo({top:0,behavior:'smooth'})}
function openCustomer(id){const p=people.find(x=>x.id===id);if(!p)return;dialog(`${p.name} · ${p.model}`,`<p class="hint">${esc(p.id)} · ${esc(stores[p.store])} · ${esc(p.channel)}</p>${table(['节点','记录'],[['获取日期',esc(p.date)],['到店',esc(fmt(p.visit))],['试驾',esc(fmt(p.test))],['锁单',esc(fmt(p.order))],['交付',esc(fmt(p.delivery))],['负责顾问',esc(owner(p)||'待分配')]])}<p><b>当前阶段：</b>${esc(p.stage)}</p><p><b>复盘提示：</b>${esc(p.note)}</p><p><b>最近有效跟进：</b>${esc(fmt(p.last))}</p><button class="primary" onclick="openAssign('${p.id}')">${owner(p)?'调整顾问':'分配顾问'}</button>`)}
function openAssign(id){const p=people.find(x=>x.id===id);if(!p)return;dialog(`分配顾问 · ${p.name}`,`<p>归属门店：${esc(stores[p.store])}。先确认在岗与承接容量，再建立归属。</p><label>负责顾问 <select id="assignSelect">${advisors[p.store].map(n=>`<option ${owner(p)===n?'selected':''}>${esc(n)}</option>`).join('')}</select></label><p><button class="primary" onclick="confirmAssign('${p.id}')">保存分配</button></p>`)}
function confirmAssign(id){assigned[id]=$('assignSelect').value;persist('assigned',assigned);closeDialog();renderAll();notify('顾问归属已保存在当前浏览器')}
function openResources(){dialog('全国车辆资源 · 模拟查询',table(['车型','可协调车源','提示'],[['ET5','西安一店 · 2 辆','核对配置与调拨时间'],['ET9','西安四店 · 1 辆','核对客户意向'],['ES8','西安二店 · 2 辆','核对试驾资源'],['ES7','西安三店 · 1 辆','以实际资源为准']]))}
function openSchedule(){dialog('排班与容量 · 模拟查询',table(['门店','顾问','当前承接','剩余承接'],advisors.flatMap((group,i)=>group.map(n=>[esc(stores[i]),esc(n),count(people,p=>owner(p)===n),Math.max(0,5-count(people,p=>owner(p)===n))]))))}
function setStrategy(mode){strategyMode=mode;strategyPage=0;renderStrategy()}
function setReport(mode){reportMode=mode;renderReports()}
function setCareAudience(value){careAudience=value;renderCare()}
function saveTargets(){for(const key of Object.keys(targets))targets[key]=Math.max(0,Number($('target-'+key).value)||0);persist('targets',targets);renderReports();notify('目标已保存在当前浏览器')}
function exportReport(){const lines=['指标,目标,完成'];const all=subset(people);for(const [key,label] of Object.entries({interaction:'有效互动',invite:'邀约跟进',test:'试驾',order:'锁单'})){const val=key==='interaction'?count(all,p=>!!p.last&&p.last.startsWith(month())):key==='invite'?count(all,p=>!!p.last&&!p.visit):key==='test'?count(all,p=>!!p.test&&p.test.startsWith(month())):count(all,p=>!!p.order&&p.order.startsWith(month()));lines.push(`${label},${targets[key]},${val}`)}const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`销售运营报表-${month()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function openCare(id){const p=people.find(x=>x.id===id),note=careNotes[id]||{};if(!p)return;const greeting=`${p.name}您好，想了解一下${p.model}的体验和目前考虑情况。如有需要我协助确认的事项，欢迎告诉我。`;dialog(`客户关怀 · ${p.name}`,`<p class="hint">${esc(p.scene)} · 文案仅供编辑复制，不自动发送。</p><label>微信问候<textarea id="careMessage" rows="4">${esc(note.message||greeting)}</textarea></label><p><button onclick="copyCare()">复制文案</button></p><label>关怀进度 <select id="careEditStatus">${['待关怀','待客户回复','需协同处理','已完成','暂缓联系'].map(s=>`<option ${note.status===s?'selected':''}>${s}</option>`).join('')}</select></label><label>客户反馈<textarea id="careFeedback" rows="3">${esc(note.feedback||'')}</textarea></label><label>下次联系 <input id="careNext" type="date" value="${esc(note.next||'')}"></label><p><button class="primary" onclick="saveCare('${p.id}')">保存记录</button></p>`)}
function copyCare(){navigator.clipboard.writeText($('careMessage').value).then(()=>notify('文案已复制，请核对后再发送')).catch(()=>notify('请手动复制文案'))}
function saveCare(id){careNotes[id]={message:$('careMessage').value,status:$('careEditStatus').value,feedback:$('careFeedback').value,next:$('careNext').value};persist('care',careNotes);closeDialog();renderCare();notify('关怀记录已保存在当前浏览器')}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));
document.querySelectorAll('[data-review]').forEach(b=>b.addEventListener('click',()=>{reviewMode=b.dataset.review;renderReview()}));
['reportMonth','asof','store','allocationState','funnelAdvisor','customerSearch','strategyBucket','strategyStage','careScene','careStatus'].forEach(id=>$(id)?.addEventListener(id==='customerSearch'?'input':'change',()=>{strategyPage=0;renderAll()}));
$('resetFilters').addEventListener('click',()=>{$('reportMonth').value='2026-09';$('asof').value='2026-09-18';$('store').value='';renderAll();notify('筛选已重置')});
window.addEventListener('hashchange',()=>go(location.hash.slice(1)));
go(location.hash.slice(1)||'allocation');
