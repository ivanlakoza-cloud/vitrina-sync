
// v21 widget logic with robust diagnostics
(function(){
  const $ = (s,root=document)=>root.querySelector(s);
  const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
  const statusEl = $('#status');
  const diagList = $('#diag-list');
  const form = $('#form');
  const submitBtn = $('#submit');
  const finalBox = $('#final');

  function log(line){ try{ const li=document.createElement('li'); li.textContent=String(line); diagList.appendChild(li); }catch(e){} }
  function status(msg, kind='info'){ if(!statusEl) return; statusEl.textContent=msg; statusEl.className='status'+(kind==='err'?' err':''); }
  window.addEventListener('error', e=>{ log('JS error: '+(e.message||e.error)); status('Ошибка скрипта: '+(e.message||'см. консоль'), 'err'); });

  // Prevent native form submit (avoid 405)
  form && form.addEventListener('submit', e=>e.preventDefault());

  log('boot v21');
  log('path='+location.pathname);
  log('query='+location.search);

  const FIELDS = [
    {code:'UF_CRM_1737115114028', label:'Комментарий клиента, что важно клиенту?', type:'textarea', required:true},
    {code:'UF_CRM_1737115941816', label:'Площадь м²', type:'number', required:true},
    {code:'UF_CRM_1737116070781', label:'Направление/вид бизнеса клиента', type:'text', required:true},
    {code:'UF_CRM_1737116470642', label:'Стоимость м² на согласование', type:'number', required:true},
    {code:'UF_CRM_1755537385514', label:'Город и адрес', type:'text', required:true},
    {code:'UF_CRM_1756910832606', label:'Арендные каникулы (есть/нет/сколько)', type:'text', required:true},
    {code:'UF_CRM_1756969923506', label:'Отопление (Отсутствует/Сверху/Иное)', type:'text', required:true},
    {code:'UF_CRM_1756969983186', label:'НДС (Отсутствует/Сверху+процент)', type:'text', required:true},
  ];
  const LONGS = [
    {code:'UF_CRM_1757040827538', label:`Опишите максимально подробно, что необходимо сделать на объекте для того, чтобы арендатор заехал. Именно этот запрос попадет в строительный отдел. Если ни каких работ не требуется, так и напишите 
Пример: 
1. Стены выровнять, зашпаклевать - покрасят сами 
2. Пол подготовить под ламинат 
3. Откосы выровнять и закрыть 
4. Провести электрику 
5. Установить двери 
6. Привести в порядок коридорную группу 
Арендатор своими силами положит ламинат и устроит натяжной потолок, покрасить стены`, type:'textarea', required:true},
    {code:'UF_CRM_1757040956282', label:`Опишите, что-то еще, что пригодится для принятия решения. Например — как давно пустует помещение, или что вы договорились, что через 3 месяца цена вырастет... Тут можно указать любую важную дополнительную информацию, которой нет в полях сделки`, type:'textarea', required:true},
  ];

  function inputEl(f){
    const wrap = document.createElement('div');
    wrap.className='field';
    const lab = document.createElement('div'); lab.className='label'; lab.textContent=f.label;
    const ctrl = f.type==='textarea'? document.createElement('textarea') : document.createElement('input');
    if(f.type==='number'){ ctrl.type='number'; ctrl.step='any'; }
    ctrl.className='input'; ctrl.dataset.code=f.code; ctrl.required=!!f.required;
    ctrl.addEventListener('input', ()=>{ validate(); filledState(ctrl); });
    wrap.appendChild(lab); wrap.appendChild(ctrl);
    return wrap;
  }
  function longEl(f){
    const row=document.createElement('div'); row.className='long';
    const lab=document.createElement('div'); lab.className='label'; lab.textContent=f.label;
    const ta=document.createElement('textarea'); ta.className='input'; ta.dataset.code=f.code; ta.required=!!f.required; ta.style.minHeight='220px';
    ta.addEventListener('input', ()=>{ validate(); filledState(ta); });
    row.appendChild(lab); row.appendChild(ta);
    return row;
  }
  function filledState(el){
    const empty = (el.value||'').trim()==='';
    el.classList.toggle('invalid', el.required && empty);
    el.classList.toggle('filled', !empty);
  }
  function setValues(data){
    [...form.querySelectorAll('.input')].forEach(el=>{
      const code=el.dataset.code;
      let v = data && data[code];
      if (v==null) v='';
      if (Array.isArray(v)) v=v.join(', ');
      el.value = v;
      filledState(el);
    });
  }
  function validate(){
    let ok=true;
    [...form.querySelectorAll('.input')].forEach(el=>{
      if(el.required && (el.value||'').trim()===''){ ok=false; el.classList.add('invalid'); }
    });
    submitBtn.classList.toggle('enabled', ok);
    submitBtn.disabled=!ok;
    return ok;
  }
  function diff(orig){
    const d={};
    [...form.querySelectorAll('.input')].forEach(el=>{
      const code=el.dataset.code;
      const now=(el.value||'').trim();
      const was=(orig && (Array.isArray(orig[code])? orig[code].join(', '): (orig[code]||''))).trim();
      if(now!==was) d[code]=now;
    });
    return d;
  }

  function bx(method, params){ return new Promise((res,rej)=>{ BX24.callMethod(method, params||{}, r=>{ if(r && r.error()) rej(new Error(r.error()+': '+(r.error_description&&r.error_description()||''))); else res(r.data()); }); }); }

  function findDealId(cb){
    const usp=new URLSearchParams(location.search);
    let id = usp.get('ID')||usp.get('id')||usp.get('deal_id')||usp.get('entityId')||'';
    log('typeof BX24='+typeof BX24);
    if(typeof BX24!=='object'){
      log('BX24 not object; fallback only query/referrer');
      if(!id){
        const m=(document.referrer||'').match(/\/crm\/deal\/details\/(\d+)\//);
        if(m) id=m[1];
      }
      cb(id);
      return;
    }
    BX24.placement.info(pi=>{
      log('placement='+pi.placement);
      let optId='';
      try{
        const raw=pi && pi.options;
        if(typeof raw==='string' && raw){
          try{ const parsed=JSON.parse(raw); optId=parsed.ID||parsed.id||''; }catch{ const q2=new URLSearchParams(raw); optId=q2.get('ID')||q2.get('id')||''; }
        }else if(raw && (raw.ID||raw.id)){ optId=raw.ID||raw.id; }
      }catch(e){}
      cb(optId || id);
    });
  }

  function start(){
    status('Подключаемся к порталу…');
    findDealId(async dealId=>{
      log('resolved dealId='+dealId);
      if(!dealId){ status('ID сделки не определён. Откройте из карточки сделки.', 'err'); return; }
      try{
        await new Promise(r=>{ try{ BX24.init(r); }catch{ r(); } });
        const deal = await bx('crm.deal.get', { id: dealId });
        log('deal loaded: title='+deal.TITLE);
        // render
        form.innerHTML='';
        FIELDS.forEach(f=> form.appendChild(inputEl(f)));
        LONGS.forEach(f=> form.appendChild(longEl(f)));
        setValues(deal);
        validate();
        status('Данные сделки загружены. Проверьте поля и отправьте на согласование.');
        submitBtn.addEventListener('click', async ()=>{
          if(!validate()) return;
          submitBtn.disabled=true;
          const changes = diff(deal);
          if(Object.keys(changes).length){ await bx('crm.deal.update', { id: dealId, fields: changes }); }
          await bx('bizproc.workflow.start', { TEMPLATE_ID: 209, DOCUMENT_ID: ['crm','CCrmDocumentDeal','DEAL_'+dealId] });
          finalBox.classList.remove('hidden');
          form.classList.add('hidden');
          status('Готово. Бизнес‑процесс запущен.');
        });
      }catch(e){
        console.error(e);
        status('Ошибка: '+e.message, 'err');
        log('error during load: '+e.message);
      }
    });
  }

  // kick
  start();
})();
