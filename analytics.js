(() => {
  if (location.pathname.startsWith('/cms')) return;

  const storageKey = 'gradstroy_visitor';
  let visitor;
  try {
    visitor = localStorage.getItem(storageKey);
    if (!visitor) {
      visitor = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(storageKey, visitor);
    }
  } catch {
    visitor = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  const send = (type) => {
    const payload = JSON.stringify({
      type,
      visitor,
      path: location.pathname,
      title: document.title,
      referrer: type === 'pageview' ? document.referrer : '',
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', new Blob([payload], { type: 'application/json' }));
      return;
    }
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  };

  send('pageview');
  const heartbeat = setInterval(() => {
    if (document.visibilityState === 'visible') send('heartbeat');
  }, 60_000);
  addEventListener('pagehide', () => clearInterval(heartbeat), { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') send('heartbeat');
  });
})();
