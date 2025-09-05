(function () {
  const rev = 35;
  const qs = new URLSearchParams(location.search);
  const summary = document.getElementById('summary');
  const placementBox = document.getElementById('placement');
  const qsBox = document.getElementById('qs');
  const ref = document.getElementById('ref');
  const auth = document.getElementById('auth');
  const statusBox = document.getElementById('statusBox');
  const statusTitle = document.getElementById('statusTitle');
  const statusText = document.getElementById('statusText');

  function safeJSONStringify(o){
    try { return JSON.stringify(o, null, 2); }
    catch(e){ return String(o); }
  }

  function logSummary(lines){
    summary.textContent = lines.join("\n");
  }

  // Initial summary
  const info = [
    `boot v${rev}`,
    `path={location.pathname}`,
    `query=?rev=${qs.get('rev')||''}&DOMAIN=${qs.get('DOMAIN')||'(none)'}&PROTOCOL=${qs.get('PROTOCOL')||''}&LANG=${qs.get('LANG')||''}&APP_SID=${qs.get('APP_SID')||''}`,
    `typeof BX24={typeof window.BX24}`
  ];
  logSummary(info);

  // Query + referrer
  qsBox.textContent = safeJSONStringify(Object.fromEntries(qs.entries()));
  ref.value = document.referrer || '';

  // Wire buttons (no errors if BX24 is missing)
  const btnPlacement = document.getElementById('btnPlacement');
  const btnGetAuth = document.getElementById('btnGetAuth');
  const btnAppInfo = document.getElementById('btnAppInfo');

  btnPlacement.onclick = function(){
    if (!window.BX24 || !BX24.placement) {
      placementBox.textContent = 'BX24.placement недоступен (не внутри Bitrix24?).';
      return;
    }
    BX24.placement.info(function(d){ placementBox.textContent = safeJSONStringify(d); });
  };

  btnGetAuth.onclick = function(){
    if (!window.BX24 || !BX24.getAuth) { auth.textContent = 'BX24.getAuth недоступен.'; return; }
    BX24.getAuth(function (a) { auth.textContent = safeJSONStringify(a); });
  };

  btnAppInfo.onclick = function(){
    if (!window.BX24 || !BX24.callMethod) { auth.textContent = 'BX24.callMethod недоступен.'; return; }
    BX24.callMethod('app.info', {}, function(r){
      try { auth.textContent = safeJSONStringify(r.data && r.data()); }
      catch(e){ auth.textContent = 'Ошибка чтения app.info'; }
    });
  };

  // If page renders and no fatal JS errors — show "Готово"
  setTimeout(() => {
    statusBox.hidden = false;
    statusTitle.textContent = 'Страница загружена';
    statusText.textContent = 'Отрисовка прошла без критичных ошибок. Если BX24 недоступен вне карточки сделки — это нормально.';
  }, 300);
})();
