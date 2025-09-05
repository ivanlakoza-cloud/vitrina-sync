(function(){
  const $ = (s, r=document) => r.querySelector(s);
  const app = $('#app');
  const statusEl = $('#status');
  const submitBtn = $('#submit');
  const logEl = $('#log');
  const doneEl = $('#done');

  const log = (m) => { if (logEl){ const li=document.createElement('li'); li.textContent=m; logEl.appendChild(li);} };

  const show = (msg, kind='ok') => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'status ' + kind;
  };

  window.addEventListener('error', e => show('Ошибка: '+(e.message||e.error?.message||'unknown'), 'error'));
  window.addEventListener('unhandledrejection', e => show('Ошибка: '+(e.reason?.message||'rejection'), 'error'));

  log('boot v22');
  log('path='+location.pathname);
  log('query='+location.search.replace(/^\?/, ''));
  log('typeof BX24='+typeof window.BX24);

  if (!window.BX24){
    show('BX24 не доступен. Откройте виджет из карточки сделки.', 'error');
    return;
  }

  const FIELDS = [
    { code:'UF_CRM_1737115114028', label:'Комментарий клиента, что важно клиенту?', type:'textarea', required:true},
    { code:'UF_CRM_1737115941816', label:'Площадь м²', type:'number', required:true},
    { code:'UF_CRM_1737116070781', label:'Направление/вид бизнеса клиента', type:'text', required:true},
    { code:'UF_CRM_1737116470642', label:'Стоимость м² на согласование', type:'number', required:true},
    { code:'UF_CRM_1755537385514', label:'Город и адрес', type:'text', required:true},
    { code:'UF_CRM_1756910832606', label:'Арендные каникулы (есть/нет/сколько)', type:'text', required:true},
    { code:'UF_CRM_1756969923506', label:'Отопление (Отсутствует/Сверху/Иное)', type:'text', required:true},
    { code:'UF_CRM_1756969983186', label:'НДС (Отсутствует/Сверху+процент)', type:'text', required:true},
  ];

  const LONGS = [
    { code:'UF_CRM_1757040827538', label:'Опишите максимально подробно, что необходимо сделать на объекте для того, чтобы арендатор заехал. Именно этот запрос попадет в строительный отдел. Если ни каких работ не требуется, так и напишите \nПример: 1. Стены выровнять, зашпаклевать - покрасят сами \n2. Пол подготовить под ламинат \n3. Откосы выровнять и закрыть \n4. Провести электрику \n5. Установить двери \n6. Привести в порядок коридорную группу \nАрендатор своими силами положит ламинат и устроит натяжной потолок, покрасить стены', type:'textarea', required:true },
    { code:'UF_CRM_1757040956282', label:'Опишите, что-то еще, что пригодится для принятия решения. Например — как давно пустует помещение, или что вы договорились, что через 3 месяца цена вырастет... Тут можно указать любую важную дополнительную информацию, которой нет в полях сделки', type:'textarea', required:true }
  ];

  const state = { dealId:null, initial:{}, inputs:{} };

  function parseIdFallback(){
    const q = new URLSearchParams(location.search);
    let id = q.get('entityId') || q.get('DEAL_ID') || q.get('ID') || q.get('id') || q.get('deal_id');
    if (!id && document.referrer){
      const m = document.referrer.match(/\/crm\/deal\/details\/(\d+)/i);
      if (m) id = m[1];
    }
    return id;
  }

  function getDealId(cb){
    BX24.placement.info(info => {
      try{
        log('placement='+(info?.placement||'n/a'));
        log('placement.options='+(info?.options? JSON.stringify(info.options):'{}'));
        const opts = info?.options||{};
        const pid = opts.ID || opts.entityId || opts.DEAL_ID || opts.id;
        if (pid){ cb(String(pid)); return; }
      }catch(e){}
      const f = parseIdFallback();
      cb(f ? String(f) : null);
    });
  }

  function call(method, params){
    return new Promise((resolve, reject)=>{
      BX24.callMethod(method, params, res => {
        if (res.error()){ reject(new Error(res.error()+': '+(res.error_description&&res.error_description()))); return; }
        try{ resolve(res.data()); } catch(e){ resolve(null); }
      });
    });
  }

  function inputEl(field, value){
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const label = document.createElement('label');
    label.textContent = field.label;
    const control = field.type==='textarea' ? document.createElement('textarea') : document.createElement('input');
    control.className = field.type==='textarea' ? 'textarea' : 'input';
    if (field.type!=='textarea') control.type = field.type;
    control.value = value ?? '';
    if (control.value) control.classList.add('filled');

    control.addEventListener('input', () => {
      control.classList.toggle('filled', !!control.value.trim());
      validateAll();
    });

    wrap.appendChild(label);
    wrap.appendChild(control);
    state.inputs[field.code] = control;
    return wrap;
  }

  function renderForm(data){
    app.innerHTML='';
    state.initial = {};
    [...FIELDS, ...LONGS].forEach(f=> state.initial[f.code] = (data[f.code] ?? ''));

    FIELDS.forEach(f => app.appendChild(inputEl(f, data[f.code] ?? '')));

    LONGS.forEach(f => {
      const block = document.createElement('div');
      block.className = 'field field--long';
      const inner = document.createElement('div');
      inner.className = 'long-grid';
      const left = document.createElement('label');
      left.textContent = f.label;
      const control = document.createElement('textarea');
      control.className = 'textarea';
      control.value = data[f.code] ?? '';
      if (control.value) control.classList.add('filled');
      control.addEventListener('input', ()=>{ control.classList.toggle('filled', !!control.value.trim()); validateAll(); });
      state.inputs[f.code] = control;
      inner.appendChild(left);
      inner.appendChild(control);
      block.appendChild(inner);
      app.appendChild(block);
    });

    validateAll();
  }

  function validateAll(){
    let ok = true;
    const reqCodes = [...FIELDS, ...LONGS].filter(f=>f.required).map(f=>f.code);
    reqCodes.forEach(code => {
      const ctrl = state.inputs[code];
      if (!ctrl) return;
      const valid = !!String(ctrl.value||'').trim();
      ctrl.classList.toggle('invalid', !valid);
      if (!valid) ok = false;
    });
    submitBtn.disabled = !ok;
  }

  function changedFields(){
    const result = {};
    for (const code in state.inputs){
      const now = String(state.inputs[code].value||'').trim();
      const was = String(state.initial[code]||'').trim();
      if (now !== was) result[code] = now;
    }
    return result;
  }

  async function boot(){
    show('Подключаемся к порталу…');
    getDealId(async id => {
      if (!id){
        show('Не удалось определить ID сделки. Откройте виджет из карточки сделки.', 'error');
        return;
      }
      state.dealId = id;
      log('dealId='+id);
      try{
        const deal = await call('crm.deal.get', { id });
        renderForm(deal||{});
        show('Данные сделки получены. Проверьте и заполните обязательные поля.');
      }catch(e){
        show('Не удалось получить сделку: '+e.message, 'error');
      }
    });
  }

  submitBtn.addEventListener('click', async () => {
    if (submitBtn.disabled) return;
    const fields = changedFields();
    try{
      if (Object.keys(fields).length){
        await call('crm.deal.update', { id: state.dealId, fields });
      }
      try{ await call('bizproc.workflow.start', { TEMPLATE_ID: 209, DOCUMENT_ID: ['crm','CCrmDocumentDeal','DEAL_'+state.dealId] }); }catch(e){ log('bp209: '+e.message); }
      show('Готово! Обновили сделку и отправили на согласование.', 'ok');
      doneEl.classList.add('show');
      app.style.display='none';
    }catch(e){
      show('Ошибка сохранения: '+e.message, 'error');
    }
  });

  BX24.init(boot);
})();