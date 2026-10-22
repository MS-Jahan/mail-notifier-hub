// A support report users can paste into an issue. It contains NO e-mail addresses, names, subjects or message text:
// only versions, settings, and per-provider health (counts, error messages, backoff).
export function buildDiagnostics({ manifest, userAgent, settings, state, providers, sessions, idleState, now = Date.now() }) {
  const age = (t) => (t ? Math.round((now - t) / 1000) + 's ago' : 'never');
  return {
    extension: `${manifest.name} ${manifest.version}`,
    browser: userAgent,
    idleState,
    settings: { intervalMin: settings.intervalMin, recentMin: settings.recentMin, notify: settings.notify, sound: settings.sound, scanOnVisit: settings.scanOnVisit, theme: settings.theme },
    providers: Object.values(providers).map((p) => {
      const accounts = Object.values(state.accounts || {}).filter((a) => a.provider === p.id);
      const bo = state.backoff?.[p.id];
      return {
        id: p.id,
        enabled: !!settings.providers[p.id],
        sessionCookiePresent: !!sessions[p.id],
        accounts: accounts.length,
        disabledAccounts: (settings.disabledAccounts || []).filter((k) => k.startsWith(p.id + ':')).length,
        unreadTotals: accounts.map((a) => a.total ?? null),
        lastUpdate: accounts.map((a) => age(a.updatedAt)),
        errors: [...new Set(accounts.map((a) => a.error).filter(Boolean))],
        backoff: bo ? { step: bo.step, retryIn: Math.max(0, Math.round((bo.until - now) / 1000)) + 's' } : null,
        accountsDetected: age(state.detected?.[p.id]?.at)
      };
    })
  };
}
