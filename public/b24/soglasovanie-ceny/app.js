/* global BX24 */
(() => {
  const $ = (s) => document.querySelector(s);
  const logEl = $("#log");
  const statusEl = $("#status");
  const saveStatusEl = $("#saveStatus");

  const CONFIG = {
    // Сопоставление полей сделки (замени при необходимости)
    fields: {
      area: "UF_CRM_67E22212D0313",           // Площадь (м2)
      rate: "UF_CRM_67E22212D7964",           // Ставка за м2 (руб)
      priceComment: "UF_CRM_1757040956282",   // Комментарий менеджера по цене
      // statusAgree: "UF_CRM_1755689184167", // (enum) Статус согласования — заполни, если нужно
    },
    required: ["area", "rate"],               // Обязательные поля перед отправкой
    placementTimeoutMs: 4500
  };

  const logs = [];
  function log(msg, data) {
    const ts = new Date().toTimeString().slice(0,8);
    let line = `[${ts}] ${msg}`;
    if (data !== undefined) {
      try { line += "\n" + JSON.stringify(data, null, 2); } catch {}
    }
    logs.push(line);
    logEl.textContent = logs.join("\n\n");
  }

  $("#btnReload").addEventListener("click", () => location.reload());
  $("#btnCopy").addEventListener("click", async () => {
    await navigator.clipboard.writeText(logEl.textContent || "");
    saveStatusEl.textContent = "Скопировано ✅";
    setTimeout(() => saveStatusEl.textContent = "", 1500);
  });

  function setStatus(t){ statusEl.textContent = t; }

  // ---- Определение dealId ----
  function pickDealIdFrom(obj) {
    if (!obj) return undefined;
    const keys = ["ID","DEAL_ID","deal_id","dealId","ENTITY_ID","entityId"];
    for (const k of keys) {
      const v = obj[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v);
    }
    return undefined;
  }

  async function placementInfoSafe(){
    return new Promise((resolve) => {
      let done = false;
      try{
        BX24.placement.info((d) => { if (done) return; done = true; resolve(d || null); });
        setTimeout(() => { if (done) return; resolve(null); }, CONFIG.placementTimeoutMs);
      }catch{
        resolve(null);
      }
    });
  }

  async function detectDealId(){
    // 1) Попробуем из server-injected POST
    const POST = window.__B24_POST || {};
    log("Server POST injected", POST);
    let id = pickDealIdFrom(POST.PLACEMENT_OPTIONS_PARSED) || pickDealIdFrom(POST);
    if (id) return { id, source: "server.POST" };

    // 2) Query
    const qp = Object.fromEntries(new URLSearchParams(location.search).entries());
    id = pickDealIdFrom(qp);
    if (id) return { id, source: "query" };

    // 3) placement.info
    const pi = await placementInfoSafe();
    log("placement.info", pi ? (pi.options || pi) : { note: "no data" });
    if (pi && (pi.options || pi)) {
      id = pickDealIdFrom(pi.options || pi);
      if (id) return { id, source: "placement.info" };
    }

    return { id: undefined, source: "n/a" };
  }

  // ---- Загрузка / заполнение ----
  function setFormValues(deal) {
    const map = CONFIG.fields;
    $("#area").value = deal[map.area] ?? "";
    $("#rate").value = deal[map.rate] ?? "";
    $("#priceComment").value = deal[map.priceComment] ?? "";
  }

  function validatePayload() {
    const payload = {
      [CONFIG.fields.area]: $("#area").value.trim(),
      [CONFIG.fields.rate]: $("#rate").value.trim(),
      [CONFIG.fields.priceComment]: $("#priceComment").value.trim(),
    };
    const missing = [];
    if (!payload[CONFIG.fields.area]) missing.push("Площадь");
    if (!payload[CONFIG.fields.rate]) missing.push("Ставка");
    return { payload, missing };
  }

  function bxCall(method, params){
    return new Promise((resolve, reject) => {
      try{
        BX24.callMethod(method, params, (res) => {
          if (res.error()) reject(new Error(res.error() + ": " + res.error_description()));
          else resolve(res.data());
        });
      }catch(e){ reject(e); }
    });
  }

  async function main(){
    setStatus("Инициализация BX24…");
    // api/v1 иногда не грузится автоматически — подстрахуемся
    if (!window.BX24) {
      log("api/v1: тег не загрузился автоматически, добавляем вручную");
      const s = document.createElement("script");
      s.src = "https://api.bitrix24.com/api/v1/";
      document.head.appendChild(s);
      await new Promise(r => s.onload = r);
    }

    if (!window.BX24) {
      setStatus("BX24 не доступен. Откройте виджет из карточки сделки.");
      log("BX24 missing");
      return;
    }

    await new Promise(res => BX24.init(res));
    log("BX24.init: done");
    setStatus("Определяем ID сделки…");

    const { id: dealId, source } = await detectDealId();
    log("Deal ID detect", { dealId, source });
    if (!dealId) {
      setStatus("Не удалось определить ID сделки. Проверьте placement настройки.");
      return;
    }

    setStatus(`Загружаем сделку #${dealId}…`);
    const deal = await bxCall("crm.deal.get", { id: dealId }).catch((e) => {
      log("crm.deal.get error", String(e));
      setStatus("Ошибка загрузки сделки");
      return null;
    });
    if (!deal) return;

    setFormValues(deal);
    setStatus("Готово");
    log("Deal loaded", { id: dealId });
    
    // Отправка
    $("#form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      saveStatusEl.textContent = "";
      const { payload, missing } = validatePayload();
      if (missing.length){
        saveStatusEl.textContent = `Заполните: ${missing.join(", ")}`;
        saveStatusEl.className = "err";
        return;
      }
      setStatus("Сохраняем…");
      saveStatusEl.textContent = "Сохраняем…";

      try{
        await bxCall("crm.deal.update", { id: dealId, fields: payload });
        saveStatusEl.textContent = "Сохранено ✅";
        saveStatusEl.className = "ok";
        setStatus("Готово");
        log("crm.deal.update: ok", payload);
      }catch(e){
        saveStatusEl.textContent = "Ошибка сохранения";
        saveStatusEl.className = "err";
        setStatus("Ошибка сохранения");
        log("crm.deal.update error", String(e));
      }
    });
  }

  // Boot
  log("Environment", {
    href: location.href,
    referrer: document.referrer,
    userAgent: navigator.userAgent
  });
  main();
})();
