import { checkAnswer, generateQuestion, suggestions, type Question } from './questions';
import { createRng } from './rng';

export const START_LIVES = 3;
export const MILESTONES = [5, 10, 20, 30, 50, 75, 100];

/** 20 s at the start, one second less every two correct answers, never below 12 s. */
export function timeLimitMs(streak: number): number {
  return Math.max(12, 20 - Math.floor(streak / 2)) * 1000;
}

export type Phase = 'idle' | 'playing' | 'review' | 'over';
export type PauseReason = 'hidden' | 'menu';
export type LossReason = 'wrong' | 'unknown' | 'skip' | 'timeout';

export interface Feedback {
  /** Increments on every new message so the UI can re-trigger animation/announcements. */
  seq: number;
  tone: 'success' | 'milestone' | 'info' | 'warn';
  text: string;
}

export interface Review {
  reason: LossReason;
  title: string;
  detail: string;
  answer?: string;
  question: Question;
  suggestions: string[];
  /** Timestamp the review appeared, used to ignore accidental instant continues. */
  at: number;
  final: boolean;
}

export interface AnswerLog {
  name: string;
  question: string;
}

export interface GameState {
  phase: Phase;
  gameId: number;
  /** Increments for each question; actions carry it so stale timer/submit events are ignored. */
  round: number;
  seed: number;
  question: Question | null;
  streak: number;
  lives: number;
  used: string[];
  log: AnswerLog[];
  recent: string[];
  limitMs: number;
  /** Absolute deadline while running, null while paused or not playing. */
  deadline: number | null;
  /** Remaining time while paused. */
  remainingMs: number | null;
  pauses: PauseReason[];
  feedback: Feedback | null;
  review: Review | null;
  /** Increments on each lost life (for the heart animation). */
  lossSeq: number;
  best: number;
  newRecord: boolean;
  exhausted: boolean;
}

export type Action =
  | { type: 'start'; now: number; seed: number; best: number }
  | { type: 'submit'; text: string; now: number; round: number }
  | { type: 'skip'; now: number; round: number }
  | { type: 'timeout'; now: number; round: number }
  | { type: 'continue'; now: number }
  | { type: 'pause'; reason: PauseReason; now: number }
  | { type: 'resume'; reason: PauseReason; now: number }
  | { type: 'quit' };

/** Ignore "continue" for this long after a review appears (guards against a double-tapped Enter). */
export const REVIEW_GUARD_MS = 450;

export function initialState(best = 0): GameState {
  return {
    phase: 'idle', gameId: 0, round: 0, seed: 1, question: null, streak: 0, lives: START_LIVES, used: [], log: [],
    recent: [], limitMs: timeLimitMs(0), deadline: null, remainingMs: null, pauses: [], feedback: null, review: null,
    lossSeq: 0, best, newRecord: false, exhausted: false,
  };
}

export function remainingMs(s: GameState, now: number): number {
  if (s.phase !== 'playing') return s.limitMs;
  if (s.deadline !== null) return Math.max(0, s.deadline - now);
  return s.remainingMs ?? s.limitMs;
}

function feedback(s: GameState, tone: Feedback['tone'], text: string): Feedback {
  return { seq: (s.feedback?.seq ?? 0) + 1, tone, text };
}

/** Moves to the next question, or ends the game if the dataset is exhausted. */
function advance(s: GameState, now: number): GameState {
  const rng = createRng(s.seed);
  const used = new Set(s.used);
  const q = generateQuestion(rng, used, s.recent, s.streak);
  const seed = rng.state();
  if (!q) return finish({ ...s, seed, exhausted: true });
  const limitMs = timeLimitMs(s.streak);
  const paused = s.pauses.length > 0;
  return {
    ...s,
    seed,
    phase: 'playing',
    round: s.round + 1,
    question: q,
    recent: [...s.recent, q.templateKey].slice(-8),
    limitMs,
    deadline: paused ? null : now + limitMs,
    remainingMs: paused ? limitMs : null,
    review: null,
  };
}

function finish(s: GameState): GameState {
  const newRecord = s.streak > s.best;
  return { ...s, phase: 'over', deadline: null, remainingMs: null, review: null, newRecord, best: Math.max(s.best, s.streak) };
}

