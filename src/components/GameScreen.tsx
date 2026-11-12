import {
  ArrowRight, Bird, Check, Flag, Flame, Globe2, Heart, HeartCrack, HelpCircle, Info, Landmark, ListChecks,
  MapPin, PawPrint, SkipForward, Sparkles, Timer, TriangleAlert, type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type FormEvent, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import { CATEGORIES, type CategoryId } from '../data';
import { START_LIVES, type GameState } from '../game/engine';
import { remainingAnswers } from '../game/questions';

const CATEGORY_ICON: Record<CategoryId, LucideIcon> = {
  country: Globe2,
  capital: Landmark,
  'mne-city': MapPin,
  mammal: PawPrint,
  bird: Bird,
};

/** Keeps focus (and so the iOS keyboard) in the answer field when tapping in-game buttons. */
const holdFocus = {
  onPointerDown: (e: PointerEvent) => e.preventDefault(),
  onMouseDown: (e: MouseEvent) => e.preventDefault(),
};

/** Letters players easily confuse when typing without diacritics. */
const SIBLINGS: Record<string, string> = {
  S: 'Š', Š: 'S', C: 'Č/Ć', Č: 'C/Ć', Ć: 'C/Č', Z: 'Ž', Ž: 'Z', D: 'Dž/Đ', Đ: 'D', Dž: 'D', N: 'Nj', Nj: 'N', L: 'Lj', Lj: 'L',
};

export type ReportStatus = 'idle' | 'saved' | 'session';

interface Props {
  state: GameState;
  remainingMs: number;
  inputRef: RefObject<HTMLInputElement>;
  reportStatus: ReportStatus;
  onSubmit: (text: string) => void;
  onSkip: () => void;
  onContinue: () => void;
  onReport: () => void;
  onOpenAnswers: () => void;
  onOpenRules: () => void;
}

export function GameScreen(props: Props) {
  const { state, remainingMs, inputRef, reportStatus } = props;
  const [value, setValue] = useState('');
  const reviewing = state.phase === 'review' && state.review;
  const question = reviewing ? state.review!.question : state.question;

  const seconds = Math.ceil(remainingMs / 1000);
  const ratio = state.limitMs ? remainingMs / state.limitMs : 0;
  const urgency = reviewing ? 'idle' : seconds <= 3 ? 'critical' : seconds <= 6 ? 'warning' : 'calm';
  const paused = state.pauses.length > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    inputRef.current?.focus({ preventScroll: true });
    if (reviewing) {
      props.onContinue();
      return;
    }
    props.onSubmit(value);
    setValue('');
  };

  const left = useMemo(
    () => (question ? remainingAnswers(question, new Set(state.used), false).length : 0),
    [question, state.used],
  );

  const Icon = question ? CATEGORY_ICON[question.category] : Globe2;
  const fb = state.feedback;

  return (
    <section className={`screen game${reviewing ? ' is-review' : ''}`} aria-label="Igra">
      {state.lossSeq > 0 && reviewing && <div key={state.lossSeq} className="loss-flash" aria-hidden />}

      <header className="hud">
        <div
          key={fb?.tone === 'milestone' ? `m${fb.seq}` : 'streak'}
          className={`streak${fb?.tone === 'milestone' ? ' is-milestone' : ''}`}
          aria-label={`Niz: ${state.streak}`}
        >
          <Flame className="streak__icon" size={16} strokeWidth={2.4} aria-hidden />
          <span key={state.streak} className="streak__num">{state.streak}</span>
          <span className="streak__label" aria-hidden>niz</span>
        </div>

        <div className="lives" aria-label={`Životi: ${state.lives} od ${START_LIVES}`} role="img">
          {Array.from({ length: START_LIVES }, (_, i) => {
            const alive = i < state.lives;
            const justLost = i === state.lives && reviewing;
            return (
              <span key={justLost ? `l${state.lossSeq}` : i} className={`life${alive ? '' : ' is-lost'}${justLost ? ' is-losing' : ''}`}>
                <Heart size={20} strokeWidth={2.2} fill={alive ? 'currentColor' : 'none'} />
              </span>
            );
          })}
        </div>

        <div className="hud__actions">
          <button type="button" className="icon-btn" aria-label={`Tvoji odgovori (${state.log.length})`} onClick={props.onOpenAnswers}>
            <ListChecks size={21} strokeWidth={2} />
            {state.log.length > 0 && <span className="badge" aria-hidden>{state.log.length}</span>}
          </button>
          <button type="button" className="icon-btn" aria-label="Pravila" onClick={props.onOpenRules}>
            <HelpCircle size={21} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className="meta">
        <span className="meta__cat">
          <Icon size={15} strokeWidth={2.2} aria-hidden />
          {question ? CATEGORIES[question.category].label : ''}
        </span>
        <span className={`timer timer--${urgency}`} role="timer" aria-label={reviewing ? 'Sat je zaustavljen' : `${seconds} sekundi`}>
          <Timer size={15} strokeWidth={2.4} aria-hidden />
          <span className="timer__num">{reviewing ? '—' : seconds}</span>
          {!reviewing && <span className="timer__unit">s</span>}
        </span>
      </div>
      <div className={`timerbar timerbar--${urgency}`} aria-hidden>
        <span style={{ transform: `scaleX(${reviewing ? 0 : Math.max(0, Math.min(1, ratio))})` }} />
      </div>

      <div className="stage">
        {reviewing ? (
          <Review state={state} reportStatus={reportStatus} onReport={props.onReport} />
        ) : (
          question && (
            <div className="stage__q" key={state.round}>
              <h1 id="question" className="question">
                {question.text}
              </h1>
              <p className="question-hint">
                {question.letter && SIBLINGS[question.letter]
                  ? <>Pazi: <strong>{question.letter}</strong> i <strong>{SIBLINGS[question.letter]}</strong> su različita slova.</>
                  : <>Slobodnih odgovora u bazi: <strong>{left}</strong></>}
              </p>
            </div>
          )
        )}
      </div>

      <div className="feedback-row">
        <p className={`feedback${fb ? ` feedback--${fb.tone}` : ''}`} key={fb?.seq ?? 0} aria-hidden>
          {!reviewing && fb && <FeedbackIcon tone={fb.tone} />}
          {!reviewing && fb ? fb.text : ''}
        </p>
        <button
          type="button"
          className="skip-btn"
          {...holdFocus}
          onClick={props.onSkip}
          disabled={!!reviewing || paused}
          aria-hidden={!!reviewing}
          tabIndex={reviewing ? -1 : 0}
        >
          <SkipForward size={16} strokeWidth={2.2} aria-hidden />
          Preskoči
        </button>
      </div>

      <form className="answer" onSubmit={submit} autoComplete="off">
        {fb?.tone === 'success' || fb?.tone === 'milestone' ? <span key={fb.seq} className="answer__flash" aria-hidden /> : null}
        <input
          ref={inputRef}
          className="answer__input"
          type="text"
          name="dokznas-odgovor"
          inputMode="text"
          enterKeyHint="go"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={60}
          aria-label="Tvoj odgovor"
          aria-describedby={reviewing ? undefined : 'question'}
          placeholder={reviewing ? (state.review!.final ? 'Vidi rezultat' : 'Idemo dalje') : 'Upiši odgovor…'}
          value={reviewing ? '' : value}
          onChange={(e) => !reviewing && setValue(e.target.value)}
        />
        <button
          type="submit"
          className={`answer__submit${reviewing ? ' is-continue' : ''}`}
          {...holdFocus}
          aria-label={reviewing ? (state.review!.final ? 'Rezultat' : 'Dalje') : 'Potvrdi odgovor'}
        >
          {reviewing ? (
            <>
              <span>{state.review!.final ? 'Rezultat' : 'Dalje'}</span>
              <ArrowRight size={20} strokeWidth={2.6} aria-hidden />
            </>
          ) : (
            <ArrowRight size={22} strokeWidth={2.6} aria-hidden />
          )}
        </button>
      </form>
    </section>
  );
}

