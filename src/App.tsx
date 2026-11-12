import { ChevronRight, HelpCircle, ListChecks, LogOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { GameScreen, type ReportStatus } from './components/GameScreen';
import { ResultScreen } from './components/ResultScreen';
import { RulesContent } from './components/RulesContent';
import { Sheet } from './components/Sheet';
import { StartScreen } from './components/StartScreen';
import { initialState, reducer } from './game/engine';
import { displayNameFor, remainingAnswers } from './game/questions';
import { loadBest, saveBest, saveReport } from './game/storage';
import { useCountdown } from './hooks/useCountdown';
import { useVisualViewport } from './hooks/useVisualViewport';

type SheetKind = 'menu' | 'rules' | 'answers' | null;

const SHEET_TITLE: Record<Exclude<SheetKind, null>, string> = {
  menu: 'Pauza',
  rules: 'Kako se igra',
  answers: 'Tvoji odgovori',
};

export default function App() {
  useVisualViewport();
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(loadBest()));
  const remaining = useCountdown(state, dispatch);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [storageOk, setStorageOk] = useState(true);
  const [report, setReport] = useState<{ at: number; status: ReportStatus }>({ at: 0, status: 'idle' });
  const inGame = state.phase === 'playing' || state.phase === 'review';

  const focusInput = () => inputRef.current?.focus({ preventScroll: true });

  // Start/replay: render the game synchronously inside the tap so focus() opens the keyboard on iOS.
  const start = () => {
    flushSync(() => {
      setSheet(null);
      dispatch({ type: 'start', now: Date.now(), seed: (Math.random() * 2 ** 32) >>> 0, best: state.best });
    });
    focusInput();
  };

  // Dev-only helper for automated play-throughs (stripped from production builds).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__dokznas = {
      state: () => state,
      answer: () => {
        const q = state.question;
        if (!q) return null;
        const e = remainingAnswers(q, new Set(state.used))[0];
        return e ? displayNameFor(e, q) : null;
      },
    };
  }, [state]);

  // Pause while the tab is hidden; resume with the remaining time when it comes back.
  useEffect(() => {
    const onVisibility = () => {
      const now = Date.now();
      dispatch(document.hidden ? { type: 'pause', reason: 'hidden', now } : { type: 'resume', reason: 'hidden', now });
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Persist the record when a game ends with a new best.
  useEffect(() => {
    if (state.phase === 'over' && state.newRecord) setStorageOk(saveBest(state.best));
  }, [state.phase, state.newRecord, state.best]);

  // Gentle haptic on a lost life where supported (Android); iOS ignores it.
  useEffect(() => {
    if (state.lossSeq > 0 && state.phase === 'review') navigator.vibrate?.(35);
  }, [state.lossSeq, state.phase]);

  // Any open sheet pauses the game; closing resumes and returns focus to the answer field in the same tap.
  const openSheet = (kind: Exclude<SheetKind, null>) => {
    if (inGame) dispatch({ type: 'pause', reason: 'menu', now: Date.now() });
    setSheet(kind);
  };

  const closeSheet = useCallback(() => {
    if (!sheet) return;
    flushSync(() => setSheet(null));
    dispatch({ type: 'resume', reason: 'menu', now: Date.now() });
    if (inGame) focusInput();
  }, [sheet, inGame]);

  const quit = () => {
    flushSync(() => setSheet(null));
    dispatch({ type: 'resume', reason: 'menu', now: Date.now() });
    dispatch({ type: 'quit' });
  };

  const sheetFooter = inGame ? (
    <>
      <p className="sheet__paused">Igra je pauzirana, sat stoji.</p>
      <div className="sheet__buttons">
        {sheet !== 'menu' && (
          <button type="button" className="btn btn--secondary" onClick={() => setSheet('menu')}>Nazad</button>
        )}
        <button type="button" className="btn btn--primary" onClick={closeSheet}>Nastavi igru</button>
      </div>
    </>
  ) : (
    <button type="button" className="btn btn--primary btn--block" onClick={closeSheet}>Razumijem</button>
  );

  const onReport = () => {
    const r = state.review;
    if (!r || !r.answer) return;
    const persisted = saveReport({ question: r.question.text, answer: r.answer, at: new Date().toISOString() });
    setReport({ at: r.at, status: persisted ? 'saved' : 'session' });
  };

  // Screen-reader announcement for feedback and reviews (the timer itself is never announced).
  const announcement = useMemo(() => {
    if (state.phase === 'review' && state.review) {
      const r = state.review;
      const tips = r.suggestions.length ? ` Moglo je: ${r.suggestions.join(', ')}.` : '';
      return { key: `r${r.at}`, text: `${r.title}. ${r.detail}${tips} Ostalo života: ${state.lives}.` };
    }
    if (state.phase === 'playing' && state.feedback) {
      return { key: `f${state.feedback.seq}`, text: `${state.feedback.text}. ${state.question?.text ?? ''}` };
    }
    if (state.phase === 'over') return { key: 'over', text: `Kraj igre. Niz: ${state.streak}.` };
    return { key: 'none', text: '' };
  }, [state.phase, state.review, state.feedback, state.question, state.lives, state.streak]);

  return (
    <div className="shell">
      <div className="app">
        {state.phase === 'idle' && <StartScreen best={state.best} onPlay={start} onRules={() => openSheet('rules')} />}
        {inGame && (
          <GameScreen
            state={state}
            remainingMs={remaining}
            inputRef={inputRef}
            reportStatus={state.review && report.at === state.review.at ? report.status : 'idle'}
            onSubmit={(text) => dispatch({ type: 'submit', text, now: Date.now(), round: state.round })}
            onSkip={() => dispatch({ type: 'skip', now: Date.now(), round: state.round })}
            onContinue={() => dispatch({ type: 'continue', now: Date.now() })}
            onReport={onReport}
            onOpenMenu={() => openSheet('menu')}
          />
        )}
        {state.phase === 'over' && (
          <ResultScreen state={state} storageOk={storageOk} onReplay={start} onHome={() => dispatch({ type: 'quit' })} />
        )}

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          <span key={announcement.key}>{announcement.text}</span>
        </p>
      </div>

      <Sheet open={sheet !== null} title={SHEET_TITLE[sheet ?? 'rules']} onClose={closeSheet} footer={sheetFooter}>
        {sheet === 'menu' && (
          <nav className="menu" aria-label="Meni igre">
            <button type="button" className="menu__row" onClick={() => setSheet('answers')}>
              <ListChecks size={20} strokeWidth={2.2} aria-hidden />
              <span>Tvoji odgovori</span>
              <span className="menu__meta">{state.log.length}</span>
              <ChevronRight size={18} aria-hidden />
            </button>
            <button type="button" className="menu__row" onClick={() => setSheet('rules')}>
              <HelpCircle size={20} strokeWidth={2.2} aria-hidden />
              <span>Pravila igre</span>
              <ChevronRight size={18} aria-hidden />
            </button>
            <button type="button" className="menu__row menu__row--danger" onClick={quit}>
              <LogOut size={20} strokeWidth={2.2} aria-hidden />
              <span>Završi igru</span>
            </button>
          </nav>
        )}
        {sheet === 'rules' && <RulesContent />}
        {sheet === 'answers' &&
          (state.log.length === 0 ? (
            <p className="answers-empty">Još nema tačnih odgovora. Prvi je najteži!</p>
          ) : (
            <ol className="answers-list">
              {[...state.log].reverse().map((a, i) => (
                <li key={state.log.length - i}>
                  <span className="answers-list__n">{state.log.length - i}</span>
                  <span className="answers-list__name">{a.name}</span>
                  <span className="answers-list__q">{a.question}</span>
                </li>
              ))}
            </ol>
          ))}
      </Sheet>
    </div>
  );
}
