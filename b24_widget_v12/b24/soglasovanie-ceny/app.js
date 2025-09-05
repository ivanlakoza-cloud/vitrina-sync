
// === Helpers ===
const qs = (s, d=document)=>d.querySelector(s);
const qsa = (s, d=document)=>Array.from(d.querySelectorAll(s));
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

// Parse query
function parseQuery(){
  const q = {};
  const s = location.search.replace(/^\?/, '');
  s.split('&').forEach(p=>{
    if(!p) return;
    const [k,v] = p.split('=');
    q[decodeURIComponent(k)] = decodeURIComponent((v||'').replace(/\+/g,' '));
  });
  return q;
}
const QUERY = parseQuery();

// Mapping UI -> CRM fields (замени на свои UF_* при необходимости)
const FIELD_MAP = {
  clientComment: 'UF_CRM_CLIENT_COMMENT',
  businessType: 'UF_CRM_BUSINESS_TYPE',
  cityAddress: 'UF_CRM_CITY_ADDRESS',
  heating: 'UF_CRM_HEATING',
  area: 'UF_CRM_AREA_M2',
  priceM2: 'UF_CRM_PRICE_M2_APPROVAL',
  holidays: 'UF_CRM_RENT_HOLIDAYS',
  vat: 'UF_CRM_VAT_MODE',
  workDesc: 'UF_CRM_WORK_DESC',
  extraInfo: 'UF_CRM_EXTRA_INFO'
};

// Required fields list (ids in the form)
const REQUIRED_IDS = ['clientComment','businessType','cityAddress','heating','area','priceM2','holidays','vat','workDesc','extraInfo'];

let DEAL_ID = null;
let initialData = {};   // store original values to diff later
let bxReady = false;

// Show alerts
function showAlert(type, html){
  const box = qs('#alerts');
  const el = document.createElement('div');
  el.className = `alert ${type}`;
  el.innerHTML = html;
  box.appendChild(el);
  return el;
}
function clearAlerts(){ qs('#alerts').innerHTML=''; }

// Visual helpers
function setInvalid(el, invalid){
  const wrap = el.closest('.input-wrap');
  if(!wrap) return;
  wrap.classList.toggle('invalid', !!invalid);
  wrap.classList.toggle('filled', !invalid && String(el.value).trim().length>0);
}
function validateAll(){
  let ok = true;
  REQUIRED_IDS.forEach(id=>{
    const el = qs('#'+id);
    const v = String(el.value).trim();
    const invalid = v.length===0;
    setInvalid(el, invalid);
    if(invalid) ok = false;
  });
  qs('#submitBtn').disabled = !ok;
  return ok;
}

// Detect Deal ID
async function detectDealId(){
  // 1) placement.info
  if(window.BX24 && typeof BX24.placement !== 'undefined'){
    try{
      const info = await new Promise(res=>BX24.placement.info(res));
      if(info && info.options && info.options.ID) return String(info.options.ID);
    }catch(e){/* ignore */}
  }
  // 2) query
  const keys = ['ID','id','deal_id','DEAL_ID','entityId'];
  for(const k of keys){
    if(QUERY[k]) return String(QUERY[k]);
  }
  // 3) referrer
  if(document.referrer){
    const m = document.referrer.match(/\/crm\/deal\/details\/(\d+)\//);
    if(m) return m[1];
  }
  return null;
}

// BX init with guard
async function ensureBX(){
  // wait for BX24 object
  const started = Date.now();
  while(!window.BX24 && Date.now()-started < 8000){
    await sleep(80);
  }
  if(!window.BX24){
    showAlert('error', 'Не удалось инициализировать BX24 (объект недоступен). Откройте виджет в карточке сделки.');
    throw new Error('BX24 not available');
  }
  // try init
  try{
    await new Promise((resolve)=>{
      let resolved = false;
      BX24.init(function(){
        resolved = true; resolve();
      });
      // safety resolve after 1s even if callback not fired (известный глюк)
      setTimeout(()=>{ if(!resolved) resolve(); }, 1200);
    });
    bxReady = true;
  }catch(e){
    showAlert('error','Ошибка инициализации BX24: '+e.message);
    throw e;
  }
}

// Bitrix call wrapper with friendly errors
function callBX(method, params){
  return new Promise((resolve,reject)=>{
    try{
      BX24.callMethod(method, params, function(res){
        const e = res && res.error();
        if(e){
          reject(new Error(e.ex.error_description || e.ex.error || 'Bitrix error'));
        }else{
          resolve(res.data());
        }
      });
    }catch(err){
      reject(err);
    }
  });
}

// Load deal fields
async function loadDeal(){
  DEAL_ID = await detectDealId();
  if(!DEAL_ID){
    showAlert('error','Не удалось определить ID сделки. Проверьте ссылку виджета или откройте виджет внутри карточки сделки.');
    throw new Error('deal id not found');
  }
  const st = qs('#statusBlock');
  st.className = 'small';
  st.textContent = `Загружаем сделку #${DEAL_ID}…`;

  await ensureBX();
  const deal = await callBX('crm.deal.get', {id: DEAL_ID});
  st.textContent = `Сделка #${DEAL_ID} загружена`;

  // Fill fields
  Object.entries(FIELD_MAP).forEach(([uiId, crmCode])=>{
    const el = qs('#'+uiId);
    const v = (deal && (deal[crmCode] ?? deal[uiId] ?? '')) || '';
    el.value = String(v ?? '');
    initialData[uiId] = String(el.value);
    setInvalid(el, String(el.value).trim().length===0);
  });
  validateAll();
}

// Build diff {crmField: value}
function buildDiff(){
  const diff = {};
  Object.entries(FIELD_MAP).forEach(([uiId, crmCode])=>{
    const cur = String(qs('#'+uiId).value).trim();
    const old = String(initialData[uiId] ?? '').trim();
    if(cur !== old){
      diff[crmCode] = cur;
    }
  });
  return diff;
}

async function onSubmit(){
  clearAlerts();
  if(!validateAll()){
    showAlert('error','Заполните обязательные поля.');
    return;
  }
  const btn = qs('#submitBtn');
  btn.disabled = true;
  btn.textContent = 'Отправляем…';

  try{
    const changed = buildDiff();
    if(Object.keys(changed).length>0){
      await callBX('crm.deal.update', {id: DEAL_ID, fields: changed});
    }else{
      showAlert('info','Изменений в полях нет — запускаю бизнес‑процесс.');
    }
    // Запуск БП №209
    await callBX('bizproc.workflow.start', {TEMPLATE_ID: 209, DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', DEAL_ID]});
    // Success screen
    qs('#success').style.display = '';
    qs('.container').style.display = 'none';
  }catch(e){
    showAlert('error','Ошибка при отправке: '+e.message);
    btn.disabled = false;
    btn.textContent = 'ОТПРАВИТЬ СТОИМОСТЬ М² НА СОГЛАСОВАНИЕ';
  }
}

// Listeners
document.addEventListener('DOMContentLoaded', ()=>{
  // mark filled/invalid visual states and enable button
  REQUIRED_IDS.forEach(id=>{
    const el = qs('#'+id);
    ['input','change','blur'].forEach(ev=>el.addEventListener(ev, validateAll));
  });
  qs('#submitBtn').addEventListener('click', onSubmit);
  // init
  loadDeal().catch(err=>{
    console.error(err);
  });
});
