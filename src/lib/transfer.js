// Lightweight cross-route payload transfer using sessionStorage
const KEY = 'jossos.transferPayload';

export function setTransferPayload(payload) {
  try {
    const val = { ...payload, ts: Date.now() };
    sessionStorage.setItem(KEY, JSON.stringify(val));
  } catch (_) {}
}

export function peekTransferPayload() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function consumeTransferPayload(expectedRoute) {
  const data = peekTransferPayload();
  if (!data) return null;
  if (expectedRoute && data.route !== expectedRoute) return null;
  try { sessionStorage.removeItem(KEY); } catch (_) {}
  return data;
}

