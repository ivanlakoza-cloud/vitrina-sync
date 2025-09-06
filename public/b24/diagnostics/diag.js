(() => {
  const $ = (id) => document.getElementById(id);
  const preJson = (el, data) => { el.textContent = JSON.stringify(data, null, 2); };
  const now = () => new Date().toLocaleTimeString();

  function summaryLine() {
    const env = {
      href: location.href,
      referrer: document.referrer || "(empty)",
      userAgent: navigator.userAgent,
    };
    return `[# ${now()}] Environment\n` + JSON.stringify(env, null, 2);
  }

  function copy(text) {
    try {
      navigator.clipboard.writeText(text);
    } catch {}
  }

  function detectDealId(ctx) {
    const ids = [];
    const push = (v, label) => { if (v !== undefined && v !== null && String(v).trim() !== "") ids.push({ source: label, value: String(v) }); };

    const inj = (ctx && ctx.inj) || {};
    const place = (ctx && ctx.place) || {};
    const q = Object.fromEntries(new URLSearchParams(location.search).entries());

    // From server-injected POST
    push(inj.ID, "POST.ID");
    push(inj.DEAL_ID, "POST.DEAL_ID");
    push(inj.deal_id, "POST.deal_id");
    push(inj.ENTITY_ID, "POST.ENTITY_ID");

    // Parsed placement options from server
    if (inj.PLACEMENT_OPTIONS_PARSED) {
      push(inj.PLACEMENT_OPTIONS_PARSED.ID, "POST.PLACEMENT_OPTIONS.ID");
      push(inj.PLACEMENT_OPTIONS_PARSED.ENTITY_ID, "POST.PLACEMENT_OPTIONS.ENTITY_ID");
      push(inj.PLACEMENT_OPTIONS_PARSED.deal_id, "POST.PLACEMENT_OPTIONS.deal_id");
    }

    // From placement.info
    if (place && place.options) {
      push(place.options.ID, "placement.options.ID");
      push(place.options.ENTITY_ID, "placement.options.ENTITY_ID");
      push(place.options.deal_id, "placement.options.deal_id");
    }

    // From query
    push(q.ID, "query.ID");
    push(q.DEAL_ID, "query.DEAL_ID");
    push(q.deal_id, "query.deal_id");
    push(q.entityId, "query.entityId");
    push(q.ENTITY_ID, "query.ENTITY_ID");

    let best = ids.find(Boolean);
    return { candidates: ids, best: best ? best.value : "" };
  }

  function setIdDetect(ctx) {
    const box = $("idDetect");
    const det = detectDealId(ctx);
    const lines = [];
    lines.push("Кандидаты ID (порядок обнаружения):");
    det.candidates.forEach((c, i) => lines.push(`${i+1}. ${c.source} = ${c.value}`));
    lines.push("");
    lines.push("Выбранный ID: " + (det.best || "(не найден)"));
    box.textContent = lines.join("\n");
    return det.best;
  }

  async function bxReady() {
    return new Promise((resolve) => {
      const start = Date.now();
      const timer = setInterval(() => {
        if (typeof window.BX24 !== "undefined" && window.BX24 && typeof window.BX24.init === "function") {
          clearInterval(timer);
          resolve(window.BX24);
        } else if (Date.now() - start > 5000) {
          clearInterval(timer);
          resolve(null);
        }
      }, 50);
    });
  }

  async function askPlacement() {
    const status = $("placementStatus");
    status.textContent = "запрашиваем…";
    return new Promise((resolve) => {
      let done = false;
      const to = setTimeout(() => {
        if (!done) {
          status.textContent = "timeout (1500ms)";
          resolve(null);
        }
      }, 1500);
      try {
        window.BX24.placement.info((d) => {
          if (done) return;
          done = true;
          clearTimeout(to);
          status.textContent = "ok";
          resolve(d);
        });
      } catch (e) {
        clearTimeout(to);
        status.textContent = "error";
        resolve(null);
      }
    });
  }

  async function getDeal(id) {
    return new Promise((resolve) => {
      try{
        window.BX24.callMethod("crm.deal.get", { id }, (res) => {
          if (res && res.error()) {
            resolve({ error: res.error(), error_description: res.error_description() });
          } else {
            resolve(res ? res.data() : null);
          }
        });
      }catch(e){
        resolve({ error: String(e) });
      }
    });
  }

  async function getAuth() {
    return new Promise((resolve) => {
      try{
        window.BX24.getAuth((a) => resolve(a));
      }catch(e){ resolve({ error: String(e) }); }
    });
  }

  async function appInfo() {
    return new Promise((resolve) => {
      try{
        window.BX24.callMethod("app.info", {}, (res) => {
          if (res && res.error()) resolve({ error: res.error(), error_description: res.error_description() });
          else resolve(res ? res.data() : null);
        });
      }catch(e){ resolve({ error: String(e) }); }
    });
  }

  async function main() {
    // Initial summary
    $("summary").textContent = summaryLine();
    // Server POST
    const inj = window.__B24_POST || {};
    preJson($("server"), inj);
    // Query & referrer
    preJson($("query"), Object.fromEntries(new URLSearchParams(location.search).entries()));
    $("ref").textContent = document.referrer || "(empty)";

    $("copyTpl").addEventListener("click", () => copy($("tpl").value));
    $("btnPlacement").addEventListener("click", async () => {
      const place = await askPlacement();
      preJson($("placement"), place || {note:"no data"});
      setIdDetect({ inj, place });
    });
    $("btnGetDeal").addEventListener("click", async () => {
      const manual = $("manualId").value.trim();
      const place = JSON.parse($("placement").textContent || "null");
      const best = manual || setIdDetect({ inj, place });
      if (!best) { $("deal").textContent = "ID не найден"; return; }
      const data = await getDeal(best);
      preJson($("deal"), data);
    });
    $("btnAuth").addEventListener("click", async () => {
      const a = await getAuth();
      preJson($("auth"), a);
    });
    $("btnScope").addEventListener("click", async () => {
      const info = await appInfo();
      const cur = $("auth").textContent.trim();
      $("auth").textContent = (cur ? cur + "\n\n" : "") + "app.info:\n" + JSON.stringify(info, null, 2);
    });

    const bx = await bxReady();
    if (!bx) {
      $("summary").textContent += "\n\n[warn] BX24 не загрузился за 5с";
      return;
    }
    try{
      bx.init(() => {});
    }catch{}

    // first auth + placement
    const a = await getAuth();
    $("auth").textContent = "getAuth():\n" + JSON.stringify(a, null, 2);
    const place = await askPlacement();
    preJson($("placement"), place || {note:"no data"});
    setIdDetect({ inj, place });
  }

  document.addEventListener("DOMContentLoaded", main);
})();