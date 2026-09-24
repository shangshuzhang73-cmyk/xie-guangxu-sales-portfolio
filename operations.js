'use strict';
const Core={
 onlineLead(l){return l.acquisitionType==='线上留资'},
 allocatable(l,d){return this.onlineLead(l)&&!l.advisor&&!this.happened(l.lock,d)&&!l.visits.some(v=>v.at<=d)},
 careSegment(l,d){return this.happened(l.ownerSince,d)||this.happened(l.delivery,d)?'owner':this.happened(l.lock,d)?'pending':'prospect'},
 careDue(c,d){return c.status!=='暂缓联系'&&(c.next?c.next<=d:c.status==='待关怀'&&c.due<=d)},
 days(a,b){return Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000)},
 add(a,n){return new Date(Date.parse(a+'T00:00:00Z')+n*86400000).toISOString().slice(0,10)},
 happened(v,d){return !!v&&v<=d},
 period(d,k){return {start:k==='month'?d.slice(0,7)+'-01':k==='week'?this.add(d,-((new Date(d+'T00:00:00Z').getUTCDay()+6)%7)):d,end:d}},
 inside(v,p){return !!v&&v>=p.start&&v<=p.end},
 last(l,d){return (l.followups||[]).filter(v=>v<=d).sort().slice(-1)[0]||null},
 overdue(l,d){const last=this.last(l,d);if(!last)return {last:null,days:null,bucket:'待首次联系'};let days=this.days(last,d);return {last,days,bucket:days>30?'超30天':days>14?'超14天':days>7?'超7天':'未超时'}},
 stage(l,d){return this.happened(l.delivery,d)?'已交付':this.happened(l.lock,d)?'已锁单待交付':this.happened(l.drive,d)?'已试驾待锁单':l.visits.some(v=>v.at<=d)?'已到店待试驾':'待邀约试驾'},
 pool(rows,d){return rows.filter(l=>!this.happened(l.lock,d)&&(this.happened(l.highAt,d)||this.happened(l.drive,d)||this.overdue(l,d).bucket!=='未超时'))},
 pending(rows,d){return rows.filter(l=>this.happened(l.lock,d)&&!this.happened(l.delivery,d))},
 funnel(rows,d){return [rows.length,rows.filter(l=>this.happened(l.connect,d)).length,rows.filter(l=>this.happened(l.invited,d)).length,rows.filter(l=>l.visits.some(v=>v.at<=d)).length,rows.filter(l=>this.happened(l.drive,d)).length,rows.filter(l=>this.happened(l.lock,d)).length]},
 visits(rows,d){return rows.flatMap(l=>{let v=l.visits.find(v=>v.at===d);return v?[{...v,id:l.id,store:l.store}]:[]})},
 stats(rows,p){return [rows.filter(l=>(l.followups||[]).some(v=>this.inside(v,p))).length,rows.filter(l=>this.inside(l.invited,p)).length,rows.filter(l=>this.inside(l.drive,p)).length,rows.filter(l=>this.inside(l.lock,p)).length]},
 channels(rows,d){let locks=rows.filter(l=>this.inside(l.lock,this.period(d,'month')));return [...new Set(locks.map(l=>l.source))].map(source=>({source,count:locks.filter(l=>l.source===source).length,total:locks.length})).sort((a,b)=>b.count-a.count)},
 payroll(rows,d,rates){let delivered=rows.filter(l=>this.inside(l.delivery,this.period(d,'month'))),pending=this.pending(rows,d);return {delivered,pending,payable:delivered.reduce((v,l)=>v+rates[l.model],0),expected:pending.reduce((v,l)=>v+rates[l.model],0)}}
};
if(typeof module!=='undefined')module.exports=Core;
if(typeof document!=='undefined'){
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const models=OPS_DATA.models,viewNames=['allocation','funnel','strategy','review','reports','care'];
let state={assignments:{},notes:{},targets:{},shifts:{},tasks:{},care:{}},activeView='allocation',reviewMode='invite',reportMode='day',page=0,toastTimer;
try{let saved=JSON.parse(localStorage.getItem('sales-ops-v6')||'null');if(saved)state={...state,...saved}}catch{}
function persist(){try{localStorage.setItem('sales-ops-v6',JSON.stringify(state))}catch{toast('浏览器存储不可用，本次修改仅保留到页面关闭。')}}
function toast(t){$('toast').textContent=t;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000)}
const day=()=>$('asof').value,month=()=>Core.period(day(),'month');
function allRows(){return OPS_DATA.leads.filter(l=>l.acquired<=day()).map(l=>{let assigned=state.assignments[l.id];return {...l,advisor:assigned&&Core.onlineLead(l)&&!l.advisor&&assigned.at<=day()?assigned.advisor:l.advisor}})}
function rows(){return allRows().filter(l=>!$('store').value||l.store===$('store').value)}
const staff=()=>OPS_DATA.staff.filter(s=>!$('store').value||s.store===$('store').value),advisor=id=>OPS_DATA.staff.find(s=>s.id===id);
function person(l){return '<div class="person"><button class="link-button" onclick="openCustomer(\''+l.id+'\')"><span class="avatar" aria-hidden="true">'+esc(l.customer[0])+'</span><b>'+esc(l.customer)+'</b></button><small>'+esc(l.model)+' · '+esc(l.id)+'</small></div>'}
function owner(l){const s=advisor(l.advisor);return s?'<b>'+esc(s.name)+'</b><small>'+esc(l.store)+'</small>':'<span class="pill warn">待分配</span><small>'+esc(l.store)+'</small>'}
const dateCell=v=>'<span class="date-cell">'+esc(v||'未安排')+'</span>';
const actual=v=>dateCell(Core.happened(v,day())?v:null).replace('未安排','未发生');
const pill=(t,k='')=>'<span class="pill '+k+'">'+esc(t)+'</span>';
const note=(l)=>{let n=state.notes[l.id];return n&&n.at<=day()?n:{reason:l.reason,action:l.action,appointment:l.appointment,orderPlan:l.orderPlan,deliveryPlan:l.deliveryPlan,confirmed:false}};
function overdueCell(l){let o=Core.overdue(l,day());return pill(o.bucket,o.days>30?'bad':o.days>7||o.days===null?'warn':'')+'<small>'+(o.days===null?'尚无有效跟进记录':'距最近跟进 '+o.days+' 天')+'</small>'}
function table(headers,data){if(!data.length)return '<div class="empty">当前范围暂无记录。可切换日期、门店或筛选条件。</div>';return '<div class="table-wrap responsive-table" tabindex="0" role="region" aria-label="数据表，可滚动查看"><table><thead><tr>'+headers.map(x=>'<th scope="col">'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+data.map(r=>'<tr>'+r.map((v,i)=>'<td data-label="'+esc(headers[i]||'')+'">'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'}
function metrics(id,data){$(id).innerHTML=data.map(([name,value,sub])=>'<div class="metric"><small>'+esc(name)+'</small><strong>'+esc(value)+'</strong><span>'+esc(sub||'')+'</span></div>').join('')}
function bar(n,total){let p=total?n/total*100:0;return '<div class="bar"><div class="track"><div class="fill" style="width:'+p+'%"></div></div><span>'+p.toFixed(1)+'%</span></div>'}
function modal(title,body){$('dialogTitle').textContent=title;$('dialogBody').innerHTML=body;if(!$('detailDialog').open)$('detailDialog').showModal()}
function allocationCapacity(s){let shift=state.shifts[s.id+'@'+day()]||s.shift;const own=allRows().filter(l=>l.advisor===s.id),booked=own.filter(l=>note(l).appointment===day()&&!Core.happened(l.lock,day())),assigned=own.filter(l=>state.assignments[l.id]?.at===day()||l.acquired===day()),occupied=new Set([...booked,...assigned].map(l=>l.id)).size;return {shift,booked:booked.length,assigned:assigned.length,left:shift==='休息'?0:Math.max(0,s.capacity-occupied)}}
function assignLead(id){let s=advisor($('assignAdvisor').value),l=allRows().find(l=>l.id===id);if(!l||!Core.allocatable(l,day())||!s||s.store!==l.store||allocationCapacity(s).left<1){toast('当前顾问无法承接，请核对归属与容量。');return}state.assignments[id]={advisor:s.id,at:day()};persist();$('detailDialog').close();refresh();toast('已分配给'+s.name+'，下一步确认需求与邀约安排。')}
function openSchedule(){modal('排班与承接容量','<p class="hint">'+day()+' · 日级承接上限为5组；当日预约与新接收客户按客户去重，同一客户只占一个名额。试驾仍需确认具体时段。</p>'+table(['顾问','门店','班次','当日预约','当日新接收','剩余名额'],staff().map(s=>{let c=allocationCapacity(s);return [esc(s.name),esc(s.store),'<select aria-label="'+esc(s.name)+'班次" onchange="changeShift(\''+s.id+'\',this.value)">'+['早班','晚班','休息'].map(v=>'<option'+(v===c.shift?' selected':'')+'>'+v+'</option>').join('')+'</select>',c.booked,c.assigned,c.left]})))}
function changeShift(id,value){state.shifts[id+'@'+day()]=value;persist();openSchedule();toast('班次已更新，后续分配按新容量校验。')}
function renderFunnel(){setFunnelOptions();let a=funnelRows(),d=day(),cohort=a.filter(l=>Core.inside(l.acquired,month())),locked=a.filter(l=>Core.inside(l.lock,month())),delivered=a.filter(l=>Core.inside(l.delivery,month())),pending=Core.pending(a,d),counts=Core.funnel(cohort,d);metrics('funnelMetrics',[['本月新增线索',cohort.length,month().start+' 至 '+day()],['本月锁单',locked.length,'本月新增客户 '+locked.filter(l=>Core.inside(l.acquired,month())).length+' 单 · 历史客户 '+locked.filter(l=>!Core.inside(l.acquired,month())).length+' 单'],['本月交付',delivered.length,month().start+' 至 '+day()],['当前待交付',pending.length,'已锁单、尚未提车']]);$('funnelChart').innerHTML=['当月新增','成功建联','已到店','已试驾','已锁单'].map((n,j)=>{const i=[0,1,3,4,5][j];return '<div class="stage">'+n+'<strong>'+counts[i]+'</strong><small>'+(i===0?'队列总量':'占队列 '+(counts[0]?counts[i]/counts[0]*100:0).toFixed(1)+'%')+'</small></div>'}).join('');let direct=cohort.filter(l=>Core.happened(l.lock,d)&&!Core.happened(l.drive,d)).length;$('funnelNote').textContent='本月新增客户的线索→锁单率 '+(cohort.length?(counts[5]/cohort.length*100).toFixed(1):'0.0')+'%。已试驾未锁单 '+cohort.filter(l=>Core.happened(l.drive,d)&&!Core.happened(l.lock,d)).length+' 位；高意向未试驾 '+cohort.filter(l=>Core.happened(l.highAt,d)&&!Core.happened(l.drive,d)&&!Core.happened(l.lock,d)).length+' 位。未经过试驾直接锁单 '+direct+' 位。邀约单独统计：本月新增线上客户中已有邀约 '+cohort.filter(l=>Core.onlineLead(l)&&Core.happened(l.invited,d)).length+' 位；自然进店无需先经过邀约。';let visits=Core.visits(a,d),stores=[...new Set(staff().map(s=>s.store))];$('visitsTable').innerHTML=table(['门店','自然进店','邀约到店','老车主到店','进店客户合计'],[...stores.map(st=>{let v=visits.filter(v=>v.store===st);return [st,...['自然进店','邀约到店','老车主到店'].map(r=>v.filter(x=>x.route===r).length),'<b>'+v.length+'</b>']}),['合计',...['自然进店','邀约到店','老车主到店'].map(r=>visits.filter(x=>x.route===r).length),'<b>'+visits.length+'</b>']]);$('channelTable').innerHTML=table(['获客渠道','锁单客户','锁单占比'],Core.channels(a,d).map(c=>[esc(c.source),'<b>'+c.count+'</b>',bar(c.count,c.total)]));let cycles=locked.filter(l=>l.connect).map(l=>Core.days(l.connect,l.lock)+1);$('cycleTable').innerHTML=table(['成交周期','锁单客户','占比'],[['7天内',x=>x<=7],['8—30天',x=>x>=8&&x<=30],['超过30天',x=>x>30]].map(([n,f])=>{let count=cycles.filter(f).length;return [n,count,bar(count,cycles.length)]}));$('modelTable').innerHTML=table(['车型','锁单','交付','待交付'],models.map(m=>[m,locked.filter(l=>l.model===m).length,delivered.filter(l=>l.model===m).length,pending.filter(l=>l.model===m).length]));renderDimensions(cohort);$('carryNote').textContent='月初已锁单未交付的结转 '+a.filter(l=>l.lock&&l.lock<month().start&&(!l.delivery||l.delivery>=month().start)).length+' 台；仅为库存口径补充，不计入本月新增锁单。'}
function strategyRows(){let q=$('customerSearch').value.trim().toLowerCase();return Core.pool(rows(),day()).filter(l=>(!q||[l.id,l.customer,l.model,advisor(l.advisor)?.name].join(' ').toLowerCase().includes(q))&&(!$('strategyBucket').value||Core.overdue(l,day()).bucket===$('strategyBucket').value)&&(!$('strategyStage').value||Core.stage(l,day())===$('strategyStage').value)).sort((a,b)=>(Core.overdue(b,day()).days??1000)-(Core.overdue(a,day()).days??1000))}
function changePage(n){page+=n;renderStrategy()}
function renderReview(){let a=rows(),d=day(),filter={invite:l=>Core.happened(l.highAt,d)&&!Core.happened(l.drive,d)&&!Core.happened(l.lock,d),order:l=>Core.happened(l.drive,d)&&!Core.happened(l.lock,d),delivery:l=>Core.happened(l.lock,d)};let list=a.filter(filter[reviewMode]);document.querySelectorAll('[data-review]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.review===reviewMode)));$('reviewIntro').textContent={invite:'重点复盘：高意向为什么还没有试驾？明确阻力、已约日期和接待安排。',order:'重点复盘：试驾后为什么还没有锁单？逐客核对顾虑和预计订车时间。',delivery:'重点复盘：锁单后车辆是否到店、何时准备交付、客户是否已提车？计划与实际分列。'}[reviewMode];let headers=reviewMode==='delivery'?['客户／顾问','锁单日期','车辆实际到店','计划交付','实际提车','当前状态','下一步／操作']:reviewMode==='order'?['客户／顾问','实际试驾','预计订车','未锁单原因','下一步','操作']:['客户／顾问','高意向确认','最近邀约','预约试驾','未试驾原因','下一步','操作'];$('reviewTable').innerHTML=table(headers,list.map(l=>{let n=note(l),who=person(l)+'<small>负责：'+esc(advisor(l.advisor)?.name||'待分配')+'</small>',button='<button onclick="openCustomer(\''+l.id+'\')">更新节点</button>',reason='<div class="note-cell">'+esc(n.reason)+'</div>',action='<div class="note-cell">'+esc(n.action)+'</div>';return reviewMode==='delivery'?[who,actual(l.lock),actual(l.arrived),dateCell(n.deliveryPlan),actual(l.delivery),pill(Core.stage(l,d),Core.happened(l.delivery,d)?'':'warn'),action+button]:reviewMode==='order'?[who,actual(l.drive),dateCell(n.orderPlan),reason,action,button]:[who,actual(l.highAt),actual(l.invited),dateCell(n.appointment),reason,action,button]}))}
function openCustomer(id){let l=allRows().find(l=>l.id===id);if(!l)return;let n=note(l),events=[['获取线索',l.acquired],['首次建联',l.connect],['确认高意向',l.highAt],['发出邀约',l.invited],...l.visits.map(v=>['实际到店 · '+v.route,v.at]),['实际试驾',l.drive],['锁单',l.lock],['车辆到店',l.arrived],['实际提车',l.delivery]].filter(e=>Core.happened(e[1],day())).sort((a,b)=>a[1].localeCompare(b[1]));modal(l.customer+' · '+l.model,'<p>'+esc(l.id)+' · '+esc(advisor(l.advisor)?.name||'待分配')+' · '+esc(l.store)+'　'+overdueCell(l)+'</p>'+table(['已发生节点','日期'],events.map(([n,d])=>[esc(n),d]))+'<div class="form-grid"><label class="wide">初步原因／核对结果<textarea id="editReason" maxlength="500">'+esc(n.reason)+'</textarea></label><label class="wide">下一步行动<textarea id="editAction" maxlength="500">'+esc(n.action)+'</textarea></label>'+[['editAppointment','预约试驾',n.appointment],['editOrder','预计订车',n.orderPlan],['editDelivery','计划交付',n.deliveryPlan]].map(([id,label,value])=>'<label>'+label+'<input type="date" id="'+id+'" value="'+esc(value||'')+'"></label>').join('')+'<label><span>原因核对</span><span><input type="checkbox" id="editConfirmed" '+(n.confirmed?'checked':'')+'> 已与负责销售确认</span></label></div><p class="hint">保存计划与核对意见，不会自动生成试驾、锁单、交付或新的销售跟进记录。</p><button class="primary" onclick="saveCustomer(\''+id+'\')">保存复盘记录</button>')}
function saveCustomer(id){let values={appointment:$('editAppointment').value||null,orderPlan:$('editOrder').value||null,deliveryPlan:$('editDelivery').value||null};let l=allRows().find(l=>l.id===id);if(values.orderPlan&&l.drive&&values.orderPlan<l.drive||values.deliveryPlan&&l.lock&&values.deliveryPlan<l.lock){toast('预计订车不能早于实际试驾，计划交付不能早于锁单。');return}state.notes[id]={...values,reason:$('editReason').value.trim(),action:$('editAction').value.trim(),confirmed:$('editConfirmed').checked,at:day()};persist();$('detailDialog').close();refresh();toast('已保存复盘安排；实际业务节点保持不变。')}
const reportKey=()=>[reportMode,Core.period(day(),reportMode).start,day(),$('store').value||'all'].join('|');
function targets(){return state.targets[reportKey()]||[12,6,4,2].map(n=>n*($('store').value?1:5)*(Core.days(Core.period(day(),reportMode).start,day())+1))}
function renderReports(){let a=rows(),p=Core.period(day(),reportMode),done=Core.stats(a,p),target=targets(),labels=['有效互动客户','邀约客户','实际试驾','锁单'];$('reportPeriod').textContent=p.start+' 至 '+p.end+' · '+($('store').value||'全部门店')+'；默认目标按每日目标 × 已统计自然日计算，可按实际计划调整。周内客户去重统计。';$('reportDay').setAttribute('aria-pressed',String(reportMode==='day'));$('reportWeek').setAttribute('aria-pressed',String(reportMode==='week'));$('targetInputs').innerHTML=labels.map((n,i)=>'<label>'+n+'<input id="target'+i+'" type="number" min="0" max="100000" step="1" value="'+target[i]+'"></label>').join('');$('targetTable').innerHTML=table(['指标','目标','完成','完成率','差额'],labels.map((n,i)=>[n,target[i],done[i],target[i]?(done[i]/target[i]*100).toFixed(1)+'%':'未设目标',Math.max(0,target[i]-done[i])]));$('reportStaff').innerHTML=table(['顾问','门店',...labels],staff().map(s=>[esc(s.name),esc(s.store),...Core.stats(a.filter(l=>l.advisor===s.id),p)]));let overdue=a.filter(l=>!Core.happened(l.lock,day())&&Core.overdue(l,day()).bucket!=='未超时');$('reportOverdue').innerHTML=table(['客户','顾问','最近跟进','超时','下一步'],overdue.map(l=>[person(l),owner(l),esc(Core.last(l,day())||'无记录'),overdueCell(l),'<div class="note-cell">'+esc(note(l).action)+'</div>']));$('reportLocks').innerHTML=table(['锁单日期','客户','顾问','车型','获客来源'],a.filter(l=>Core.inside(l.lock,p)).map(l=>[dateCell(l.lock),person(l),owner(l),l.model,esc(l.source)]));$('taskTable').innerHTML=table(['任务','核对要求','状态'],[['试驾准备','核对车辆状态、时段与接待安排'],['政策与物料','核对有效期、适用车型与展示内容'],['交付准备','核对车辆、手续与客户提车时间']].map(([name,desc],i)=>[name,desc,'<select aria-label="'+name+'状态" onchange="setTask('+i+',this.value)">'+['待执行','处理中','已核对'].map(t=>'<option'+((state.tasks[i]||'待执行')===t?' selected':'')+'>'+t+'</option>').join('')+'</select>']))}
function renderTaskProgress(){const values=[0,1,2].map(i=>state.tasks[i]||'待执行');$('taskProgress').textContent='3 项执行任务 · 已核对 '+values.filter(v=>v==='已核对').length+' 项 · 处理中 '+values.filter(v=>v==='处理中').length+' 项 · 待执行 '+values.filter(v=>v==='待执行').length+' 项';}
function setTask(i,v){state.tasks[i]=v;persist();renderTaskProgress()}
function setReport(mode){reportMode=mode;renderReports()}
function saveTargets(){let t=[0,1,2,3].map(i=>Number($('target'+i).value));if(t.some(n=>!Number.isInteger(n)||n<0||n>100000)){toast('请输入0至100000的整数目标。');return}state.targets[reportKey()]=t;persist();renderReports();toast('当前范围的目标已保存。')}
function download(text,name){let url=URL.createObjectURL(new Blob(['\ufeff'+text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function exportReport(){let a=rows(),p=Core.period(day(),reportMode),done=Core.stats(a,p);let lines=['销售运营'+(reportMode==='day'?'日报':'周报')+'（模拟数据）',p.start+' 至 '+p.end+' / '+($('store').value||'全部门店'),'指标：有效互动 / 邀约 / 试驾 / 锁单','目标：'+targets().join(' / '),'完成：'+done.join(' / '),'\n未跟进与超时客户'];a.filter(l=>!Core.happened(l.lock,day())&&Core.overdue(l,day()).bucket!=='未超时').forEach(l=>lines.push([l.id,l.customer,advisor(l.advisor)?.name||'待分配',Core.overdue(l,day()).bucket,note(l).action].join(' / ')));lines.push('\n锁单通晒');a.filter(l=>Core.inside(l.lock,p)).forEach(l=>lines.push([l.lock,l.customer,advisor(l.advisor)?.name,l.model,l.source].join(' / ')));download(lines.join('\n'),'销售运营'+(reportMode==='day'?'日报':'周报')+'-'+day()+'.txt')}
function refresh(){if(!day()||day()>OPS_DATA.asof)$('asof').value=OPS_DATA.asof;$('reportMonth').value=day().slice(0,7);const start=OPS_DATA.leads.map(l=>l.acquired).sort()[0];$('globalScope').textContent=($('store').value||'全部门店销售组')+' · 截至 '+day();$('dateScope').textContent='当日：'+day()+'；本月累计：'+month().start+' 至 '+day()+'；漏斗：当月新增客户截至该日的进度；待跟进与待交付：截至该日的存量。展示记录：'+start+' 至 '+OPS_DATA.asof+'，可跨月查看历史；无记录日期不补造数据。';({allocation:renderAllocation,funnel:renderFunnel,strategy:renderStrategy,review:renderReview,reports:renderReports,care:renderCare})[activeView]();renderBusinessSummary()}
function go(view){if(!viewNames.includes(view))view='allocation';activeView=view;document.querySelectorAll('.page').forEach(el=>el.hidden=el.id!==view);document.querySelectorAll('[data-view]').forEach(b=>{if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});history.replaceState(null,'','#'+view);refresh()}
let resourcePage=0,strategyMode='priority',careAudience='prospect';
function renderAllocation(){
 const a=rows().filter(l=>Core.onlineLead(l)),today=a.filter(l=>l.acquired===day());
 metrics('allocationMetrics',[['当日线上留资',today.length,'仅统计线上获客渠道'],['待分配',a.filter(l=>Core.allocatable(l,day())).length,'含历史待分配线上留资'],['当日已分配',today.filter(l=>l.advisor).length,'已建立顾问归属'],['未首次联系',today.filter(l=>!Core.happened(l.connect,day())).length,'跟进真实建联结果']]);
 const shareStore=$('allocationShareStore'),selectedStore=$('store').value||shareStore.value||OPS_DATA.stores[0];
 shareStore.value=selectedStore;shareStore.disabled=!!$('store').value;
 $('allocationShare').innerHTML=table(['顾问','参考／实际占比','当日接收','剩余名额'],staff().filter(s=>s.store===selectedStore).map(s=>{const total=today.filter(l=>l.store===s.store&&l.advisor).length,count=today.filter(l=>l.advisor===s.id).length;return ['<b>'+esc(s.name)+'</b>','<b>'+s.weight+'%</b><small>实际 '+(total?(count/total*100).toFixed(1)+'%':'—')+'</small>',count,allocationCapacity(s).left]}));
 const mode=$('allocationState').value,list=mode==='all'?a:mode==='assigned'?today.filter(l=>!!l.advisor):a.filter(l=>Core.allocatable(l,day()));
 $('allocationTable').innerHTML=table(['客户','获客渠道／需求','归属门店','负责顾问','获取日期','操作'],list.map(l=>[person(l),esc(l.source)+'<small class="note-cell">'+esc(l.evidence)+'</small>',esc(l.store),owner(l),dateCell(l.acquired),!Core.allocatable(l,day())?'<button onclick="openCustomer(\''+l.id+'\')">查看跟进</button>':'<button class="primary" onclick="openAssign(\''+l.id+'\')">分配顾问</button>']));
}
function openAssign(id){
 const l=allRows().find(l=>l.id===id);if(!l||!Core.allocatable(l,day()))return;
 const today=allRows().filter(x=>Core.onlineLead(x)&&x.acquired===day()&&x.store===l.store), candidates=OPS_DATA.staff.filter(s=>s.store===l.store).sort((a,b)=>today.filter(l=>l.advisor===a.id).length/a.weight-today.filter(l=>l.advisor===b.id).length/b.weight);
 modal('分配顾问 · '+l.customer,'<p>'+esc(l.store)+' · '+esc(l.source)+' · '+esc(l.model)+'</p><p class="hint">参考门店内分配占比，优先展示当前接收较少的顾问；在岗、接待容量及客户已有归属优先于比例。</p>'+table(['顾问','所属门店销售组','参考占比','今日接收','剩余名额'],candidates.map(s=>[esc(s.name),s.store,s.weight+'%',today.filter(l=>l.advisor===s.id).length,allocationCapacity(s).left]))+'<div class="form-grid"><label>接收顾问<select id="assignAdvisor">'+candidates.map(s=>'<option value="'+s.id+'" '+(!allocationCapacity(s).left?'disabled':'')+'>'+esc(s.name)+' · '+s.store+'</option>').join('')+'</select></label></div><button class="primary" onclick="assignLead(\''+id+'\')">确认分配</button>');
}
function openResources(){
 resourcePage=0;
 const options=(id,label,values)=>'<label>'+label+'<select id="'+id+'" aria-label="'+label+'" onchange="resourcePageChange(0,true)"><option value="">全部</option>'+values.map(v=>'<option>'+esc(v)+'</option>').join('')+'</select></label>';
 modal('全国车辆资源台账','<p class="hint">资源快照：2026-09-18 09:00 · '+OPS_DATA.inventory.length+' 辆 · 用途、配置、在库与在途分别查询。全国资源范围不随西安门店筛选缩小。</p><div class="toolbar">'+options('resourceModel','车型',models)+options('resourceUse','车辆用途',['库存车','试驾车','展车'])+options('resourceStatus','车辆状态',[...new Set(OPS_DATA.inventory.map(v=>v.status))])+options('resourceCity','所在城市',[...new Set(OPS_DATA.inventory.map(v=>v.city))])+options('resourceSeats','座位布局',[...new Set(OPS_DATA.inventory.map(v=>v.seats))])+options('resourceColor','车身颜色',[...new Set(OPS_DATA.inventory.map(v=>v.color))])+'</div><div id="resourceMetrics" class="cards"></div><div id="resourceResults"></div><div id="resourcePager" class="pagination"></div><details><summary>车型与配置参考来源</summary><p class="hint">核对日期：2026-09-18。车型按蔚来官网目录整理；单车数量、位置和配置组合用于业务台账展示，不代表实时库存或中国区可订组合。未核实的轮毂尺寸保留待确认，不以“高配”代替配置明细。</p><p>'+OPS_DATA.catalog.map(m=>'<a target="_blank" rel="noopener" href="'+m.url+'">'+m.model+'</a>').join(' · ')+'</p><p><a href="https://www.nio.com/news/20250525001" target="_blank" rel="noopener">ET5／ET5T 轮毂参考</a> · <a href="https://www.nio.com/en_US/news/20250516001" target="_blank" rel="noopener">ES6／EC6 轮毂参考</a></p></details>');renderResources();
}
function resourcePageChange(n,reset=false){resourcePage=reset?0:resourcePage+n;renderResources()}
function renderResources(){
 let list=OPS_DATA.inventory.filter(v=>[['resourceModel','model'],['resourceUse','use'],['resourceStatus','status'],['resourceCity','city'],['resourceSeats','seats'],['resourceColor','color']].every(([id,key])=>!$(id).value||v[key]===$(id).value));
 const pages=Math.max(1,Math.ceil(list.length/10));resourcePage=Math.max(0,Math.min(resourcePage,pages-1));
 metrics('resourceMetrics',[['筛选结果',list.length,'辆'],['库存车',list.filter(v=>v.use==='库存车').length,'包含在途、预留'],['试驾车',list.filter(v=>v.use==='试驾车').length,'可预约与保养分列'],['展车',list.filter(v=>v.use==='展车').length,'静态体验资源']]);
 $('resourceResults').innerHTML=table(['车辆／用途','车型／颜色','轮毂／座位布局','所在地／状态','实际入库／库龄','预计到达／可用时间','资源说明'],list.slice(resourcePage*10,resourcePage*10+10).map(v=>[v.id+'<small>'+v.use+'</small>','<b>'+v.model+'</b><small>'+v.color+'</small>',v.wheel+'<small>'+v.seats+'</small>',v.location+'<small>'+pill(v.status,['在途','保养中','已预留'].includes(v.status)?'warn':'')+'</small>',v.arrived?dateCell(v.arrived)+'<small>库龄 '+Core.days(v.arrived,OPS_DATA.asof)+' 天</small>':'未入库',v.eta?'预计到达 '+dateCell(v.eta):v.use==='试驾车'?(v.status==='保养中'?'预计恢复 ':'最早预约 ')+dateCell(v.available):v.use==='展车'?'营业时间可看车':'调拨时间按运输排期','<div class="note-cell">'+esc(v.note)+'</div>']));
 $('resourcePager').innerHTML='<span>'+list.length+' 辆 · '+(resourcePage+1)+' / '+pages+'</span><button onclick="resourcePageChange(-1)" '+(!resourcePage?'disabled':'')+'>上一页</button><button onclick="resourcePageChange(1)" '+(resourcePage>=pages-1?'disabled':'')+'>下一页</button>';
}
function funnelRows(){return rows().filter(l=>!$('funnelAdvisor').value||l.advisor===$('funnelAdvisor').value)}
function setFunnelOptions(){let selected=$('funnelAdvisor').value,available=staff();$('funnelAdvisor').innerHTML='<option value="">全部顾问</option>'+available.map(s=>'<option value="'+s.id+'">'+s.name+' · '+s.store+'</option>').join('');if(available.some(s=>s.id===selected))$('funnelAdvisor').value=selected}
function renderDimensions(a){
 renderConversionActions();
 const d=day(),rate=(n,t)=>t?(n/t*100).toFixed(1)+'%':'—';
 const values=r=>{let f=Core.funnel(r,d),driveLocked=r.filter(l=>Core.happened(l.drive,d)&&Core.happened(l.lock,d)).length;return [r.length,f[3],f[4],f[5],rate(f[3],r.length),rate(driveLocked,f[4]),rate(f[5],r.length)]};
 const groups=[...new Set(staff().map(s=>s.store))];
 const groupRows=groups.map(g=>[g,...values(a.filter(l=>l.store===g))]);
 const headers=['线索','到店','试驾','锁单','线索→到店','试驾→锁单','线索→锁单'];
 $('funnelGroupTable').innerHTML=table(['门店／销售组',...headers],groupRows);
 $('funnelAdvisorTable').innerHTML=table(['顾问','所属门店销售组',...headers],staff().filter(s=>(!$('funnelAdvisor').value||s.id===$('funnelAdvisor').value)).map(s=>['<b>'+s.name+'</b>',s.store,...values(a.filter(l=>l.advisor===s.id))]));
}
function setStrategy(mode){strategyMode=mode;page=0;renderStrategy()}
function renderStrategy(){
 const pool=Core.pool(rows(),day()),high=pool.filter(l=>Core.happened(l.highAt,day())||Core.happened(l.drive,day()));
 metrics('strategyMetrics',[['高意向优先池',high.length,'有高意向确认或实际试驾'],['高意向未试驾',high.filter(l=>!Core.happened(l.drive,day())).length,'关注到店阻力'],['已试驾未锁单',high.filter(l=>Core.happened(l.drive,day())).length,'关注决策顾虑'],['跟进异常客户',pool.filter(l=>Core.overdue(l,day()).bucket!=='未超时').length,'另在策略证据中核查']]);
 $('strategyPriority').setAttribute('aria-pressed',String(strategyMode==='priority'));$('strategyEvidence').setAttribute('aria-pressed',String(strategyMode==='evidence'));
 $('strategyListTitle').textContent=strategyMode==='priority'?'优先客户明细':'策略证据与异常跟进明细';
 $('strategyListHint').textContent=strategyMode==='priority'?'筛出已确认高意向或已试驾、但尚未锁单的客户；逐客查看关注点和建议行动，点开客户后核对并记录下一步。':'把跟进超时等异常客户与已记录事实放在一起，先核实原因，再决定邀约或接待动作。';
 let list=strategyRows();if(strategyMode==='priority')list=list.filter(l=>Core.happened(l.highAt,day())||Core.happened(l.drive,day()));
 const pages=Math.max(1,Math.ceil(list.length/10));page=Math.max(0,Math.min(page,pages-1));
 $('strategyTable').innerHTML=strategyMode==='priority'?table(['客户／负责顾问','高意向依据','当前阶段／跟进','客户关注点','优先行动','操作'],list.slice(page*10,page*10+10).map(l=>[person(l)+owner(l),esc(l.intentReason||'已完成试驾并进入订车沟通'),pill(Core.stage(l,day()),'blue')+'<small>'+overdueCell(l)+'</small>','<div class="note-cell">'+esc(l.evidence)+'</div>','<div class="note-cell">'+esc(note(l).action)+'</div>','<button onclick="openCustomer(\''+l.id+'\')">更新安排</button>'])):table(['客户／顾问','跟进时间与档位','已记录事实','初步原因／核对状态','建议动作','操作'],list.slice(page*10,page*10+10).map(l=>[person(l)+owner(l),esc(Core.last(l,day())||'尚未建联')+'<small>'+overdueCell(l)+'</small>','<div class="note-cell">'+esc(l.evidence)+'</div>','<div class="note-cell">'+esc(note(l).reason)+'<small>'+(note(l).confirmed?'已与销售核对':'待与销售核对')+'</small></div>','<div class="note-cell">'+esc(note(l).action)+'</div>','<button onclick="openCustomer(\''+l.id+'\')">核对原因</button>']));
 $('strategyPager').innerHTML='<span>'+list.length+' 位客户 · '+(page+1)+' / '+pages+'</span><button onclick="changePage(-1)" '+(!page?'disabled':'')+'>上一页</button><button onclick="changePage(1)" '+(page>=pages-1?'disabled':'')+'>下一页</button>';
}
function careInfo(l){
 const saved=state.care?.[l.id]||OPS_DATA.care?.[l.id],d=day();let scene=Core.careSegment(l,d)==='owner'?(Core.happened(l.delivery,d)?'提车后回访':'车主增换购沟通'):Core.happened(l.lock,d)?'待交付关怀':Core.happened(l.drive,d)?'试驾后问候':note(l).appointment&&note(l).appointment>=d?'到店前提醒':'日常需求关怀';
 let due=scene==='车主增换购沟通'?Core.add(l.acquired,1):scene==='提车后回访'?Core.add(l.delivery,3):scene==='待交付关怀'?Core.add(l.lock,1):scene==='试驾后问候'?Core.add(l.drive,1):scene==='到店前提醒'?Core.add(note(l).appointment,-1):Core.add(l.acquired,1);
 return {scene,due,status:saved&&saved.at<=d?saved.status:l.doNotContact?'暂缓联系':'待关怀',feedback:saved&&saved.at<=d?saved.feedback:l.doNotContact?'客户要求暂停主动联系':'尚未记录',next:saved&&saved.at<=d?saved.next:null};
}
function setCareAudience(value){if(!['prospect','owner','pending'].includes(value))return;careAudience=value;$('careScene').value='';$('careStatus').value='';renderCare()}
function renderCare(){
 const scoped=rows().filter(l=>l.advisor),labels={prospect:'未购车客户',owner:'车主',pending:'待交付关怀'},scenes={prospect:['到店前提醒','试驾后问候','日常需求关怀'],owner:['提车后回访','车主增换购沟通'],pending:['待交付关怀']};
 for(const key of Object.keys(labels)){const b=$('careAudience-'+key);b.textContent=labels[key]+' · '+scoped.filter(l=>Core.careSegment(l,day())===key).length;b.setAttribute('aria-pressed',String(careAudience===key))}
 $('careAudienceNote').textContent={prospect:'尚未购车的客户：关注需求变化、到店安排和试驾感受，尊重联系偏好。',owner:'已提车或已有蔚来车辆的车主：关注用车体验、服务问题与增换购需求。',pending:'已锁单但尚未成为车主的客户：沟通车辆进度、手续准备与交付安排。'}[careAudience];
 const selected=$('careScene').value;$('careScene').innerHTML='<option value="">全部场景</option>'+scenes[careAudience].map(v=>'<option>'+v+'</option>').join('');if(scenes[careAudience].includes(selected))$('careScene').value=selected;
 const a=scoped.filter(l=>Core.careSegment(l,day())===careAudience),list=a.filter(l=>(!$('careScene').value||careInfo(l).scene===$('careScene').value)&&(!$('careStatus').value||careInfo(l).status===$('careStatus').value));
 metrics('careMetrics',[['到期待联系',a.filter(l=>Core.careDue(careInfo(l),day())&&!l.doNotContact).length,'含已约定的下次联系；暂缓联系除外'],['待回应问题',a.filter(l=>careInfo(l).status==='需协同处理').length,'明确责任人与回复时间'],['已完成关怀',a.filter(l=>careInfo(l).status==='已完成').length,'以实际录入记录为准'],['已添加微信',a.filter(l=>l.wechat==='已添加').length,'未添加客户先确认联系渠道']]);
 $('careTable').innerHTML=table(['客户／顾问','关怀场景／日期','微信联系偏好','服务关注点','进度／反馈','操作'],list.map(l=>{let c=careInfo(l);return [person(l)+owner(l),pill(c.scene,'blue')+'<small>'+(c.next?'下次联系 '+c.next:'建议 '+c.due)+'</small>'+(Core.careDue(c,day())&&!l.doNotContact?pill('已到联系日期','warn'):''),esc(l.wechat)+'<small class="note-cell">'+esc(l.preference)+'</small>','<div class="note-cell">'+esc(l.evidence)+'</div>',pill(c.status,c.status==='需协同处理'?'warn':'')+'<small class="note-cell">'+esc(c.feedback)+'</small>','<button onclick="openCare(\''+l.id+'\')">微信问候／记录</button>']}));
}
function careDraft(l){let c=careInfo(l),name=l.customer;return {
 '车主增换购沟通':name+'您好，最近原来的车用得还顺利吗？关于您提到的增换购需求，家人的使用场景和时间安排是否有变化？我们可以按您方便的节奏继续沟通。',
 '到店前提醒':name+'您好，想和您确认一下此前沟通的到店安排是否方便。如需调整时间，您告诉我即可；我们可以提前准备您关注的车型和体验内容。',
 '试驾后问候':name+'您好，感谢您来体验。想听听您对这次试驾的感受，尤其是您提到的关注点。还有哪些地方希望进一步了解？我按您的需要补充，不着急做决定。',
 '待交付关怀':name+'您好，想和您确认近期方便提车的时间，以及是否有手续或用车准备方面的问题。我会在车辆到店和整备情况确认后，再与您约定具体交付时间。',
 '提车后回访':name+'您好，最近用车还顺利吗？充换电、车机设置或日常使用上有没有需要协助的地方？您方便时告诉我，我帮您对接处理。',
 '日常需求关怀':name+'您好，上次您提到的用车需求，近期有变化吗？如果还需要了解，我可以按您关心的内容整理资料；若暂时不需要，也可以告诉我您方便联系的时间。'
 }[c.scene]}
function openCare(id){let l=allRows().find(l=>l.id===id),c=careInfo(l);modal('客户关怀 · '+l.customer,'<p>'+esc(l.store)+' · '+esc(advisor(l.advisor)?.name)+' · '+c.scene+'</p><div class="explain">联系偏好：'+esc(l.preference)+(l.doNotContact?'。客户已要求暂停主动联系，保留服务记录即可。':'。根据实际沟通修改内容，复制文案不代表已发送。')+'</div><label>微信问候草稿<textarea id="careDraft" '+(l.doNotContact?'disabled':'')+'>'+esc(l.doNotContact?'客户要求暂停主动联系，不生成主动问候。':careDraft(l))+'</textarea></label><button onclick="copyCare()" '+(l.doNotContact?'disabled':'')+'>复制问候文案</button><div class="form-grid"><label>关怀进度<select id="careEditStatus">'+['待关怀','待客户回复','需协同处理','已完成','暂缓联系'].map(s=>'<option '+(s===c.status?'selected':'')+'>'+s+'</option>').join('')+'</select></label><label>下次联系日期<input type="date" id="careNext" value="'+(c.next||'')+'"></label><label class="wide">客户反馈与协同安排<textarea id="careFeedback" maxlength="500">'+esc(c.feedback==='尚未记录'?'':c.feedback)+'</textarea></label></div><p class="hint">仅生成可编辑文案与本地关怀记录，不连接微信、不自动发送消息。</p><button class="primary" onclick="saveCare(\''+id+'\')">保存关怀记录</button>')}
async function copyCare(){try{await navigator.clipboard.writeText($('careDraft').value);toast('已复制文案，请根据实际沟通调整后使用。')}catch{toast('无法自动复制，请在文本框中选择文案复制。')}}
function saveCare(id){let status=$('careEditStatus').value,feedback=$('careFeedback').value.trim(),next=$('careNext').value;if(status!=='待关怀'&&!feedback){toast('请记录客户反馈或本次联系结果。');return}if(next&&next<day()){toast('下次联系日期不能早于当前数据截止日。');return}state.care=state.care||{};state.care[id]={status,feedback,next,at:day()};persist();$('detailDialog').close();renderCare();toast('已保存客户关怀记录。')}

function renderBusinessSummary(){
 if(activeView==='allocation')$('allocationLogic').innerHTML=table(['分配判断','执行原则'],[['来源与归属','线上留资先查重；自然进店、转介绍由原顾问持续跟进。'],['本店承接','优先核对在岗、可接待时间和剩余容量，再参考分配占比。'],['跨店协同','原顾问查询试驾与车辆资源；需要调整客户归属时，先确认双方负责人和客户意愿。']]);
 if(activeView==='funnel')renderConversionActions();
 if(activeView==='strategy'){
 const groups=[['费用比较','统一首付、期限与总支出口径，核对政策有效期。'],['家人决策','邀请共同决策人体验空间与乘坐感受。'],['配置交期','核对同配置车源与交付窗口，不承诺未确认的日期。'],['置换评估','明确评估条件、报价有效期与补差金额。']];
 $('objectionSummary').innerHTML=table(['客户关注点','待锁单客户','接待改善动作'],groups.map(([key,action])=>[key,rows().filter(l=>l.obstacle===key&&!Core.happened(l.lock,day())).length,action]));
 }
 if(activeView==='review'){
 const a=Core.pending(rows(),day());$('deliverySummary').innerHTML=table(['待交付客户','车辆状态','计划交付','协同重点'],a.map(l=>[person(l)+owner(l),Core.happened(l.arrived,day())?'已到店，核对整备':'待到店，确认运输排期',dateCell(note(l).deliveryPlan),'<div class="note-cell">车辆负责人确认到店；交付专员核对整备与手续；顾问确认客户提车时间。</div>']));
 }
 if(activeView==='reports'){
 renderTaskProgress();
 const a=rows().filter(l=>l.source==='商圈活动');
 const routes=[['商圈活动','核对现场接待与首次建联'],['快闪店','复盘路过客群与后续预约'],['试驾会','核对试驾车与到场排期'],['社区体验日','关注家庭需求与二次邀约']];
 const activityIds=OPS_DATA.leads.filter(l=>l.source==='商圈活动').map(l=>l.id);
 const routeOf=l=>activityIds.indexOf(l.id)%routes.length;
 const activityRows=routes.map(([name,action],i)=>{const group=a.filter(l=>routeOf(l)===i),f=Core.funnel(group,day());return [name,group.length,group.filter(l=>l.advisor).length,f[1],f[3],f[4],f[5],action]});
 const f=Core.funnel(a,day());activityRows.push(['合计',a.length,a.filter(l=>l.advisor).length,f[1],f[3],f[4],f[5],'按卡点安排下一步跟进']);
 $('activitySummary').innerHTML=table(['活动路径','有效留资','已有顾问','已建联','已到店','已试驾','已锁单','下一步核对'],activityRows);
 }
}
function renderConversionActions(){
 const a=funnelRows().filter(l=>Core.inside(l.acquired,month())),stores=[...new Set(a.map(l=>l.store))];
 $('conversionActions').innerHTML=table(['门店','高意向未试驾','已试驾未锁单','优先核对'],stores.map(st=>{const r=a.filter(l=>l.store===st),invite=r.filter(l=>Core.happened(l.highAt,day())&&!Core.happened(l.drive,day())&&!Core.happened(l.lock,day())).length,order=r.filter(l=>Core.happened(l.drive,day())&&!Core.happened(l.lock,day())).length;return [st,invite,order,invite&&order?'分别核实到店阻力与订车顾虑':invite?'核实时间、试驾资源与家人安排':order?'核实费用、置换与交付顾虑':'暂无这两类待转化客户']}));
}

Object.assign(window,{go,openAssign,assignLead,openResources,renderResources,openSchedule,changeShift,openCustomer,saveCustomer,changePage,setReport,saveTargets,setTask,exportReport,renderAllocation,openAssign,openResources,resourcePageChange,renderResources,funnelRows,setFunnelOptions,renderDimensions,setStrategy,renderStrategy,careInfo,renderCare,careDraft,openCare,copyCare,saveCare,setCareAudience});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>go(b.dataset.view));document.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{reviewMode=b.dataset.review;renderReview()});['asof','store'].forEach(id=>$(id).onchange=()=>{page=0;refresh()});$('resetFilters').onclick=()=>{$('asof').value=OPS_DATA.asof;['store','funnelAdvisor','customerSearch','strategyBucket','strategyStage','careScene','careStatus'].forEach(id=>$(id).value='');$('allocationState').value='unassigned';page=0;refresh()};$('allocationState').onchange=renderAllocation;['customerSearch','strategyBucket','strategyStage'].forEach(id=>$(id).addEventListener(id==='customerSearch'?'input':'change',()=>{page=0;renderStrategy()}));
$('reportMonth').onchange=()=>{const m=$('reportMonth').value;if(!m)return;const end=new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7)),0)).toISOString().slice(0,10);$('asof').value=end>OPS_DATA.asof?OPS_DATA.asof:end;page=0;refresh()};$('funnelAdvisor').onchange=renderFunnel;['careScene','careStatus'].forEach(id=>$(id).onchange=renderCare);
const legacy={'step-0':'funnel','step-1':'strategy','step-2':'allocation','step-3':'review','step-4':'funnel','step-5':'care','step-6':'allocation','step-7':'reports','step-8':'reports','step-9':'allocation'};let hash=location.hash.slice(1);go(hash==='payroll'?'care':legacy[hash]||hash||'funnel');
}

// Keep primary lists available while allowing readers to fold long detail tables.
if (typeof document !== 'undefined') for (const [id, label, expanded] of [
 ['allocationTable', '线索明细', true],
 ['allocationLogic', '分配原则', false],
 ['funnelGroupTable', '门店对比明细', true],
 ['conversionActions', '改善重点明细', true],
 ['funnelAdvisorTable', '顾问对比明细', false],
 ['visitsTable', '每日进店明细', false],
 ['channelTable', '锁单渠道明细', false],
 ['cycleTable', '成交周期明细', false],
 ['strategyTable', '查看客户清单', true],
 ['objectionSummary', '接待改善明细', false],
 ['reviewTable', '客户复盘明细', true],
 ['deliverySummary', '交付协同明细', false],
 ['targetTable', '目标完成明细', true],
 ['reportStaff', '顾问进度明细', false],
 ['reportOverdue', '未跟进客户明细', false],
 ['reportLocks', '锁单客户明细', false],
 ['activitySummary', '活动线索明细', false],
 ['careTable', '客户关怀明细', true]
]) {
 const target = document.getElementById(id);
 if (!target || target.parentElement?.classList.contains('table-control')) continue;
 const details = document.createElement('details');
 details.className = 'table-control';
 details.open = expanded;
 const summary = document.createElement('summary');
 summary.textContent = label;
 target.before(details);
 details.append(summary, target);
 if (id === 'strategyTable') {
   const pager = document.getElementById('strategyPager');
   if (pager) details.append(pager);
 }
}
