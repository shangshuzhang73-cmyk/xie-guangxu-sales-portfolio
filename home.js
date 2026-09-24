(()=>{
  const modules=[
    {id:'funnel',title:'销售结果与转化',desc:'从漏斗总览判断差距，再按门店和顾问下钻。'},
    {id:'allocation',title:'线索分配',desc:'核对来源、门店归属与顾问承接容量。'},
    {id:'strategy',title:'高意向跟进',desc:'筛出需优先联系的客户，逐个确认下一步。'},
    {id:'review',title:'客户节点复盘',desc:'复查试驾、锁单与交付过程中的停滞节点。'}
  ];
  const buttons=[...document.querySelectorAll('[data-module]')];
  const frame=document.getElementById('moduleFrame');
  const link=document.getElementById('viewerLink');
  const index=document.getElementById('viewerIndex');
  const title=document.getElementById('viewerTitle');
  const desc=document.getElementById('viewerDesc');
  buttons.forEach((button,i)=>button.addEventListener('click',()=>{
    const module=modules[i];
    const target=`workbench.html#${module.id}`;
    frame.src=target;
    frame.title=`${module.title}预览`;
    link.href=target;
    index.textContent=`${String(i+1).padStart(2,'0')} — ${String(modules.length).padStart(2,'0')}`;
    title.textContent=module.title;
    desc.textContent=module.desc;
    buttons.forEach((item,j)=>item.setAttribute('aria-current',String(i===j)));
  }));
})();
