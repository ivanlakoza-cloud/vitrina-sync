
(() => {
  const log = (...a)=>{ try{console.log('[b24 v29]',...a);}catch(e){} }
  const sel = s => document.querySelector(s);
  const diagList = sel('#diag_list');

  const addDiag = (k,v='') => {
    const li = document.createElement('li');
    li.textContent = v ? `${k} → ${v}` : k;
    diagList.append(li);
  }

  addDiag('boot', window.__WIDGET_VERSION__);

  // Status helper
  function showStatus(msg, type='info'){
    const el = sel('#status');
    if(!el) return;
    el.textContent = msg;
    el.className = 'status ' + type;
  }

  // Load BX24 api if missing
  function ensureBX24() {
    return new Promise((resolve, reject) => {
      if (window.BX24 && typeof BX24 === 'object') return resolve(BX24);
      const s = document.createElement('script');
      s.src = 'https://api.bitrix24.com/api/v1/';
      s.async = true;
      s.onload = () => {
        if (window.BX24) resolve(BX24);
        else reject(new Error('BX24 not available after load'));
      };
      s.onerror = () => reject(new Error('Failed to load Bitrix API'));
      document.head.appendChild(s);
    });
  }

  // Parse query
  function q(v){ return new URLSearchParams(location.search).get(v) }
  addDiag('path', location.pathname);
  addDiag('query', location.search || '—');

  function getIdFromQuery(){
    const keys = ['id','ID','deal_id','DEAL_ID','entityId','ENTITY_ID'];
    for(const k of keys){
      const val = q(k);
      if(val && /^\d+$/.test(val)) return val;
    }
    return null;
  }

  function getIdFromReferrer(){
    const ref = document.referrer || '';
    const m = ref.match(/\/crm\/deal\/details\/(\d+)\//);
    return m ? m[1] : null;
  }

  function resolveDealIdViaPlacement(){
    return new Promise((resolve) => {
      try{
        BX24.placement.info((d)=>{
          log('placement.info', d);
          addDiag('placement', (d && d.placement) || '—');
          let id = null;
          const opt = (d && d.options) || {};
          const cand = [opt.ID, opt.id, opt.deal_id, opt.entityId, opt.ENTITY_ID, opt.ownerId];
          for(const c of cand){ if(c && /^\d+$/.test(String(c))) { id = String(c); break; } }
          if(id) return resolve(id);

          // If activity id is present, try to resolve deal via activity.get
          const actId = opt.activityId || opt.ACTIVITY_ID || opt.id;
          if(actId && /^\d+$/.test(String(actId))){
            BX24.callMethod('crm.activity.get', {id: actId}, (r)=>{
              try{
                const data = r && r.data && r.data();
                const ownerId = data && (data.OWNER_ID || (data.bindings && data.bindings[0] && data.bindings[0].OWNER_ID));
                if(ownerId) return resolve(String(ownerId));
              }catch(e){}
              resolve(null);
            });
          } else {
            resolve(null);
          }
        });
      }catch(e){
        resolve(null);
      }
    });
  }

  async function resolveDealId(){
    let id = getIdFromQuery();
    if(id){ addDiag('id(query)', id); return id; }

    try{
      await ensureBX24();
    }catch(e){
      addDiag('bx24-load', e.message);
      return getIdFromReferrer();
    }

    try{
      const viaPlacement = await resolveDealIdViaPlacement();
      if(viaPlacement){ addDiag('id(placement)', viaPlacement); return viaPlacement; }
    }catch(e){}

    const viaRef = getIdFromReferrer();
    if(viaRef){ addDiag('id(referrer)', viaRef); return viaRef; }

    return null;
  }

  // Render form
  const FIELDS = [
    {code:'UF_CRM_1737115114028', label:'Комментарий клиента, что важно клиенту?', type:'textarea', required:false},
    {code:'UF_CRM_1737115941816', label:'Площадь м²', type:'number', required:true},
    {code:'UF_CRM_1737116470642', label:'Стоимость м² на согласование', type:'number', required:true},
    {code:'UF_CRM_1737116070781', label:'Направление/вид бизнеса клиента', type:'text', required:true},
    {code:'UF_CRM_1755537385514', label:'Город и адрес', type:'text', required:true},
    {code:'UF_CRM_1756910832606', label:'Как пойдет', type:'text', required:false},
    {code:'UF_CRM_1756969983186', label:'НДС (Отсутствует/Сверху+процент)', type:'text', required:true},
    {code:'UF_CRM_175569699283186', label:'Отопление (Отсутствует/Сверху/Иное)', type:'text', required:true},
  ];

  const LONGS = [
    {code:'UF_CRM_1757040827538', label:'Опишите максимально подробно, что необходимо сделать на объекте для того, чтобы арендатор заехал. Именно этот запрос попадет в строительный отдел. Если ни каких работ не требуется, так и напишите\\nПример: 1. Стены выровнять, зашпаклевать - покрасят сами\\n2. Пол подготовить под ламинат\\n3. Откосы выровнять и закрыть\\n4. Провести электрику\\n5. Установить двери\\n6. Привести в порядок коридорную группу\\nАрендатор своими силами положит ламинат и устроит натяжной потолок, покрасить стены', type:'textarea', required:true},
    {code:'UF_CRM_1757040956282', label:'Опишите, что-то еще, что пригодится для принятия решения. Например — как давно пустует помещение, или что вы договорились, что через 3 месяца цена вырастет... Тут можно указать любую важную дополнительную информацию, которой нет в полях сделки', type:'textarea', required:false},
  ];

  function makeInput(field, value){
    const wrap = document.createElement('div');
    wrap.className = 'field' + (field.required ? ' required' : '');
    const id = 'f_' + field.code;
    wrap.innerHTML = `<label for="${id}">${field.label}</label>`;
    let el;
    if(field.type === 'textarea'){
      el = document.createElement('textarea');
      el.className = 'input';
      el.placeholder = field.required ? 'обязательно заполните' : '';
      el.value = value || '';
    }else{
      el = document.createElement('input');
      el.className = 'input';
      el.type = field.type || 'text';
      el.placeholder = field.required ? 'обязательно заполните' : '';
      el.value = (value ?? '').toString();
    }
    el.id = id;
    el.name = field.code;
    wrap.appendChild(el);
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = field.required ? 'Обязательное поле' : ' ';
    wrap.appendChild(hint);

    const setFilled = () => {
      if(String(el.value || '').trim().length) wrap.classList.add('filled');
      else wrap.classList.remove('filled');
      validate();
    };
    el.addEventListener('input', setFilled);
    setFilled();
    return wrap;
  }

  function renderForm(deal){
    const form = sel('#deal_form');
    form.innerHTML = '';

    // Grid of short fields
    const grid = document.createElement('div');
    grid.className = 'grid';
    for(const f of FIELDS){
      grid.appendChild(makeInput(f, deal[f.code]));
    }
    form.appendChild(grid);

    // Long fields row (2 columns)
    const longGrid = document.createElement('div');
    longGrid.className = 'grid';
    for(const f of LONGS){
      longGrid.appendChild(makeInput(f, deal[f.code]));
    }
    form.appendChild(longGrid);

    sel('#form_wrap').classList.remove('hidden');
  }

  function collectChanges(initial){
    const data = {};
    const inputs = sel('#deal_form').querySelectorAll('.input');
    inputs.forEach((el)=>{
      const code = el.name;
      const val = (el.value || '').toString();
      if ((initial[code] || '') !== val) data[code] = val;
    });
    return data;
  }

  function validate(){
    const submit = sel('#submit');
    const requiredFields = document.querySelectorAll('.field.required .input');
    let ok = true;
    requiredFields.forEach((el)=>{
      if(!String(el.value || '').trim().length) ok = false;
    });
    submit.disabled = !ok;
    return ok;
  }

  async function main(){
    showStatus('Подключаемся к порталу…');
    let bx;
    try{
      bx = await ensureBX24();
      addDiag('typeof BX24', typeof BX24);
    }catch(e){
      addDiag('bx24', 'not loaded: ' + e.message);
    }

    const dealId = await resolveDealId();
    if(!dealId){
      showStatus('Не удалось определить ID сделки. Добавьте макросы #ID# / #DEAL_ID# / #ENTITY_ID# в URL обработчика виджета или откройте виджет из карточки сделки.', 'error');
      return;
    }
    addDiag('Deal ID', dealId);

    if(!bx){ // still try if BX24 missing
      showStatus('BX24 недоступен. Откройте виджет из карточки сделки.', 'error');
      return;
    }

    // Fetch deal
    BX24.callMethod('crm.deal.get', {id: dealId}, (r)=>{
      const data = r && r.data && r.data();
      if(!data){
        showStatus('Не удалось получить данные сделки', 'error');
        return;
      }
      showStatus('Данные сделки получены');
      renderForm(data);

      // Hook submit
      sel('#submit').onclick = ()=>{
        if(!validate()) return;
        const fields = collectChanges(data);
        if(Object.keys(fields).length === 0){
          // nothing to save – still show success to proceed
          sel('#success').classList.remove('hidden');
          return;
        }
        BX24.callMethod('crm.deal.update', {id: dealId, fields}, (res)=>{
          const err = res && res.error && res.error();
          if(err){
            showStatus('Ошибка сохранения: ' + err, 'error');
          }else{
            sel('#success').classList.remove('hidden');
          }
        });
      };
    });
  }

  // Kick off
  main().catch(e=>{
    showStatus('Ошибка инициализации: ' + (e && e.message ? e.message : e), 'error');
  });
})();
