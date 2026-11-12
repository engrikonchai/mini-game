import {
  ArrowRight, Bird, Check, Flag, Flame, Globe2, Heart, HeartCrack, Info, Landmark, MapPin, Menu, PawPrint,
  SkipForward, Sparkles, TriangleAlert, type LucideIcon,
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

/** Letters players easily confuse when typing without diacritics. */
const SIBLINGS: Record<string, string> = {
  S: 'Š', Š: 'S', C: 'Č/Ć', Č: 'C/Ć', Ć: 'C/Č', Z: 'Ž', Ž: 'Z', D: 'Dž/Đ', Đ: 'D', Dž: 'D', N: 'Nj', Nj: 'N', L: 'Lj', Lj: 'L',
};

/** Keeps focus (and so the phone keyboard) in the answer field when tapping in-game buttons. */
const holdFocus = {
  onPointerDown: (e: PointerEvent) => e.preventDefault(),
  onMouseDown: (e: MouseEvent) => e.preventDefault(),
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
  onOpenMenu: () => void;
}

export function GameScreen(props: Props) {
  const { state, remainingMs, inputRef, reportStatus } = props;
  const [value, setValue] = useState('');
  const review = state.phase === 'review' ? state.review : null;
  const question = review ? review.question : state.question;

  const seconds = Math.ceil(remainingMs / 1000);
  const ratio = state.limitMs ? remainingMs / state.limitMs : 0;
  const urgency = review ? 'idle' : seconds <= 3 ? 'critical' : seconds <= 6 ? 'warning' : 'calm';
  const paused = state.pauses.length > 0;

  const left = useMemo(
    () => (question ? remainingAnswers(question, new Set(state.used), false).length : 0),
    [question, state.used],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    inputRef.current?.focus({ preventScroll: true });
    if (review) {
      props.onContinue();
      return;
    }
    props.onSubmit(value);
    setValue('');
  };

  const Icon = question ? CATEGORY_ICON[question.category] : Globe2;
  const fb = review ? null : state.feedback;

  return (
    <section className={`screen game${review ? ' is-review' : ''}`} aria-label="Igra">
      {state.lossSeq > 0 && review && <div key={state.lossSeq} className="loss-flash" aria-hidden />}

      <header className="hud">
        <div
          key={fb?.tone === 'milestone' ? `m${fb.seq}` : 'streak'}
          className={`streak${fb?.tone === 'milestone' ? ' is-milestone' : ''}`}
          role="img"
          aria-label={`Niz: ${state.streak}`}
        >
          <Flame className="streak__icon" size={16} strokeWidth={2.4} aria-hidden />
          <span key={state.streak} className="streak__num">{state.streak}</span>
          <span className="streak__label">Niz</span>
        </div>

        <div className="lives" role="img" aria-label={`Životi: ${state.lives} od ${START_LIVES}`}>
          {Array.from({ length: START_LIVES }, (_, i) => {
            const alive = i < state.lives;
            const justLost = i === state.lives && !!review;
            return (
              <span key={justLost ? `l${state.lossSeq}` : i} className={`life${alive ? '' : ' is-lost'}${justLost ? ' is-losing' : ''}`}>
                <Heart size={18} strokeWidth={2.4} fill={alive ? 'currentColor' : 'none'} />
              </span>
            );
          })}
        </div>

        <span className={`timer timer--${urgency}`} role="timer" aria-label={review ? 'Sat je zaustavljen' : `${seconds} sekundi`}>
          <span className="timer__num">{review ? '–' : seconds}</span>
          {!review && <span className="timer__unit">s</span>}
        </span>

        <button type="button" className="icon-btn hud__menu" aria-label="Meni i pravila (pauza)" onClick={props.onOpenMenu}>
          <Menu size={21} strokeWidth={2.2} />
        </button>
      </header>
      <div className={`timerbar timerbar--${urgency}`} aria-hidden>
        <span style={{ transform: `scaleX(${review ? 0 : Math.max(0, Math.min(1, ratio))})` }} />
      </div>

      <div className="play">
        <article className={`card${review ? ' card--review' : ''}`} aria-labelledby={review ? undefined : 'question'}>
          <p className="card__cat">
            <Icon size={14} strokeWidth={2.4} aria-hidden />
            {question ? CATEGORIES[question.category].label : ''}
          </p>

          {review ? (
            <Review state={state} reportStatus={reportStatus} onReport={props.onReport} />
          ) : (
            question && (
              <div className="card__main" key={state.round}>
                <h1 id="question" className="question">{question.text}</h1>
                <p className="card__hint">
                  {question.letter && SIBLINGS[question.letter] ? (
                    <>Pazi: <strong>{question.letter}</strong> i <strong>{SIBLINGS[question.letter]}</strong> su različita slova.</>
                  ) : (
                    <>Tačnih odgovora u igri: <strong>{left}</strong></>
                  )}
                </p>
              </div>
            )
          )}
        </article>

        <div className="feedback-row">
          <p className={`feedback${fb ? ` feedback--${fb.tone}` : ''}`} key={fb?.seq ?? 0} aria-hidden>
            {fb && <FeedbackIcon tone={fb.tone} />}
            {fb ? fb.text : ''}
          </p>
          <button
            type="button"
            className="skip-btn"
            {...holdFocus}
            onClick={props.onSkip}
            disabled={!!review || paused}
            aria-hidden={!!review}
            tabIndex={review ? -1 : 0}
          >
            <SkipForward size={15} strokeWidth={2.4} aria-hidden />
            Preskoči
          </button>
        </div>

        <form className="answer" onSubmit={submit} autoComplete="off">
          {fb?.tone === 'success' || fb?.tone === 'milestone' ? <span key={fb.seq} className="answer__flash" aria-hidden /> : null}
          <input
            ref={inputRef}
            id="answer"
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
            aria-describedby={review ? undefined : 'question'}
            placeholder={review ? (review.final ? 'Vidi rezultat' : 'Idemo dalje') : 'Upiši odgovor'}
            value={review ? '' : value}
            onChange={(e) => !review && setValue(e.target.value)}
          />
          <button type="submit" className="answer__submit" {...holdFocus}>
            {review ? (
              <>
                {review.final ? 'Rezultat' : 'Dalje'}
                <ArrowRight size={18} strokeWidth={2.6} aria-hidden />
              </>
            ) : (
              'Potvrdi'
            )}
          </button>
        </form>
      </div>
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
    <div className="card__main review" key={r.at}>
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
