
// ===== B24 widget app.js — build v17 (public/ structure) =====
(function(){
// --- Build banner visible in any markup ---
const BUILD = { num: 17, tag: 'v17' };
console.log('[B24] Widget build', BUILD, 'href=', location.href);
const q = Object.fromEntries(new URLSearchParams(location.search));
const badge = document.createElement('div');
badge.id = 'b24-build-badge';
badge.textContent = `Проверка ${BUILD.num} • {rev}`.replace('{rev}', q.rev ? `rev=${q.rev}` : 'rev=?');
Object.assign(badge.style, {
  position:'fixed', right:'12px', top:'8px', zIndex: 2147483647,
  background:'rgba(27,33,51,.95)', color:'#cbd5ff',
  border:'1px solid #2f3550', borderRadius:'999px',
  padding:'6px 10px', fontSize:'12px', fontFamily:'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial',
  pointerEvents:'none', boxShadow:'0 8px 20px rgba(0,0,0,.25)'
});
document.addEventListener('DOMContentLoaded', ()=> document.body.appendChild(badge));

// --- Gentle CSS patches (labels weight, sticky header if we can detect one) ---
const style = document.createElement('style');
style.id = 'b24-patch-v17';
style.textContent = `
  /* make labels normal weight everywhere on this page */
  label { font-weight: 400 !important; }
  /* nice focus */
  input[type="text"]:focus, input[type="number"]:focus, textarea:focus { outline: none; box-shadow: 0 0 0 3px rgba(124,92,255,.25) !important; }
  /* sticky header helper */
  .b24-stick { position: sticky; top: 0; z-index: 9999; background: rgba(15,17,21,.96); backdrop-filter: saturate(120%) blur(6px); }
`;
document.head.appendChild(style);
document.addEventListener('DOMContentLoaded', ()=>{
  const h1 = Array.from(document.querySelectorAll('h1')).find(h=>/Проверка полей сделки/i.test(h.textContent||''));
  if(h1 && h1.parentElement) h1.parentElement.classList.add('b24-stick');
});

// --- Existing business logic kept (safe if called multiple times) ---
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
function parseQuery(){ return q; }

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
const REQUIRED_IDS = Object.keys(FIELD_MAP);
let DEAL_ID = null, initialData = {};

function byId(id){ return document.getElementById(id); }
function showAlert(type, html){
  let box = document.getElementById('alerts');
  if(!box){ box = document.createElement('div'); box.id='alerts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = `alert ${type}`; el.innerHTML = html; box.appendChild(el); return el;
}
function clearAlerts(){ const box = document.getElementById('alerts'); if(box) box.innerHTML=''; }
function setInvalid(el, invalid){
  if(!el) return;
  const wrap = el.closest('.input-wrap') || el.parentElement;
  if(!wrap) return;
  wrap.classList.toggle('invalid', !!invalid);
  if(!invalid && String(el.value).trim().length>0) wrap.classList.add('filled');
}
function validateAll(){
  let ok = true;
  REQUIRED_IDS.forEach(id=>{
    const el = byId(id);
    if(!el) return; // tolerate missing fields in markup
    const v = String(el.value||'').trim();
    const invalid = v.length===0;
    setInvalid(el, invalid); if(invalid) ok = false;
  });
  const btn = document.getElementById('submitBtn');
  if(btn) btn.disabled = !ok;
  return ok;
}
async function detectDealId(){
  if(window.BX24 && typeof BX24.placement !== 'undefined'){
    try{ const info = await new Promise(res=>BX24.placement.info(res)); if(info?.options?.ID) return String(info.options.ID); }catch{}
  }
  for(const k of ['ID','id','deal_id','DEAL_ID','entityId']) if(q[k]) return String(q[k]);
  if(document.referrer){ const m = document.referrer.match(/\\/crm\\/deal\\/details\\/(\\d+)\\//); if(m) return m[1]; }
  return null;
}
async function ensureBX(){
  const started = Date.now();
  while(!window.BX24 && Date.now()-started<8000){ await sleep(80); }
  if(!window.BX24){ showAlert('error','BX24 недоступен. Откройте виджет в карточке сделки.'); throw new Error('BX24 not available'); }
  await new Promise(res=>{ let ok=false; BX24.init(()=>{ok=true; res();}); setTimeout(()=>{ if(!ok) res(); }, 1200); });
}
function callBX(method, params){
  return new Promise((resolve,reject)=>{
    try{ BX24.callMethod(method, params, r=>{ const e = r?.error(); if(e) reject(new Error(e.ex.error_description || e.ex.error || 'Bitrix error')); else resolve(r.data()); }); }
    catch(err){ reject(err); }
  });
}
async function loadDeal(){
  const st = document.getElementById('statusBlock');
  DEAL_ID = await detectDealId();
  if(!DEAL_ID){ showAlert('error','Не удалось определить ID сделки.'); throw new Error('deal id not found'); }
  if(st){ st.className='small'; st.textContent = `Загружаем сделку #${DEAL_ID}…`; }
  await ensureBX();
  const deal = await callBX('crm.deal.get', {id: DEAL_ID});
  if(st) st.textContent = `Сделка #${DEAL_ID} загружена`;

  Object.entries(FIELD_MAP).forEach(([uiId, crmCode])=>{
    const el = byId(uiId);
    if(!el) return;
    el.value = String(deal?.[crmCode] ?? deal?.[uiId] ?? '');
    initialData[uiId] = String(el.value);
    setInvalid(el, el.value.trim().length===0);
  });
  validateAll();
}
function buildDiff(){
  const diff={};
  Object.entries(FIELD_MAP).forEach(([uiId, crmCode])=>{
    const el = byId(uiId); if(!el) return;
    const cur = String(el.value||'').trim();
    const old = String(initialData[uiId] ?? '').trim();
    if(cur !== old) diff[crmCode] = cur;
  });
  return diff;
}
async function onSubmit(){
  clearAlerts();
  if(!validateAll()){ showAlert('error','Заполните обязательные поля.'); return; }
  const btn = document.getElementById('submitBtn'); if(btn){ btn.disabled = true; btn.textContent = 'Отправляем…'; }
  try{
    const changed = buildDiff();
    if(Object.keys(changed).length) await callBX('crm.deal.update', {id: DEAL_ID, fields: changed});
    else showAlert('info','Изменений нет — запускаю бизнес-процесс.');
    await callBX('bizproc.workflow.start', {TEMPLATE_ID: 209, DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', DEAL_ID]});
    const cont = document.querySelector('.container'); const succ = document.getElementById('success');
    if(cont) cont.style.display='none'; if(succ) succ.style.display='';
  }catch(e){
    showAlert('error','Ошибка при отправке: '+e.message);
    if(btn){ btn.disabled=false; btn.textContent='ОТПРАВИТЬ СТОИМОСТЬ М² НА СОГЛАСОВАНИЕ'; }
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  // bind events if fields exist
  REQUIRED_IDS.forEach(id=>{
    const el = byId(id);
    if(el) ['input','change','blur'].forEach(ev=>el.addEventListener(ev, validateAll));
  });
  const btn = document.getElementById('submitBtn');
  if(btn) btn.addEventListener('click', onSubmit);
  loadDeal().catch(console.error);
});
})();
