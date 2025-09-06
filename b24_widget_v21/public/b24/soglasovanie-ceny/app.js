
(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const CONFIG = {
    fields: {
      area: 'UF_CRM_AREA_M2',
      rate: 'UF_CRM_PRICE_M2_APPROVAL',
      priceComment: 'UF_CRM_CLIENT_COMMENT'
    },
    required: ['area','rate','priceComment']
  };

  function status(msg){ const el = $("#status"); if(el) el.textContent = msg || ""; }
  function saveNote(id, text){ const el = $("#saved_"+id); if(el) el.textContent = text || ""; }
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

  async function ensureBX(){
    const start = Date.now();
    while(!window.BX24 && Date.now()-start<8000){ await sleep(80); }
    if(!window.BX24) throw new Error("BX24 недоступен. Откройте виджет в карточке сделки.");
    await new Promise(res=>{ let ok=false; BX24.init(()=>{ok=true; res();}); setTimeout(()=>{ if(!ok) res(); }, 1200); });
  }
  function bxCall(method, params){
    return new Promise((resolve,reject)=>{
      try{
        BX24.callMethod(method, params, (r)=>{
          const e = r && r.error();
          if(e){ reject(new Error(e.ex?.error_description || e.ex?.error || "Bitrix error")); }
          else{ resolve(r.data()); }
        });
      }catch(err){ reject(err); }
    });
  }

  function getQuery(){ const q={}; location.search.replace(/^\?/,'').split('&').forEach(p=>{ if(!p) return; const [k,v]=p.split('='); q[decodeURIComponent(k)] = decodeURIComponent((v||'').replace(/\+/g,' ')); }); return q; }
  async function detectDealId(){
    if(window.BX24 && BX24.placement){
      try{ const info = await new Promise(res=>BX24.placement.info(res)); if(info?.options?.ID) return {id:String(info.options.ID), source:'placement'}; }catch{}
    }
    const q = getQuery();
    for(const k of ['ID','id','deal_id','DEAL_ID','entityId']) if(q[k]) return {id:String(q[k]), source:'query'};
    if(document.referrer){
      const m = document.referrer.match(/\/crm\/deal\/details\/(\d+)\//);
      if(m) return {id:m[1], source:'referrer'};
    }
    return {id: undefined, source: "n/a"};
  }

  let dealId; const lastSaved = Object.create(null);

  function setFilledState(el){
    if(!el) return;
    const v = String(el.value||'').trim();
    el.classList.toggle('is-invalid', v.length===0);
  }
  function validateAll(){
    let ok = true;
    for(const id of CONFIG.required){
      const el = $("#"+id);
      if(!el) continue;
      const v = String(el.value||'').trim();
      const invalid = v.length===0;
      el.classList.toggle('is-invalid', invalid);
      if(invalid) ok = false;
    }
    $("#btnSend").disabled = !ok;
    return ok;
  }

  function setFormValues(deal) {
    const map = CONFIG.fields;
    $("#area").value = deal[map.area] ?? "";
    $("#rate").value = deal[map.rate] ?? "";
    $("#priceComment").value = deal[map.priceComment] ?? "";
  }

  async function autosaveField(fieldId){
    try{
      const el = $("#"+fieldId); if(!el) return;
      const value = String(el.value ?? "").trim();
      const uf = CONFIG.fields[fieldId]; if(!uf) return;
      if(lastSaved[fieldId] === value) return;
      status("Сохраняем «"+ fieldId +"»…");
      await bxCall('crm.deal.update', { id: dealId, fields: { [uf]: value } });
      lastSaved[fieldId] = value;
      saveNote(fieldId, "Сохранено ✓");
      status("Сохранено.");
    }catch(e){
      saveNote(fieldId, "Ошибка: "+e.message);
      status("Ошибка сохранения поля «"+fieldId+"»: "+e.message);
    }finally{
      validateAll();
    }
  }

  async function onSubmit(e){
    e?.preventDefault();
    if(!validateAll()){ status("Заполните обязательные поля."); return; }
    $("#btnSend").disabled = true;
    status("Отправляем…");

    const changed = {};
    for(const [id, uf] of Object.entries(CONFIG.fields)){
      const cur = String(($("#"+id)?.value ?? "")).trim();
      if(lastSaved[id] !== cur) changed[uf] = cur;
    }

    try{
      if(Object.keys(changed).length){
        await bxCall('crm.deal.update', { id: dealId, fields: changed });
      }
      await bxCall('bizproc.workflow.start', { TEMPLATE_ID: 209, DOCUMENT_ID: ['crm','CCrmDocumentDeal', dealId] });
      $("#form").style.display = "none";
      $("#success").style.display = "";
      status("");
    }catch(e){
      $("#btnSend").disabled = false;
      status("Ошибка отправки: "+e.message);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try{
      status("Подключаемся к порталу…");
      await ensureBX();
      const {id, source} = await detectDealId();
      if(!id){ throw new Error("Не удалось определить ID сделки."); }
      dealId = id;
      status(`Сделка #${dealId} (источник: ${source}). Загружаем…`);

      const deal = await bxCall('crm.deal.get', { id: dealId });
      setFormValues(deal);

      for(const key of Object.keys(CONFIG.fields)){
        lastSaved[key] = String(($("#"+key)?.value ?? "")).trim();
        setFilledState($("#"+key));
        saveNote(key, "Загружено");
      }
      validateAll();
      status("Готово.");

      for(const key of Object.keys(CONFIG.fields)){
        const el = $("#"+key);
        if(!el) continue;
        el.addEventListener('input', () => { setFilledState(el); validateAll(); });
        el.addEventListener('blur', () => autosaveField(key));
      }

      $("#btnSend").addEventListener('click', onSubmit);
      $("#form").addEventListener('submit', onSubmit);
    }catch(e){
      status("Ошибка инициализации: "+e.message);
    }
  });
})();
