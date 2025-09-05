
(function(){
  const el = sel => document.querySelector(sel);
  const app = el('#app');
  const submitBtn = el('#submit');
const statusEl = document.getElementById('status'); // элемент статуса вверху

function showStatus(msg, type='info'){
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`; // .status.error подсветит красным
}

if (!window.BX24) {
  showStatus('BX24 не доступен. Откройте виджет из карточки сделки.', 'error');
  const q = new URLSearchParams(location.search);
  const id = q.get('ID') || q.get('id') || q.get('deal_id') || q.get('entityId');
  // Даже если BX24 нет, но есть id из query — продолжаем рендер с ним:
  if (id) {
    renderFormWithDealId(id);
  }
  // И НИ В КОЕМ СЛУЧАЕ не делаем return без рендера!
}

if(!document.getElementById('status')){
  document.body.insertAdjacentHTML('afterbegin','<div id="status" class="status"></div>');
}

  const FIELDS = [
    {code:'UF_CRM_1737115114028', label:'Комментарий клиента, что важно клиенту?', type:'textarea', required:true},
    {code:'UF_CRM_1737115941816', label:'Площадь м²', type:'number', required:true},
    {code:'UF_CRM_1737116070781', label:'Направление/вид бизнеса клиента', required:true},
    {code:'UF_CRM_1737116470642', label:'Стоимость м² на согласование', type:'number', required:true},
    {code:'UF_CRM_1755537385514', label:'Город и адрес', required:true},
    {code:'UF_CRM_1756910832606', label:'Арендные каникулы (есть/нет/сколько)', required:true},
    {code:'UF_CRM_1756969923506', label:'Отопление (Отсутствует/Сверху/Иное)', required:true},
    {code:'UF_CRM_1756969983186', label:'НДС (Отсутствует/Сверху+процент)', required:true},
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
    {code:'UF_CRM_1757040956282', label:`Опишите, что-то еще, что пригодится для принятия решения. 
Например — как давно пустует помещение, или что вы договорились, что через 3 месяца цена вырастет...
Тут можно указать любую важную дополнительную информацию, которой нет в полях сделки`, type:'textarea', required:true},
  ];

  function html(strings,...vals){return strings.map((s,i)=>s+(vals[i]??'')).join('')}

  function showNotice(msg){
    app.innerHTML = '<div class="notice">'+msg+'</div>';
  }

  function resolveId(){
    // query
    const q = new URLSearchParams(location.search);
    let id = q.get('id')||q.get('ID')||q.get('deal_id')||q.get('DEAL_ID')||q.get('entityId');
    if(id) return id;
    // referrer (card url)
    const m = (document.referrer||'').match(/\/crm\/deal\/details\/(\d+)\//);
    if(m) return m[1];
    return null;
  }

  function ensureStateStyles(input){
    const v = (''+ (input.value ?? '')).trim();
    input.classList.toggle('filled', v!=='');
    if(input.dataset.required==='1'){
      input.classList.toggle('invalid', v==='');
    }
  }

  function validateAll(container){
    const inputs = container.querySelectorAll('[data-role="inp"]');
    let ok = true;
    inputs.forEach(inp=>{
      ensureStateStyles(inp);
      if(inp.dataset.required==='1' && (''+inp.value).trim()===''){ ok=false; }
    });
    submitBtn.disabled = !ok;
    return ok;
  }

  function renderForm(deal){
    const grid = document.createElement('div');
    grid.className = 'grid';
    // build 4 row-pairs (2x columns)
    const pairs = [
      [FIELDS[0], FIELDS[1]],
      [FIELDS[2], FIELDS[3]],
      [FIELDS[4], FIELDS[5]],
      [FIELDS[6], FIELDS[7]]
    ];
    pairs.forEach(([a,b])=>{
      const row = document.createElement('div');
      row.className = 'row-pair';
      [a,b].forEach(f=>{
        const g = document.createElement('div');
        g.className='group';
        const label = document.createElement('div'); label.className='label'; label.textContent=f.label;
        const input = document.createElement(f.type==='textarea'?'textarea':'input');
        if(f.type==='number'){ input.type='number'; input.step='any'; }
        input.value = (deal[f.code] ?? '') || '';
        input.className = 'input';
        input.dataset.role='inp';
        input.dataset.code=f.code;
        input.dataset.required = f.required?'1':'0';
        input.addEventListener('input', ()=>validateAll(grid));
        g.appendChild(label); g.appendChild(input);
        row.appendChild(g);
      });
      grid.appendChild(row);
    });

    // Divider
    const div = document.createElement('div'); div.className='divider'; grid.appendChild(div);

    // Long pair 1
    const long1 = document.createElement('div'); long1.className='longPair';
    const l1 = document.createElement('div'); l1.className='label longLabel'; l1.textContent=LONGS[0].label;
    const t1 = document.createElement('textarea'); t1.className='input'; t1.value=(deal[LONGS[0].code]??''); t1.dataset.role='inp'; t1.dataset.code=LONGS[0].code; t1.dataset.required='1';
    t1.addEventListener('input', ()=>validateAll(grid));
    long1.appendChild(l1); long1.appendChild(t1);
    grid.appendChild(long1);

    // Long pair 2
    const long2 = document.createElement('div'); long2.className='longPair';
    const l2 = document.createElement('div'); l2.className='label longLabel'; l2.textContent=LONGS[1].label;
    const t2 = document.createElement('textarea'); t2.className='input'; t2.value=(deal[LONGS[1].code]??''); t2.dataset.role='inp'; t2.dataset.code=LONGS[1].code; t2.dataset.required='1';
    t2.addEventListener('input', ()=>validateAll(grid));
    long2.appendChild(l2); long2.appendChild(t2);
    grid.appendChild(long2);

    app.innerHTML=''; app.appendChild(grid);
    validateAll(grid);

    return grid;
  }

  function collectChanges(container, original){
    const inputs = container.querySelectorAll('[data-role="inp"]');
    const changed = {};
    inputs.forEach(inp=>{
      const code = inp.dataset.code;
      const vNow = (''+(inp.value??'')).trim();
      const vOrig = (''+(original[code]??'')).trim();
      if(vNow !== vOrig){
        changed[code] = vNow;
      }
    });
    return changed;
  }

  async function start(){
    if(typeof BX24 === 'undefined'){
      showNotice('BX24 не доступен. Откройте виджет из карточки сделки.');
      return;
    }
    BX24.init(async function(){
      // Try placement.info for id
      let dealId = null;
      try{
        BX24.placement.info(function(data){
          try{
            if(data && data.options){
              const opts = data.options;
              if(opts.ID) dealId = opts.ID;
              if(!dealId && typeof opts==='string'){
                const parsed = JSON.parse(opts||'{}'); if(parsed.ID) dealId = parsed.ID;
              }
            }
          }catch(e){}
          // Fallbacks
          if(!dealId) dealId = resolveId();
          proceed(dealId);
        });
      }catch(e){
        // Fallbacks anyway
        dealId = resolveId();
        proceed(dealId);
      }
    });
  }

  function proceed(dealId){
    if(!dealId){
      showNotice('Не удалось определить ID сделки. Откройте из карточки сделки.');
      return;
    }
    // Load deal
    BX24.callMethod('crm.deal.get', { id: dealId }, function(r){
      if(r.error()){
        showNotice('Ошибка загрузки сделки: '+r.error());
        return;
      }
      const deal = r.data();
      const grid = renderForm(deal);

      submitBtn.onclick = function(){
        if(submitBtn.disabled) return;
        if(!validateAll(grid)) return;
        submitBtn.disabled = true;

        const changed = collectChanges(grid, deal);
        function afterUpdate(){
          // Start BP 209
          BX24.callMethod('bizproc.workflow.start', {
            TEMPLATE_ID: 209,
            DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', 'DEAL_'+dealId]
          }, function(res){
            app.innerHTML = html`
              <div class="final">
                <div class="big ok">Спасибо :) Отправлено!</div>
                <div>Ответственный менеджер получил уведомление и скоро свяжется <br/>с решением, что делаем дальше.</div>
                <br/><div>Ждем вас снова! ;)</div>
              </div>
            `;
          });
        }

        if(Object.keys(changed).length===0){
          afterUpdate();
        }else{
          BX24.callMethod('crm.deal.update', { id: dealId, fields: changed }, function(upd){
            afterUpdate();
          });
        }
      };
    });
  }

  start();
})();
