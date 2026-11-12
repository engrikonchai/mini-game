import { Check, Home, RotateCcw, Share2, Sparkles, Trophy, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/engine';
import { correctAnswers } from '../plural';
import { shareResult, type ShareOutcome } from '../share';

interface Props {
  state: GameState;
  storageOk: boolean;
  onReplay: () => void;
  onHome: () => void;
}

const SHARE_TEXT: Record<Exclude<ShareOutcome, 'cancelled'>, string> = {
  shared: 'Podijeljeno. Hvala!',
  copied: 'Rezultat i link su kopirani.',
  failed: 'Dijeljenje nije uspjelo na ovom uređaju.',
};

export function ResultScreen({ state, storageOk, onReplay, onHome }: Props) {
  const [share, setShare] = useState<ShareOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const primary = useRef<HTMLButtonElement>(null);
  const { streak, best, newRecord, exhausted } = state;

  useEffect(() => {
    // Move focus off the (now unmounted) answer field so keyboards close and screen readers land here.
    primary.current?.focus({ preventScroll: true });
  }, []);

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    setShare(null);
    setShare(await shareResult(streak));
    setBusy(false);
  };

  return (
    <section className="screen result" aria-labelledby="result-title">
      <div className="result__body">
        <p className="result__eyebrow" id="result-title">{exhausted ? 'Ispraznio si bazu!' : 'Kraj igre'}</p>
        <div className="result__score" aria-label={`Niz: ${streak}`}>
          <span className="result__num">{streak}</span>
          <span className="result__unit">{correctAnswers(streak)} zaredom</span>
        </div>

        {newRecord ? (
          <p className="result__record is-new">
            <Sparkles size={17} strokeWidth={2.4} aria-hidden /> Novi rekord!
          </p>
        ) : (
          <p className="result__record">
            <Trophy size={16} strokeWidth={2.2} aria-hidden /> Rekord: <strong>{best}</strong>
          </p>
        )}
        {!storageOk && <p className="result__note">Rekord se na ovom uređaju čuva samo dok je stranica otvorena.</p>}
      </div>

      <div className="result__actions">
        <button ref={primary} type="button" className="btn btn--primary btn--xl" onClick={onReplay}>
          <RotateCcw size={20} strokeWidth={2.6} aria-hidden />
          Aj još jednu
        </button>
        <div className="result__row">
          <button type="button" className="btn btn--secondary" onClick={onShare} disabled={busy}>
            <Share2 size={18} strokeWidth={2.2} aria-hidden />
            Podijeli
          </button>
          <button type="button" className="btn btn--secondary" onClick={onHome}>
            <Home size={18} strokeWidth={2.2} aria-hidden />
            Početna
          </button>
        </div>
        <p className={`share-status${share === 'failed' ? ' is-error' : ''}`} role="status" aria-live="polite">
          {share && share !== 'cancelled' && (
            <>
              {share === 'failed' ? <TriangleAlert size={15} aria-hidden /> : <Check size={15} strokeWidth={2.6} aria-hidden />}
              {SHARE_TEXT[share]}
            </>
          )}
        </p>
      </div>
    </section>
  );
}
