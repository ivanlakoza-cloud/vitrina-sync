
(() => {
  const $ = (s) => document.querySelector(s);
  const statusEl = $('#status');
  const logEl = $('#log');

  const now = () => new Date().toTimeString().slice(0,8);
  const safe = (v) => {
    try { return typeof v === 'string' ? v : JSON.stringify(v, null, 2); }
    catch { return String(v); }
  };
  const setStatus = (msg, cls='') => {
    statusEl.textContent = msg;
    statusEl.className = 'status ' + cls;
  };
  const push = (lvl, msg, obj) => {
    logEl.textContent += `[${now()}] ${msg}\n`;
    if (obj !== undefined) logEl.textContent += safe(obj) + '\n';
    logEl.scrollTop = logEl.scrollHeight;
    if (lvl === 'ok') setStatus(msg, 'ok');
    if (lvl === 'warn') setStatus(msg, 'warn');
    if (lvl === 'err') setStatus(msg, 'err');
  };

  $('#btnCopy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(logEl.textContent); setStatus('Логи скопированы', 'ok'); }
    catch(e){ setStatus('Не удалось скопировать: ' + e.message, 'warn'); }
  });
  $('#btnReload').addEventListener('click', () => location.reload());

  window.addEventListener('error', e => push('err', `window.onerror: ${e.message||e.error}`, {stack: e.error && e.error.stack}));
  window.addEventListener('unhandledrejection', e => push('err', 'unhandledrejection', {reason: (e.reason && (e.reason.stack||e.reason.message)) || String(e.reason)}));

  // Ensure Bitrix API
  const ensureApi = () => new Promise((resolve) => {
    if (window.BX24 && typeof window.BX24.init === 'function') return resolve(push('ok', 'api/v1: already present'));
    const s = document.createElement('script');
    s.src = 'https://api.bitrix24.com/api/v1/';
    s.async = true;
    s.onload = () => { push('ok', 'api/v1: injected manually'); resolve(); };
    s.onerror = () => { push('err', 'api/v1: failed to load'); resolve(); };
    document.head.appendChild(s);
  });

  const call = (method, params={}) => new Promise((resolve) => {
    try {
      window.BX24.callMethod(method, params, (res) => {
        if (res && res.error()) {
          push('warn', `${method}: error`, { error: res.error(), error_description: res.error_description() });
          return resolve(null);
        }
        resolve(res && res.data ? res.data() : null);
      });
    } catch (e) {
      push('err', `${method}: exception`, { message: e.message, stack: e.stack });
      resolve(null);
    }
  });

  const getSearch = () => Object.fromEntries(new URLSearchParams(location.search));

  async function waitPlacementInfo(retries=5, delay=500) {
    for (let i=0;i<retries;i++) {
      const info = await new Promise((resolve) => {
        let done = false;
        const finish = (v) => { if(!done){ done = true; resolve(v); } };
        try {
          window.BX24.placement.info((d) => finish(d || null));
          setTimeout(() => finish(null), delay);
        } catch(e) {
          finish(null);
        }
      });
      if (info) return info;
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(2000, delay + 250);
    }
    push('warn', 'placement.info: timeout/empty after retries');
    return null;
  }

  function guessDealId(opts) {
    const q = getSearch();
    const candidates = [q.ID, q.id, q.deal_id, q.dealId, q.ENTITY_VALUE_ID, q.ENTITY_ID];
    if (opts && typeof opts === 'object') {
      candidates.push(opts.ID, opts.id, opts.deal_id, opts.dealId, opts.ENTITY_VALUE_ID, opts.ENTITY_ID, opts.entityId, opts.entityValueId);
    }
    return candidates.find(Boolean) || null;
  }

  async function diagnostics() {
    push('ok', 'Environment', { href: location.href, referrer: document.referrer, userAgent: navigator.userAgent });

    try { push('ok', 'getAuth()', window.BX24.getAuth ? window.BX24.getAuth() : 'null'); } catch(e){ push('warn','getAuth() failed',{message:e.message}); }
    try { push('ok', 'getLang()', window.BX24.getLang ? window.BX24.getLang() : 'null'); } catch(e){ push('warn','getLang() failed',{message:e.message}); }
    try { push('ok', 'supportedMethods()', window.BX24.supportedMethods ? (window.BX24.supportedMethods().slice(0,15)) : 'n/a'); } catch(e){}

    const placement = await waitPlacementInfo();
    if (placement) push('ok', 'placement.info', placement);

    let dealId = guessDealId(placement && placement.options);
    if (dealId) push('ok', 'dealId guessed = ' + dealId);
    else push('warn', 'dealId not detected');

    const user = await call('user.current');
    if (user) push('ok', 'user.current: ok', user);

    const appInfo = await call('app.info');
    if (appInfo) push('ok', 'app.info: ok', appInfo);

    const fields = await call('crm.deal.fields');
    if (fields) push('ok', 'crm.deal.fields: ok', fields);

    if (!dealId && user && user.ID) {
      const list = await call('crm.deal.list', { order: { 'ID':'DESC' }, filter: { 'ASSIGNED_BY_ID': user.ID }, select: ['ID','TITLE'], start: 0 });
      if (Array.isArray(list) && list.length) {
        push('warn', 'Fallback last deals by assigned user (top 3)', list.slice(0,3));
      }
    }

    if (dealId) {
      await call('crm.deal.get', { id: dealId });
    }

    setStatus('Готово', 'ok');
  }

  (async () => {
    setStatus('Подключаемся к порталу...');
    await ensureApi();

    if (window.BX24) {
      push('ok', 'BX24 detected', { type: typeof BX24, keys: Object.keys(BX24||{}).length });
    } else {
      push('err', 'BX24 not detected');
      setStatus('BX24 не доступен. Откройте из карточки сделки.', 'err');
      return;
    }

    try {
      window.BX24.init(async () => {
        push('ok', 'BX24.init: done');
        await diagnostics();
      });
    } catch (e) {
      push('err', 'BX24.init exception', { message: e.message, stack: e.stack });
      setStatus('Ошибка инициализации BX24', 'err');
    }
  })();
})();
