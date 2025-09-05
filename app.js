
(function(){
  const qs = (sel) => document.querySelector(sel);
  const el = qs.bind(document);
  const submitBtn = el('#submit');
  const statusEl = el('#status');
  const diag = el('#diag');
  const diagList = el('#diagList');
  const formWrap = el('#formWrap');
  const formEl = el('#dealForm');
  const doneEl = el('#done');

  const DEBUG = location.search.includes('debug=1');
  if (DEBUG) diag.classList.remove('hidden');

  function logDiag(msg){
    if (!DEBUG) return;
    const li = document.createElement('li'); li.textContent = msg; diagList.appendChild(li);
  }
  function showStatus(msg, type='info'){
    statusEl.textContent = msg;
    statusEl.className = `status ${type} card`;
  }
  function showError(msg){ showStatus(msg, 'error'); }

  const LONGS = [
    { code:'UF_CRM_1757040827538', label:'Опишите максимально подробно, что необходимо сделать на объекте для того, чтобы арендатор заехал. Именно этот запрос попадет в строительный отдел. Если ни каких работ не требуется, так и напишите\\nПример: 1. Стены выровнять, зашпаклевать - покрасят сами\\n2. Пол подготовить под ламинат\\n3. Откосы выровнять и закрыть\\n4. Провести электрику\\n5. Установить двери\\n6. Привести в порядок коридорную группу\\nАрендатор своими силами положит ламинат и устроит натяжной потолок, покрасить стены', type:'textarea', required:true },
    { code:'UF_CRM_1757040956282', label:'Опишите, что‑то еще, что пригодится для принятия решения. Например — как давно пустует помещение, или что вы договорились, что через 3 месяца цена вырастет... Тут можно указать любую важную дополнительную информацию, которой нет в полях сделки', type:'textarea', required:false },
  ];
  const FIELDS = [
    { code:'UF_CRM_1737115114028', label:'Комментарий клиента, что важно клиенту?', type:'textarea', required:true },
    { code:'UF_CRM_1737115941816', label:'Площадь м²', type:'number', required:true },
    { code:'UF_CRM_1737116070781', label:'Направление/вид бизнеса клиента', type:'text', required:true },
    { code:'UF_CRM_1737116470642', label:'Стоимость м² на согласование', type:'number', required:true },
    { code:'UF_CRM_1755537385514', label:'Город и адрес', type:'text', required:true },
    { code:'UF_CRM_1756910832606', label:'Арендные каникулы (есть/нет/сколько)', type:'text', required:false },
    { code:'UF_CRM_17569699235306', label:'Отопление (Отсутствует/Сверху/Иное)', type:'text', required:false },
    { code:'UF_CRM_1756969983186', label:'НДС (Отсутствует/Сверху+процент)', type:'text', required:false },
  ];

  const ALL_FIELDS = [...FIELDS, ...LONGS];

  // util to create form
  function fieldItem({label, name, type='text', value='', long=false}){
    const wrap = document.createElement('div');
    wrap.className = `form-item ${long ? 'long':''}`;
    const lab = document.createElement('label'); lab.className='label'; lab.textContent = label;
    const ctrl = (type === 'textarea') ? document.createElement('textarea') : document.createElement('input');
    if (type !== 'textarea') ctrl.type = type;
    ctrl.className = 'control';
    ctrl.name = name; ctrl.value = value ?? '';
    ctrl.addEventListener('input', () => {
      wrap.classList.toggle('filled', (ctrl.value ?? '').toString().trim().length>0);
      validateForm();
    });
    wrap.appendChild(lab);
    const cwrap = document.createElement('div'); cwrap.className='control'; cwrap.appendChild(ctrl);
    wrap.appendChild(cwrap);
    return {wrap, input: ctrl};
  }

  let DEAL_ID = null;
  let dealData = null;
  let inputsMap = new Map();

  function enableSubmit(flag){
    submitBtn.disabled = !flag;
  }

  function validateForm(){
    let ok = true;
    inputsMap.forEach((inp, code)=>{
      const cfg = ALL_FIELDS.find(f=>f.code===code);
      const item = inp.closest('.form-item');
      if (cfg && cfg.required){
        const val = (inp.value ?? '').toString().trim();
        const valid = val.length>0;
        item.classList.toggle('invalid', !valid);
        ok = ok && valid;
      }
    });
    enableSubmit(ok);
  }

  function buildForm(){
    formEl.innerHTML = '';
    inputsMap.clear();

    FIELDS.forEach(cfg => {
      const val = dealData?.[cfg.code] ?? '';
      const {wrap, input} = fieldItem({label: cfg.label, name: cfg.code, type: cfg.type, value: (Array.isArray(val)? val.join(', ') : val)});
      inputsMap.set(cfg.code, input);
      formEl.appendChild(wrap);
      wrap.classList.toggle('filled', (!!val && (val.toString().trim().length>0)));
    });

    LONGS.forEach(cfg => {
      const val = dealData?.[cfg.code] ?? '';
      const {wrap, input} = fieldItem({label: cfg.label, name: cfg.code, type: cfg.type, value: (Array.isArray(val)? val.join(', ') : val), long:true});
      inputsMap.set(cfg.code, input);
      formEl.appendChild(wrap);
      wrap.classList.toggle('filled', (!!val && (val.toString().trim().length>0)));
    });

    formWrap.classList.remove('hidden');
    validateForm();
  }

  function diffFields(){
    const fields = {};
    inputsMap.forEach((input, code)=>{
      const orig = dealData?.[code];
      let val = input.value;
      if (val === undefined || val === null) val = '';
      // normalize numbers
      if (/number/i.test(input.type)){
        const n = Number(val.toString().replace(',', '.'));
        if (!Number.isNaN(n)) val = n;
      }
      const same = (Array.isArray(orig)? orig.join(', ') : (orig ?? '')).toString() === val.toString();
      if (!same) fields[code] = val;
    });
    return fields;
  }

  async function handleSubmit(){
    enableSubmit(false);
    showStatus('Сохраняем изменения и запускаем бизнес‑процесс…', 'info');
    try{
      const changed = diffFields();
      if (Object.keys(changed).length){
        await bxCall('crm.deal.update', {id: DEAL_ID, fields: changed});
      }
      // Запуск БП #209
      const docId = ["crm", "CCrmDocumentDeal", `DEAL_${DEAL_ID}`];
      await bxCall('bizproc.workflow.start', { TEMPLATE_ID: 209, DOCUMENT_ID: docId });
      showStatus('Готово.', 'success');
      doneEl.classList.remove('hidden');
      formWrap.classList.add('hidden');
    }catch(e){
      console.error(e);
      showError('Ошибка при сохранении или запуске БП: ' + (e?.message || e));
      enableSubmit(true);
    }
  }

  submitBtn.addEventListener('click', (e)=>{ e.preventDefault(); handleSubmit(); });

  // BX helpers
  function loadBxSdk(){
    return new Promise((resolve,reject)=>{
      const s = document.createElement('script');
      s.src = 'https://api.bitrix24.com/api/v1/';
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Не удалось загрузить SDK Bitrix24'));
      document.head.appendChild(s);
    });
  }
  function bxInit(){
    return new Promise((resolve,reject)=>{
      if (!window.BX24){ reject(new Error('BX24 не найден после загрузки SDK')); return; }
      try{
        BX24.init(()=> resolve());
      }catch(e){ reject(e); }
    });
  }
  function bxCall(method, params){
    return new Promise((resolve,reject)=>{
      try{
        BX24.callMethod(method, params, (res)=>{
          if (res && res.error()) {
            reject(new Error(res.error() + ': ' + res.error_description()));
          }else{
            resolve(res.data && res.data());
          }
        });
      }catch(e){ reject(e); }
    });
  }

  async function detectDealId(){
    // 1) placement
    try{
      const info = await new Promise((resolve)=> BX24.placement.info(resolve));
      if (info && info.options && (info.options.ID || info.options.id)){
        return info.options.ID || info.options.id;
      }
    }catch(_){}
    // 2) query macros from Bitrix widget URL
    const q = new URLSearchParams(location.search);
    const keys = ['id','ID','deal_id','DEAL_ID','entityId','ENTITY_ID'];
    for (const k of keys){
      if (q.get(k)) return q.get(k);
    }
    // 3) referrer pattern
    const ref = document.referrer || '';
    const m = ref.match(/\/crm\/deal\/details\/(\d+)\//);
    if (m) return m[1];
    return null;
  }

  async function boot(){
    try{
      if (DEBUG){
        diag.classList.remove('hidden');
        diagList.innerHTML = '';
        logDiag('boot v27');
        logDiag('path=' + location.pathname);
        logDiag('query=' + location.search);
      }
      showStatus('Грузим SDK Bitrix24…');
      await loadBxSdk();
      showStatus('Инициализируем SDK…');
      await bxInit();
      if (DEBUG) logDiag('typeof BX24=' + typeof BX24);
      showStatus('Определяем ID сделки…');
      DEAL_ID = await detectDealId();
      if (!DEAL_ID){ showError('Не смогли определить ID сделки. Откройте виджет из карточки сделки.'); return; }
      if (DEBUG) logDiag('dealId='+DEAL_ID);
      showStatus('Загружаем данные сделки #' + DEAL_ID + '…');
      dealData = await bxCall('crm.deal.get', {id: DEAL_ID});
      if (!dealData){ showError('Не получили данные сделки'); return; }
      showStatus('Готово. Проверьте поля и отправьте на согласование.', 'success');
      buildForm();
    }catch(e){
      console.error(e);
      showError(e.message || e.toString());
    }
  }

  boot();
})();
