
(function(){
  // helpers
  const $ = (s,root=document)=>root.querySelector(s);
  const $$ = (s,root=document)=>Array.from(root.querySelectorAll(s));
  const el = id => document.getElementById(id);
  const form = el('form');
  const submitBtn = el('submit');
  const statusEl = el('status');
  const overlay = el('overlay');

  function showStatus(msg, type='info'){
    statusEl.textContent = msg;
    statusEl.className = 'status ' + type;
  }

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
Пример: 1. Стены выровнять, зашпаклевать - покрасят сами 
2. Пол подготовить под ламинат 
3. Откосы выровнять и закрыть 
4. Провести электрику 
5. Установить двери 
6. Привести в порядок коридорную группу 
Арендатор своими силами положит ламинат и устроит натяжной потолок, покрасить стены`, type:'textarea', required:true},
    {code:'UF_CRM_1757040956282', label:`Опишите, что-то еще, что пригодится для принятия решения. Например — как давно пустует помещение, или что вы договорились, что через 3 месяца цена вырастет... Тут можно указать любую важную дополнительную информацию, которой нет в полях сделки`, type:'textarea', required:true}
  ];

  // UI builders
  function makeField(label, type, name){
    const tpl = $('#tpl-field');
    const node = tpl.content.firstElementChild.cloneNode(true);
    $('.label', node).textContent = label;
    let ctrl;
    if (type==='textarea'){
      ctrl = document.createElement('textarea');
    } else {
      ctrl = document.createElement('input');
      ctrl.type = type||'text';
      if(type==='number'){ ctrl.inputMode='decimal'; ctrl.step='any'; }
    }
    ctrl.name = name;
    ctrl.required = true;
    ctrl.addEventListener('input', onInputState);
    $('.control', node).appendChild(ctrl);
    node.classList.add('required');
    return node;
  }

  function buildForm(data){
    form.innerHTML = '';
    // two col simple fields
    FIELDS.forEach(f=>{
      const node = makeField(f.label, f.type, f.code);
      const ctrl = $('input, textarea', node);
      const v = data[f.code] ?? '';
      ctrl.value = Array.isArray(v) ? v.join(', ') : (v??'');
      if(String(ctrl.value).trim()!==''){ ctrl.classList.add('filled'); node.classList.remove('required'); }
      form.appendChild(node);
    });
    // long rows
    LONGS.forEach(f=>{
      const row = document.createElement('div');
      row.className='long-row';
      const left = document.createElement('div');
      left.className='pill';
      left.innerText = f.label;
      const field = makeField('', 'textarea', f.code);
      const ctrl = $('textarea', field);
      ctrl.style.minHeight='220px';
      const v = data[f.code] ?? '';
      ctrl.value = Array.isArray(v) ? v.join(', ') : (v??'');
      if(String(ctrl.value).trim()!==''){ ctrl.classList.add('filled'); field.classList.remove('required'); }
      row.appendChild(left); row.appendChild(field);
      form.appendChild(row);
    });
  }

  function onInputState(e){
    const ctrl = e.currentTarget;
    const holder = ctrl.closest('.field');
    if(holder){
      const empty = String(ctrl.value).trim()==='';
      holder.classList.toggle('required', empty);
      ctrl.classList.toggle('filled', !empty);
    }
    validate();
  }

  function validate(){
    const empties = $$('input[required], textarea[required]', form).filter(i=>String(i.value).trim()==='');
    submitBtn.disabled = empties.length>0;
  }

  // collect changed values
  function collectDiff(initial){
    const diff = {};
    $$('input, textarea', form).forEach(i=>{
      const val = i.value;
      const old = initial[i.name] ?? '';
      if(String(val) !== String(Array.isArray(old)? old.join(', '): old)){
        diff[i.name] = val;
      }
    });
    return diff;
  }

  // ID detection helpers
  function getQuery(){
    const p = new URLSearchParams(location.search);
    const keys = ['id','ID','deal_id','entityId','ENTITY_ID','DEAL_ID'];
    for(const k of keys){ if(p.get(k)) return p.get(k); }
    return '';
  }
  function idFromReferrer(){
    const r = document.referrer||'';
    const m = r.match(/\/crm\/deal\/details\/(\d+)\//);
    return m? m[1] : '';
  }

  // main
  let DEAL_ID = '';
  let initial = {};

  async function init(){
    // If not inside Bitrix – show hint but allow query testing
    if(!window.BX24){
      DEAL_ID = getQuery() || idFromReferrer();
      if(!DEAL_ID){
        showStatus('BX24 не доступен. Откройте виджет из карточки сделки.', 'error');
        return;
      }
      showStatus('Тестовый режим без BX24. ID сделки: '+DEAL_ID, 'info');
      renderPlain();
      return;
    }

    BX24.ready(function(){
      BX24.placement.info(function(info){
        let optId = '';
        try{
          const o = info && info.options || {};
          if(o && o.ID) optId = o.ID;
          if(typeof o === 'string'){ const p = JSON.parse(o); optId = p.ID || ''; }
        }catch(e){}
        DEAL_ID = optId || getQuery() || idFromReferrer();
        if(!DEAL_ID){ showStatus('ID сделки не найден. Откройте виджет из карточки сделки.', 'error'); return; }
        loadDeal();
      });
    });
  }

  function bx(method, params){
    return new Promise((resolve,reject)=>{
      BX24.callMethod(method, params, res=>{
        if(res.error()){ reject(new Error(res.error()+': '+ (res.error_description?.()||''))); }
        else resolve(res.data());
      });
    });
  }

  async function loadDeal(){
    try{
      showStatus('Загружаем данные сделки #'+DEAL_ID+' …', 'info');
      const data = await bx('crm.deal.get', {id: DEAL_ID});
      initial = data||{};
      buildForm(initial);
      showStatus('Данные загружены. Проверьте поля и отправьте на согласование.', 'ok');
      validate();
    }catch(e){
      console.error(e);
      showStatus('Ошибка загрузки сделки: '+e.message, 'error');
    }
  }

  // Static render if no BX24 (dev)
  function renderPlain(){
    buildForm({});
    validate();
  }

  submitBtn.addEventListener('click', async (e)=>{
    e.preventDefault();
    if(submitBtn.disabled) return;
    try{
      submitBtn.disabled = true;
      submitBtn.textContent = 'Отправка…';
      const diff = collectDiff(initial);
      if(Object.keys(diff).length){
        await bx('crm.deal.update', {id: DEAL_ID, fields: diff});
      }
      // старт БП #209
      try{
        await bx('bizproc.workflow.start', {
          TEMPLATE_ID: 209,
          DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', 'DEAL_'+DEAL_ID],
          PARAMETERS: {}
        });
      }catch(e){
        console.warn('Запуск БП:', e.message);
      }
      overlay.classList.remove('hidden');
      showStatus('Отправлено!', 'ok');
    }catch(e){
      console.error(e);
      showStatus('Ошибка: '+e.message, 'error');
    }finally{
      submitBtn.textContent = 'ОТПРАВИТЬ СТОИМОСТЬ М² НА СОГЛАСОВАНИЕ';
      validate();
    }
  });

  init();
})();