function FeedbackIcon({ tone }: { tone: string }) {
  const p = { size: 16, strokeWidth: 2.6, 'aria-hidden': true } as const;
  if (tone === 'success') return <Check {...p} />;
  if (tone === 'milestone') return <Sparkles {...p} />;
  if (tone === 'warn') return <TriangleAlert {...p} />;
  return <Info {...p} />;
}

function Review({ state, reportStatus, onReport }: { state: GameState; reportStatus: ReportStatus; onReport: () => void }) {
  const r = state.review!;
  return (
    <div className="review" key={r.at}>
      <p className="review__q">{r.question.text}</p>
      <h2 className="review__title">
        <HeartCrack size={20} strokeWidth={2.4} aria-hidden />
        {r.title}
        <span className="review__cost">−1 život</span>
      </h2>
      <p className="review__detail">
        {r.answer && <strong className="review__answer">„{r.answer}“ </strong>}
        {r.detail}
      </p>
      {r.suggestions.length > 0 && (
        <div className="review__tips">
          <p className="review__label">Moglo je, na primjer:</p>
          <ul className="chips">
            {r.suggestions.map((s) => (
              <li key={s} className="chip">{s}</li>
            ))}
          </ul>
        </div>
      )}
      {r.reason === 'unknown' &&
        (reportStatus === 'idle' ? (
          <button type="button" className="link-btn" {...holdFocus} onClick={onReport}>
            <Flag size={15} strokeWidth={2.2} aria-hidden />
            Prijavi odgovor
            <span className="link-btn__note">čuva se na ovom uređaju</span>
          </button>
        ) : (
          <p className="review__reported" role="status">
            <Check size={15} strokeWidth={2.6} aria-hidden />
            {reportStatus === 'saved'
              ? 'Prijava je sačuvana na ovom uređaju za kasniju provjeru.'
              : 'Prijava je sačuvana samo dok je stranica otvorena.'}
          </p>
        ))}
    </div>
  );
}
