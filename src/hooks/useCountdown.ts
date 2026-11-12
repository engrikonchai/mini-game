import { useEffect, useState } from 'react';
import type { Action, GameState } from '../game/engine';

/** Re-renders ~10×/s while the clock runs and dispatches a timeout once the deadline passes. */
export function useCountdown(state: GameState, dispatch: (a: Action) => void): number {
  const { phase, deadline, round, remainingMs, limitMs } = state;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (phase !== 'playing' || deadline === null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) dispatch({ type: 'timeout', now: t, round });
    };
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [phase, deadline, round, dispatch]);

  if (phase !== 'playing') return limitMs;
  if (deadline === null) return remainingMs ?? limitMs;
  return Math.min(limitMs, Math.max(0, deadline - now));
}
