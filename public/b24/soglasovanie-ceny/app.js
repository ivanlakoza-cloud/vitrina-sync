
// b24 widget app script — safe boot with BX24 fallback
// build: v27-fix-bx24-timeout
(function () {
  const BOOT = 'v27';
  const $ = (sel) => document.querySelector(sel);
  const statusEl = $('#status');

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }
  function diag() {
    const box = $('#diag');
    if (!box) return;
    const q = location.search || '(нет)';
    box.innerHTML = [
      `<li>boot ${BOOT}</li>`,
      `<li>path=${location.pathname}</li>`,
      `<li>query=${q}</li>`,
      `<li>typeof BX24=${typeof window.BX24}</li>`,
    ].join('');
    box.parentElement?.classList?.remove('hidden');
  }

  // graceful boot
  setStatus('Загрузка...');

  // If BX24 appears, continue; otherwise, show fallback after short timeout
  const START_TIMEOUT_MS = 1200;
  let continued = false;

  function continueWithBx24() {
    if (continued) return;
    continued = true;
    try {
      // If BX24 exists we can call placement or proceed; otherwise fallback
      if (typeof window.BX24 === 'object' && window.BX24?.ready) {
        setStatus('Подключаемся к порталу...');
        // Let the original widget code (if any) hook into BX24 here.
        try {
          // Some existing builds relied on firing a custom event to kick real init
          document.dispatchEvent(new CustomEvent('bx24:ready'));
        } catch (_) {}
      } else {
        setStatus('BX24 не доступен. Откройте виджет из карточки сделки.');
        diag();
      }
    } catch (e) {
      setStatus('Ошибка инициализации');
      diag();
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  // Try to wait a moment — if BX24 loads (в Bitrix iframe) this will succeed
  setTimeout(continueWithBx24, START_TIMEOUT_MS);

  // Also auto-continue as soon as BX24 becomes available
  let tries = 0;
  const iv = setInterval(() => {
    tries += 1;
    if (typeof window.BX24 === 'object' || tries > 50) {
      clearInterval(iv);
      continueWithBx24();
    }
  }, 100);

  // Always show basic diagnostics in standalone mode
  window.addEventListener('DOMContentLoaded', () => {
    if (typeof window.BX24 === 'undefined') {
      diag();
    }
  });
})();
