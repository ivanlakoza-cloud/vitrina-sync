
/* global BX24 */
(function () {
  const root = document.getElementById('app');
  const submitBtn = document.getElementById('submit');

  const FIELD_MAP = [
    ['UF_CRM_1737115114028', 'Комментарий клиента, что важно клиенту?', 'textarea', true],
    ['UF_CRM_1737115941816', 'Площадь м²', 'text', true],
    ['UF_CRM_1737116070781', 'Направление/вид бизнеса клиента', 'text', true],
    ['UF_CRM_1737116470642', 'Стоимость м² на согласование', 'text', true],
    ['UF_CRM_1755537385514', 'Город и адрес', 'text', true],
    ['UF_CRM_1756910832606', 'Арендные каникулы (есть/нет/сколько)', 'text', true],
    ['UF_CRM_1756969923506', 'Отопление (Отсутствует/Сверху/Иное)', 'text', true],
    ['UF_CRM_1756969983186', 'НДС (Отсутствует/Сверху+процент)', 'text', true],
    ['UF_CRM_1757040827538', 'LONG_REPAIR', 'textarea', true],
    ['UF_CRM_1757040956282', 'LONG_MANAGER', 'textarea', true],
  ];

  const LONG_LABELS = {
    LONG_REPAIR:
`Опишите максимально подробно, что необходимо сделать на объекте для того, чтобы арендатор заехал. Именно этот запрос попадет в строительный отдел. Если ни каких работ не требуется, так и напишите
Пример:
1. Стены выровнять, зашпаклевать - покрасят сами
2. Пол подготовить под ламинат
3. Откосы выровнять и закрыть
4. Провести электрику
5. Установить двери
6. Привести в порядок коридорную группу
Арендатор своими силами положит ламинат и устроит натяжной потолок, покрасить стены`,
    LONG_MANAGER:
`Опишите, что-то еще, что пригодится для принятия решения. Например — как давно пустует помещение, или что вы договорились, что через 3 месяца цена вырастет. Тут можно указать любую важную дополнительную информацию, которой нет в полях сделки`
  };

  let dealId = null;
  let original = {};
  let inputNodes = {};
  let changed = {};
  let requiredUnset = new Set();

  function autoHeightTa(ta){
    const min = 120;
    ta.style.height = 'auto';
    ta.style.height = Math.max(min, ta.scrollHeight) + 'px';
  }

  function normalize(v){
    if(Array.isArray(v)){
      return v.join(', ');
    }
    if(v && typeof v === 'object'){
      return JSON.stringify(v);
    }
    return (v == null ? '' : String(v));
  }

  function renderForm(data){
    original = {};
    FIELD_MAP.forEach(([code]) => original[code] = normalize(data[code]));

    const pairs = [];
    function mkInput(code, label, type='text'){
      const group = document.createElement('div');
      group.className = 'group';

      const lab = document.createElement('div');
      lab.className = 'label';
      lab.textContent = label;
      group.appendChild(lab);

      const el = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
      el.className = 'input';
      el.value = normalize(data[code]);
      el.dataset.name = code;
      inputNodes[code] = el;

      if(type === 'textarea'){
        setTimeout(()=>autoHeightTa(el),0);
        el.addEventListener('input', () => autoHeightTa(el));
      }

      group.appendChild(el);
      return group;
    }

    const grid = document.createElement('div');
    grid.className = 'grid';

    for(const [code, label, type] of FIELD_MAP){
      if(label === 'LONG_REPAIR' || label === 'LONG_MANAGER') continue;
      const g = mkInput(code, label, type);
      grid.appendChild(g);
    }

    const div = document.createElement('div'); div.className='divider';

    function longRow(code, label){
      const row = document.createElement('div');
      row.className = 'longPair';

      const left = document.createElement('div');
      left.className = 'label longLabel';
      left.textContent = LONG_LABELS[label] || label;

      const taWrap = document.createElement('div');
      const ta = document.createElement('textarea');
      ta.className = 'input'; ta.dataset.name = code; ta.value = normalize(data[code]);
      inputNodes[code]=ta; setTimeout(()=>autoHeightTa(ta),0); ta.addEventListener('input', ()=>autoHeightTa(ta));
      taWrap.appendChild(ta);

      row.appendChild(left); row.appendChild(taWrap);
      return row;
    }

    const long1 = longRow('UF_CRM_1757040827538','LONG_REPAIR');
    const long2 = longRow('UF_CRM_1757040956282','LONG_MANAGER');

    root.innerHTML = '';
    root.appendChild(grid);
    root.appendChild(div);
    root.appendChild(long1);
    root.appendChild(long2);

    validateAll();
    Object.values(inputNodes).forEach(el => {
      if(el.value.trim()) el.classList.add('filled'); else el.classList.remove('filled');
    });
  }

  function validateAll(){
    requiredUnset.clear();
    for(const [code, , , required] of FIELD_MAP){
      const el = inputNodes[code];
      if(!el) continue;
      const v = (el.value||'').trim();
      if(required && !v){ requiredUnset.add(code); el.classList.add('invalid'); }
      else el.classList.remove('invalid');

      if(v){ el.classList.add('filled'); } else el.classList.remove('filled');
      if(normalize(original[code]) !== v) changed[code] = v;
      else delete changed[code];
    }
    submitBtn.disabled = requiredUnset.size > 0;
  }

  function valuesDiff(){
    const fields = {};
    for(const k in changed){ fields[k] = changed[k]; }
    return fields;
  }

  function showFinal(userName){
    const card = document.querySelector('.card');
    card.innerHTML = `
      <div class="final">
        <div class="big ok">Спасибо :) Отправлено!</div>
        <div style="opacity:.9;margin-top:8px;font-size:18px;">
          ${userName ? `${userName}, отлично! Запрос отправлен ✅<br/>` : ''}
          Уже скоро свяжемся с решением, что делаем дальше 🙂<br/>
          Благодарю за заявку! Желаю продуктивного дня 🚀
        </div>
      </div>`;
  }

  async function bx(method, params){
    return new Promise((resolve,reject)=>{
      BX24.callMethod(method, params||{}, function(res){
        if(res.error()) reject(new Error(res.error() + ': ' + res.error_description()));
        else resolve(res.data());
      });
    });
  }

  function fallbackReferrer(){
    const m = (document.referrer||'').match(/\/crm\/deal\/details\/(\d+)\//);
    return m ? m[1] : null;
  }

  function detectId(){
    const q = new URLSearchParams(location.search);
    let id = q.get('entityId') || q.get('ID') || q.get('id') || q.get('deal_id');
    if(id) return id;
    try{
      BX24.placement.info(function(info){
        try{
          const opts = info && info.options;
          if(opts && (opts.ID || opts.id)) {
            dealId = String(opts.ID || opts.id);
            load();
          } else dealId = fallbackReferrer(), load();
        }catch(e){ dealId = fallbackReferrer(), load(); }
      });
      return null;
    }catch(e){
      return fallbackReferrer();
    }
  }

  async function load(){
    try{
      const deal = await bx('crm.deal.get', { id: dealId });
      renderForm(deal);

      Object.values(inputNodes).forEach(el => el.addEventListener('input', validateAll));

      submitBtn.addEventListener('click', async () => {
        if(submitBtn.disabled) return;
        submitBtn.disabled = true;
        try{
          const diff = valuesDiff();
          if(Object.keys(diff).length){
            await bx('crm.deal.update', { id: dealId, fields: diff });
          }
          await bx('bizproc.workflow.start', {
            TEMPLATE_ID: 209,
            DOCUMENT_ID: ['crm','CCrmDocumentDeal', 'DEAL_' + dealId]
          });
          let userName = '';
          try{
            const user = await bx('user.get', { ID: deal.ASSIGNED_BY_ID });
            const u = Array.isArray(user) ? user[0] : user;
            userName = (u && (u.NAME || '') + ' ' + (u.LAST_NAME || '')).trim();
          }catch(_){}
          showFinal(userName);
        }catch(err){
          alert('Ошибка: ' + err.message);
          submitBtn.disabled = false;
        }
      });
    }catch(err){
      root.innerHTML = '<div style="color:#ff9a9a">Ошибка загрузки сделки: '+err.message+'</div>';
    }
  }

  function init(){
    try{
      BX24.init(function(){
        dealId = detectId();
        if(dealId){ load(); }
      });
    }catch(e){
      root.innerHTML = '<div class="hint">BX24 не доступен. Откройте виджет из карточки сделки.</div>';
    }
  }

  init();
})();
