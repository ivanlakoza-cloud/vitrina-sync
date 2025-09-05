
// v14 tweaks
const qs = (s, d=document)=>d.querySelector(s);
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
function parseQuery(){ const q={}; location.search.replace(/^\?/,'').split('&').forEach(p=>{ if(!p) return; const [k,v]=p.split('='); q[decodeURIComponent(k)]=decodeURIComponent((v||'').replace(/\+/g,' ')); }); return q; }
const QUERY = parseQuery();
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

function showAlert(type, html){
  const box = qs('#b24app #alerts');
  const el = document.createElement('div');
  el.className = `alert ${type}`; el.innerHTML = html; box.appendChild(el); return el;
}
function clearAlerts(){ const box = qs('#b24app #alerts'); if(box) box.innerHTML=''; }
function setInvalid(el, invalid){
  const wrap = el.closest('.input-wrap'); if(!wrap) return;
  wrap.classList.toggle('invalid', !!invalid);
  wrap.classList.toggle('filled', !invalid && String(el.value).trim().length>0);
}
function validateAll(){
  let ok = true;
  REQUIRED_IDS.forEach(id=>{
    const el = qs('#b24app #'+id);
    const v = String(el.value).trim();
    const invalid = v.length===0;
    setInvalid(el, invalid); if(invalid) ok = false;
  });
  qs('#b24app #submitBtn').disabled = !ok; return ok;
}
async function detectDealId(){
  if(window.BX24 && typeof BX24.placement !== 'undefined'){
    try{ const info = await new Promise(res=>BX24.placement.info(res)); if(info?.options?.ID) return String(info.options.ID); }catch{}
  }
  for(const k of ['ID','id','deal_id','DEAL_ID','entityId']) if(QUERY[k]) return String(QUERY[k]);
  if(document.referrer){ const m = document.referrer.match(/\/crm\/deal\/details\/(\d+)\//); if(m) return m[1]; }
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
  const st = qs('#b24app #statusBlock');
  DEAL_ID = await detectDealId();
  if(!DEAL_ID){ showAlert('error','Не удалось определить ID сделки.'); throw new Error('deal id not found'); }
  st.className='small'; st.textContent = `Загружаем сделку #${DEAL_ID}…`;
  await ensureBX();
  const deal = await callBX('crm.deal.get', {id: DEAL_ID});
  st.textContent = `Сделка #${DEAL_ID} загружена`;
  Object.entries(FIELD_MAP).forEach(([uiId, crmCode])=>{
    const el = qs('#b24app #'+uiId);
    el.value = String(deal?.[crmCode] ?? deal?.[uiId] ?? '');
    initialData[uiId] = String(el.value);
    setInvalid(el, el.value.trim().length===0);
  });
  validateAll();
}
function buildDiff(){
  const diff={};
  Object.entries(FIELD_MAP).forEach(([uiId, crmCode])=>{
    const cur = String(qs('#b24app #'+uiId).value).trim();
    const old = String(initialData[uiId] ?? '').trim();
    if(cur !== old) diff[crmCode] = cur;
  });
  return diff;
}
async function onSubmit(){
  clearAlerts();
  if(!validateAll()){ showAlert('error','Заполните обязательные поля.'); return; }
  const btn = qs('#b24app #submitBtn'); btn.disabled = true; btn.textContent = 'Отправляем…';
  try{
    const changed = buildDiff();
    if(Object.keys(changed).length) await callBX('crm.deal.update', {id: DEAL_ID, fields: changed});
    else showAlert('info','Изменений нет — запускаю бизнес-процесс.');
    await callBX('bizproc.workflow.start', {TEMPLATE_ID: 209, DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', DEAL_ID]});
    qs('#b24app .container').style.display='none';
    qs('#b24app #success').style.display='';
  }catch(e){
    showAlert('error','Ошибка при отправке: '+e.message);
    btn.disabled=false; btn.textContent='ОТПРАВИТЬ СТОИМОСТЬ М² НА СОГЛАСОВАНИЕ';
  }
}
document.addEventListener('DOMContentLoaded', ()=>{
  Object.keys(FIELD_MAP).forEach(id=>{
    const el = qs('#b24app #'+id);
    ['input','change','blur'].forEach(ev=>el?.addEventListener(ev, validateAll));
  });
  qs('#b24app #submitBtn').addEventListener('click', onSubmit);
  loadDeal().catch(console.error);
});
