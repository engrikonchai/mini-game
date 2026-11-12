import { correctAnswers } from './plural';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

export async function shareResult(streak: number): Promise<ShareOutcome> {
  const url = import.meta.env.VITE_SHARE_URL || window.location.origin + window.location.pathname;
  const text = `Dok znaš: ${streak} ${correctAnswers(streak)} zaredom. Možeš li bolje?`;

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'Dok znaš', text, url });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
      // Fall through to the clipboard (e.g. NotAllowedError in some in-app browsers).
    }
  }

  const full = `${text} ${url}`;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(full);
      return 'copied';
    }
  } catch {
    /* try the legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = full;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}