function loseLife(s: GameState, now: number, reason: LossReason, detail: string, answer?: string): GameState {
  const q = s.question!;
  const rng = createRng(s.seed);
  const tips = suggestions(q, new Set(s.used), rng, 3);
  const lives = s.lives - 1;
  const titles: Record<LossReason, string> = {
    wrong: 'Netačno',
    unknown: 'Nije prepoznato',
    skip: 'Preskočeno',
    timeout: 'Isteklo vrijeme',
  };
  return {
    ...s,
    seed: rng.state(),
    phase: 'review',
    lives,
    deadline: null,
    remainingMs: null,
    feedback: null,
    lossSeq: s.lossSeq + 1,
    review: { reason, title: titles[reason], detail, answer, question: q, suggestions: tips, at: now, final: lives <= 0 },
  };
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'start': {
      const fresh: GameState = {
        ...initialState(Math.max(a.best, s.best)),
        gameId: s.gameId + 1,
        round: s.round, // keep increasing across games so stale events never match
        seed: a.seed,
        lossSeq: s.lossSeq,
        // Keep open sheets/hidden state: a game started while paused starts paused.
        pauses: s.pauses.filter((p) => p === 'hidden'),
      };
      return advance(fresh, a.now);
    }

    case 'submit': {
      if (s.phase !== 'playing' || a.round !== s.round || !s.question) return s;
      if (s.pauses.length > 0) return s;
      // Deadline is authoritative: a submit that arrives after it counts as a timeout.
      if (s.deadline !== null && a.now >= s.deadline) return reducer(s, { type: 'timeout', now: a.now, round: a.round });

      const used = new Set(s.used);
      const v = checkAnswer(a.text, s.question, used);
      switch (v.kind) {
        case 'empty':
          return { ...s, feedback: feedback(s, 'info', 'Upiši odgovor, pa potvrdi.') };
        case 'duplicate':
          return { ...s, feedback: feedback(s, 'warn', 'Već iskorišćeno. Probaj drugi.') };
        case 'wrong':
          return loseLife(s, a.now, 'wrong', v.reason);
        case 'unknown':
          return loseLife(s, a.now, 'unknown', 'Ovaj odgovor nije prepoznat u demo bazi.', a.text.trim());
        case 'correct': {
          const streak = s.streak + 1;
          const milestone = MILESTONES.includes(streak);
          const next: GameState = {
            ...s,
            streak,
            used: [...s.used, v.entry.id],
            log: [...s.log, { name: v.shown, question: s.question.text }],
            feedback: milestone
              ? feedback(s, 'milestone', `Niz od ${streak}! Samo tako.`)
              : feedback(s, 'success', `Tačno — ${v.shown}`),
          };
          return advance(next, a.now);
        }
      }
      return s;
    }

    case 'skip': {
      if (s.phase !== 'playing' || a.round !== s.round || s.pauses.length > 0) return s;
      if (s.deadline !== null && a.now >= s.deadline) return reducer(s, { type: 'timeout', now: a.now, round: a.round });
      return loseLife(s, a.now, 'skip', 'Preskakanje košta jedan život.');
    }

    case 'timeout': {
      if (s.phase !== 'playing' || a.round !== s.round || s.deadline === null) return s;
      if (a.now < s.deadline) return s;
      return loseLife(s, a.now, 'timeout', 'Vrijeme je isteklo.');
    }

    case 'continue': {
      if (s.phase !== 'review' || !s.review) return s;
      if (a.now - s.review.at < REVIEW_GUARD_MS) return s;
      if (s.lives <= 0) return finish(s);
      return advance({ ...s, feedback: null }, a.now);
    }

    case 'pause': {
      if (s.pauses.includes(a.reason)) return s;
      const pauses = [...s.pauses, a.reason];
      if (s.phase === 'playing' && s.deadline !== null) {
        return { ...s, pauses, deadline: null, remainingMs: Math.max(0, s.deadline - a.now) };
      }
      return { ...s, pauses };
    }

    case 'resume': {
      if (!s.pauses.includes(a.reason)) return s;
      const pauses = s.pauses.filter((p) => p !== a.reason);
      if (pauses.length === 0 && s.phase === 'playing' && s.deadline === null) {
        // Never resume into an instant timeout: keep at least a moment to re-orient.
        const left = Math.max(s.remainingMs ?? s.limitMs, 1500);
        return { ...s, pauses, deadline: a.now + left, remainingMs: null };
      }
      return { ...s, pauses };
    }

    case 'quit':
      return { ...initialState(s.best), gameId: s.gameId, round: s.round + 1, lossSeq: s.lossSeq, pauses: s.pauses.filter((p) => p === 'hidden') };
  }
}
