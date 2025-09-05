
(function(){
  const el = sel => document.querySelector(sel);
  const app = el('#app');
  const submitBtn = el('#submit');
  const statusEl = el('#status');
  const diag = el('#diag');
  const formWrap = el('#formWrap');
  const done = el('#done');

  log('boot v23');
  log('path=' + location.pathname);
  log('query=' + location.search);
  log('typeof BX24=' + (typeof window.BX24));

  function log(s){ const li = document.createElement('li'); li.textContent = s; diag.appendChild(li); }

  function showStatus(msg, type='info'){
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'status ' + type;
  }

  // --- Field config
  const FIELDS = [
    {code:'UF_CRM_1737115114028', label:'Комментарий клиента, что важно клиенту?', type:'textarea', required:false},
    {code:'UF_CRM_1737115941816', label:'Площадь м²', type:'number', required:true},
    {code:'UF_CRM_1737116070781', label:'Направление/вид бизнеса клиента', required:true},
    {code:'UF_CRM_1737116470642', label:'Стоимость м² на согласование', type:'number', required:true},
    {code:'UF_CRM_1755537385514', label:'Город и адрес', required:true},
    {code:'UF_CRM_1756910832606', label:'Арендные каникулы (есть/нет/сколько)', required:true},
    {code:'UF_CRM_1756969923506', label:'Отопление (Отсутствует/Сверху/Иное)', required:true},
    {code:'UF_CRM_1756969983186', label:'НДС (Отсутствует/Сверху+процент)', required:true}
  ];
  const LONGS = [
    {code:'UF_CRM_1757040827538', label:'Опишите максимально подробно, что необходимо сделать на объекте для того, чтобы арендатор заехал. Именно этот запрос попадет в строительный отдел. Если ни каких работ не требуется, так и напишите\\nПример: 1. Стены выровнять, зашпаклевать - покрасят сами\\n2. Пол подготовить под ламинат\\n3. Откосы выровнять и закрыть\\n4. Провести электрику\\n5. Установить двери\\n6. Привести в порядок коридорную группу\\nАрендатор своими силами положит ламинат и устроит натяжной потолок, покрасит стены', type:'textarea', required:true},
    {code:'UF_CRM_1757040956282', label:'Опишите, что-то еще, что пригодится для принятия решения. Например — как давно пустует помещение, или что вы договорились, что через 3 месяца цена вырастет... Тут можно указать любую важную дополнительную информацию, которой нет в полях сделки', type:'textarea', required:false}
  ];

  // Helpers
  const qs = new URLSearchParams(location.search);
  const qid = qs.get('id')||qs.get('deal_id')||qs.get('entityId')||qs.get('ID');
  let dealId = qid||null;
  let dealData = null;

  if (!window.BX24){
    showStatus('BX24 не доступен. Откройте виджет из карточки сделки.', 'error');
    return;
  }

  BX24.init(function(){
    log('BX24.init() ok');
    BX24.placement.info(function(info){
      log('placement=' + (info && info.placement));
      try{
        if (!dealId){
          const po = info && info.options || {};
          const parsed = typeof po === 'string' ? JSON.parse(po||'{}') : po;
          dealId = parsed.ID || parsed.id || null;
          log('placement.options -> ' + JSON.stringify(parsed));
        }
      }catch(e){}
      if (!dealId){
        // final fallback: try referrer /crm/deal/details/{id}/
        const m = (document.referrer||'').match(/\/crm\/deal\/details\/(\d+)\//);
        if (m) dealId = m[1];
      }
      log('dealId=' + dealId);
      if (!dealId){ showStatus('Не удалось определить ID сделки (placement/options).', 'error'); return; }
      loadDeal();
    });
  });

  function loadDeal(){
    showStatus('Загружаем данные сделки #' + dealId + ' …');
    BX24.callMethod('crm.deal.get', { id: dealId }, function(res){
      if (res.error()){ showStatus('Ошибка crm.deal.get: ' + res.error(), 'error'); return; }
      dealData = res.data();
      showStatus('Данные получены. Заполните поля и отправьте на согласование.');
      renderForm();
    });
  }

  function renderForm(){
    const grid = document.createElement('div');
    grid.className = 'form-grid';

    const changed = {};
    function fieldBlock(def){
      const wrap = document.createElement('div');
      wrap.className = 'field';
      const lab = document.createElement('label'); lab.className='label'; lab.textContent = def.label; 
      const inp = (def.type==='textarea') ? document.createElement('textarea') : document.createElement('input');
      if (def.type && def.type!=='textarea') inp.type = def.type;
      inp.className='input';
      let val = dealData[def.code];
      if (Array.isArray(val)) val = val.join(', ');
      if (typeof val === 'object' && val!==null) val = '';
      inp.value = (val??'').toString();
      if (def.required && !inp.value) inp.classList.add('warn');
      inp.addEventListener('input', ()=>{
        const original = (val??'').toString();
        if (inp.value !== original){ changed[def.code] = inp.value; inp.classList.add('ok'); }
        else { delete changed[def.code]; inp.classList.remove('ok'); }
        updateSubmit();
      });
      wrap.appendChild(lab); wrap.appendChild(inp);
      return wrap;
    }

    FIELDS.forEach(f=>grid.appendChild(fieldBlock(f)));
    const longRows = document.createElement('div'); longRows.className='long-rows';
    LONGS.forEach(f=> longRows.appendChild(fieldBlock(f)));

    formWrap.innerHTML='';
    formWrap.appendChild(grid);
    formWrap.appendChild(longRows);
    formWrap.classList.remove('hidden');

    function updateSubmit(){
      if (Object.keys(changed).length===0){ submitBtn.disabled = true; submitBtn.classList.remove('ready'); }
      else { submitBtn.disabled = false; submitBtn.classList.add('ready'); }
    }
    updateSubmit();

    submitBtn.onclick = function(){
      submitBtn.disabled = true;
      showStatus('Сохраняем изменения…');
      BX24.callMethod('crm.deal.update', { id: dealId, fields: changed }, function(r1){
        if (r1.error()){ showStatus('Ошибка crm.deal.update: ' + r1.error(), 'error'); submitBtn.disabled=false; return; }
        // попытка запустить БП #209 — если нет прав/шаблона, просто покажем успех
        const docId = ['crm', 'CCrmDocumentDeal', 'DEAL_'+dealId];
        BX24.callMethod('bizproc.workflow.start', { TEMPLATE_ID: 209, DOCUMENT_ID: docId }, function(r2){
          if (r2 && r2.error()){ log('bizproc start error: ' + r2.error()); }
          showStatus('Готово. Изменения сохранены.', 'info');
          done.classList.remove('hidden');
          formWrap.classList.add('hidden');
        });
      });
    };
  }

})();