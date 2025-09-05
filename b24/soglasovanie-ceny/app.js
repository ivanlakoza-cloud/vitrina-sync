
/*! b24 widget app.js — v28: robust dealId resolution (TAB + ACTIVITY) */
(function () {
  const $ = (s) => document.querySelector(s);

  const bootTag = 'boot v28';
  const diagBox = (function initDiag() {
    const box = document.getElementById('diag');
    if (box) {
      const li = document.createElement('li');
      li.textContent = bootTag;
      li.style.opacity = '0.9';
      box.appendChild(li);
    }
    return box;
  })();

  function diag(line) {
    if (!diagBox) return;
    const li = document.createElement('li');
    li.textContent = line;
    diagBox.appendChild(li);
  }

  function showStatus(msg, type) {
    const el = document.getElementById('status') || document.querySelector('.status');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'status' + (type ? (' ' + type) : '');
  }

  // ensure the BX24 client is available
  function ensureBx24() {
    return new Promise((resolve, reject) => {
      if (window.BX24) return resolve();
      const s = document.createElement('script');
      s.src = 'https://api.bitrix24.com/api/v1/';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Не удалось загрузить https://api.bitrix24.com/api/v1/'));
      document.head.appendChild(s);
    });
  }

  // promisified callMethod
  const bxCall = (method, params = {}) =>
    new Promise((resolve, reject) => {
      try {
        window.BX24.callMethod(method, params, (r) => {
          if (!r) return reject(new Error(method + ': нет ответа'));
          if (r.error && r.error()) {
            return reject(new Error(method + ': ' + r.error() + (r.error_description ? (' — ' + r.error_description()) : '')));
          }
          try { resolve(r.data ? r.data() : r); }
          catch (e) { resolve(r); }
        });
      } catch (e) {
        reject(e);
      }
    });

  async function resolveDealId() {
    // 1) placement
    const placementInfo = await new Promise((res) => BX24.placement.info(res));
    const placement = placementInfo && placementInfo.placement;
    const options = placementInfo && placementInfo.options ? placementInfo.options : {};
    diag(`placement=${placement}`);
    diag(`options=${JSON.stringify(options)}`);

    // TAB/MENU: приходит ID сделки напрямую
    if (placement === 'CRM_DEAL_DETAIL_TAB' || placement === 'CRM_DEAL_DETAIL_MENU') {
      const id = Number(options.ID || options.id);
      if (id) return id;
    }

    // ACTIVITY: options.ID = id активности → достаём DEAL через crm.activity.get
    if (placement === 'CRM_DEAL_DETAIL_ACTIVITY') {
      const activityId = Number(options.ID || options.id);
      if (activityId) {
        diag(`activityId=${activityId}`);
        const act = await bxCall('crm.activity.get', { id: activityId });
        const ownerId = Number(act && act.OWNER_ID);
        const ownerType = Number(act && act.OWNER_TYPE_ID);
        diag(`activity.ownerType=${ownerType}, ownerId=${ownerId}`);
        if (ownerType === 2 && ownerId) return ownerId; // 2 → DEAL
      }
    }

    // 2) query string fallback
    const q = new URLSearchParams(location.search);
    const fromQuery = q.get('deal_id') || q.get('DEAL_ID') || q.get('entityId') || q.get('ENTITY_ID') || q.get('ID') || q.get('id');
    if (fromQuery) return Number(fromQuery);

    // 3) referrer fallback
    const m = (document.referrer || '').match(/\/crm\/deal\/details\/(\d+)\//);
    if (m) return Number(m[1]);

    return null;
  }

  (async function main() {
    try {
      showStatus('Загружаю API Bitrix24…');
      await ensureBx24();
      await new Promise((r) => BX24.ready(r));

      // для диагностики
      diag(`path=${location.pathname}`);
      diag(`query=${location.search || '(empty)'}`);
      diag(`typeof BX24=${typeof BX24}`);

      showStatus('Определяю ID сделки…');
      const dealId = await resolveDealId();
      if (!dealId) {
        showStatus('ID сделки не найден. Откройте виджет из карточки сделки.', 'error');
        return;
      }

      showStatus(`Загружаю сделку #${dealId}…`);
      const deal = await bxCall('crm.deal.get', { id: dealId });

      // Сохраняем в window для внешних обработчиков/старого кода
      window.__B24WIDGET__ = window.__B24WIDGET__ || {};
      window.__B24WIDGET__.dealId = dealId;
      window.__B24WIDGET__.deal = deal;

      // Отправим событие, чтобы внешний код (если есть) подхватил
      try {
        window.dispatchEvent(new CustomEvent('b24widget:dealLoaded', { detail: { dealId, deal } }));
      } catch (e) {}

      showStatus('Готово', 'ok');
    } catch (e) {
      console.error(e);
      showStatus(e && e.message ? e.message : 'Ошибка', 'error');
    }
  })();
})();
