import { describe, expect, it } from 'vitest';
import { CATEGORIES, ENTRIES } from '../../data';
import { reducer, initialState, timeLimitMs, REVIEW_GUARD_MS, type GameState } from '../engine';
import { firstLetter, normalize } from '../normalize';
import { acceptedNames, checkAnswer, generateQuestion, remainingAnswers, TEMPLATES, type Question } from '../questions';
import { createRng } from '../rng';

const q = (templateKey: string, letter?: string): Question => {
  const t = TEMPLATES.find((x) => x.key === templateKey)!;
  return { id: templateKey + (letter ?? ''), templateKey, category: t.category, text: t.text(letter), letter };
};

describe('dataset', () => {
  it('has at least 150 distinct canonical answers', () => {
    expect(new Set(ENTRIES.map((e) => e.id)).size).toBe(ENTRIES.length);
    expect(ENTRIES.length).toBeGreaterThanOrEqual(150);
  });

  it('has no ambiguous normalised names within a category', () => {
    for (const cat of Object.keys(CATEGORIES)) {
      const seen = new Map<string, string>();
      for (const e of ENTRIES.filter((x) => x.category === cat)) {
        for (const n of new Set(acceptedNames(e).map(normalize))) {
          expect(seen.get(n) ?? e.id, `${n} in ${cat}`).toBe(e.id);
          seen.set(n, e.id);
        }
      }
    }
  });

  it('every template has enough suggestible answers', () => {
    for (const t of TEMPLATES.filter((x) => !x.letter)) {
      expect(remainingAnswers(q(t.key), new Set()).length, t.key).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('normalisation', () => {
  it('ignores case, whitespace and diacritics', () => {
    expect(normalize('  ŠVEDSKA ')).toBe(normalize('svedska'));
    expect(normalize('Mađarska')).toBe(normalize('madjarska'));
    expect(normalize('Mađarska')).toBe(normalize('madarska'));
    expect(normalize('Herceg-Novi')).toBe(normalize('herceg novi'));
  });
  it('joins ijekavian and ekavian', () => {
    expect(normalize('medvjed')).toBe(normalize('medved'));
    expect(normalize('vjeverica')).toBe(normalize('veverica'));
    expect(normalize('Njemačka')).toBe(normalize('Nemacka'));
  });
  it('transliterates Cyrillic', () => {
    expect(normalize('Њемачка')).toBe(normalize('Njemačka'));
  });
  it('reads digraph first letters', () => {
    expect(firstLetter('Njemačka')).toBe('Nj');
    expect(firstLetter('Ljubljana')).toBe('Lj');
    expect(firstLetter('Švedska')).toBe('Š');
    expect(firstLetter('srbija')).toBe('S');
  });
});

describe('answer checking', () => {
  const none = new Set<string>();
  it('accepts aliases and regional variants', () => {
    expect(checkAnswer('Nizozemska', q('country-any'), none).kind).toBe('correct');
    expect(checkAnswer('holandija', q('country-any'), none).kind).toBe('correct');
    expect(checkAnswer('medved', q('mammal-any'), none).kind).toBe('correct');
    expect(checkAnswer('nemacka', q('country-coast'), none).kind).toBe('correct');
    expect(checkAnswer('crna gora', q('country-coast'), none).kind).toBe('correct');
  });
  it('treats aliases as the same canonical answer', () => {
    const used = new Set(['country:holandija']);
    expect(checkAnswer('Nizozemska', q('country-any'), used).kind).toBe('duplicate');
    const used2 = new Set(['mammal:medvjed']);
    expect(checkAnswer('MEDVED', q('mammal-any'), used2).kind).toBe('duplicate');
  });
  it('checks attributes', () => {
    const v = checkAnswer('Srbija', q('country-coast'), none);
    expect(v.kind).toBe('wrong');
    expect(checkAnswer('Austrija', q('country-landlocked'), none).kind).toBe('correct');
  });
  it('applies starting-letter rules to the typed name', () => {
    expect(checkAnswer('Holandija', q('country-letter', 'H'), none).kind).toBe('correct');
    expect(checkAnswer('Nizozemska', q('country-letter', 'H'), none).kind).toBe('wrong');
    expect(checkAnswer('Nizozemska', q('country-letter', 'N'), none).kind).toBe('correct');
    expect(checkAnswer('svedska', q('country-letter', 'S'), none).kind).toBe('wrong');
    expect(checkAnswer('srbija', q('country-letter', 'S'), none).kind).toBe('correct');
  });
  it('flags other categories and unknowns', () => {
    const v = checkAnswer('Pariz', q('country-any'), none);
    expect(v.kind).toBe('wrong');
    expect(checkAnswer('Narnija', q('country-any'), none).kind).toBe('unknown');
    expect(checkAnswer('   ', q('country-any'), none).kind).toBe('empty');
  });
  it('tolerates a single unique typo', () => {
    expect(checkAnswer('Itlaija', q('country-any'), none).kind).toBe('correct');
    expect(checkAnswer('Portugl', q('country-any'), none).kind).toBe('correct');
  });
});

describe('question generation', () => {
  it('always has an unused answer, even after heavy use', () => {
    const rng = createRng(42);
    const used = new Set<string>();
    const recent: string[] = [];
    let count = 0;
    for (;;) {
      const question = generateQuestion(rng, used, recent, count);
      if (!question) break;
      const left = remainingAnswers(question, used, false);
      expect(left.length).toBeGreaterThan(0);
      // Answer it with the first remaining entry.
      used.add(left[0].id);
      recent.push(question.templateKey);
      count++;
      expect(count).toBeLessThan(400);
    }
    expect(count).toBeGreaterThan(150);
  });

  it('varies templates', () => {
    const rng = createRng(7);
    const recent: string[] = [];
    for (let i = 0; i < 30; i++) {
      const question = generateQuestion(rng, new Set(), recent, 0)!;
      expect(question.templateKey).not.toBe(recent[recent.length - 1]);
      recent.push(question.templateKey);
    }
    expect(new Set(recent).size).toBeGreaterThan(8);
  });
});

describe('engine', () => {
  const start = (now = 1000): GameState => reducer(initialState(0), { type: 'start', now, seed: 123, best: 0 });
  const answerFor = (s: GameState) => {
    const e = remainingAnswers(s.question!, new Set(s.used))[0];
    return s.question!.letter ? acceptedNames(e).find((n) => firstLetter(n) === s.question!.letter)! : e.name;
  };

  it('starts with three lives, 20 s and a question', () => {
    const s = start();
    expect(s.phase).toBe('playing');
    expect(s.lives).toBe(3);
    expect(s.deadline).toBe(1000 + 20000);
  });

  it('shortens time with streak down to 12 s', () => {
    expect(timeLimitMs(0)).toBe(20000);
    expect(timeLimitMs(4)).toBe(18000);
    expect(timeLimitMs(50)).toBe(12000);
  });

  it('increments streak on correct answers and ignores stale rounds', () => {
    let s = start();
    const round = s.round;
    s = reducer(s, { type: 'submit', text: answerFor(s), now: 2000, round });
    expect(s.streak).toBe(1);
    const again = reducer(s, { type: 'submit', text: 'x', now: 2001, round });
    expect(again).toBe(s);
  });

  it('duplicate keeps timer running and costs nothing', () => {
    let s = start();
    const ans = answerFor(s);
    s = reducer(s, { type: 'submit', text: ans, now: 2000, round: s.round });
    // Force a question that the same answer also fits.
    s = { ...s, question: q(s.used[0].startsWith('country') ? 'country-any' : s.used[0].startsWith('capital') ? 'capital-any' : s.used[0].startsWith('mne') ? 'mne-any' : s.used[0].startsWith('mammal') ? 'mammal-any' : 'bird-any') };
    const before = s.deadline;
    s = reducer(s, { type: 'submit', text: ans, now: 2500, round: s.round });
    expect(s.feedback?.text).toBe('Već iskorišćeno. Probaj drugi.');
    expect(s.lives).toBe(3);
    expect(s.deadline).toBe(before);
  });

  it('timeout costs exactly one life even with racing events', () => {
    let s = start(0);
    const round = s.round;
    const late = s.deadline! + 5;
    s = reducer(s, { type: 'submit', text: answerFor(s), now: late, round });
    expect(s.phase).toBe('review');
    expect(s.review?.reason).toBe('timeout');
    expect(s.lives).toBe(2);
    s = reducer(s, { type: 'timeout', now: late + 10, round });
    s = reducer(s, { type: 'skip', now: late + 10, round });
    expect(s.lives).toBe(2);
  });

  it('pauses timer in review until continue, guards instant continue', () => {
    let s = start(0);
    s = reducer(s, { type: 'skip', now: 1000, round: s.round });
    expect(s.deadline).toBeNull();
    expect(s.review!.suggestions.length).toBeGreaterThan(0);
    expect(reducer(s, { type: 'continue', now: 1000 + 10 })).toBe(s);
    s = reducer(s, { type: 'continue', now: 1000 + REVIEW_GUARD_MS + 1 });
    expect(s.phase).toBe('playing');
    expect(s.deadline).toBe(1000 + REVIEW_GUARD_MS + 1 + 20000);
  });

  it('pause and resume preserve remaining time', () => {
    let s = start(0);
    s = reducer(s, { type: 'pause', reason: 'hidden', now: 5000 });
    expect(s.remainingMs).toBe(15000);
    s = reducer(s, { type: 'pause', reason: 'menu', now: 6000 });
    s = reducer(s, { type: 'resume', reason: 'hidden', now: 60000 });
    expect(s.deadline).toBeNull();
    s = reducer(s, { type: 'resume', reason: 'menu', now: 70000 });
    expect(s.deadline).toBe(85000);
    expect(reducer(s, { type: 'timeout', now: 80000, round: s.round })).toBe(s);
  });

  it('ends after the last life and records', () => {
    let s = reducer(initialState(1), { type: 'start', now: 0, seed: 9, best: 1 });
    let t = 0;
    for (let i = 0; i < 3; i++) s = reducer(s, { type: 'submit', text: answerFor(s), now: (t += 100), round: s.round });
    for (let i = 0; i < 3; i++) {
      s = reducer(s, { type: 'submit', text: 'zzzzzz', now: (t += 100), round: s.round });
      expect(s.phase).toBe('review');
      s = reducer(s, { type: 'continue', now: (t += 1000) });
    }
    expect(s.phase).toBe('over');
    expect(s.newRecord).toBe(true);
    expect(s.best).toBe(3);
    const again = reducer(s, { type: 'start', now: t, seed: 10, best: s.best });
    expect(again.used).toEqual([]);
    expect(again.lives).toBe(3);
    expect(again.streak).toBe(0);
  });
});

import { correctAnswers } from '../../plural';
describe('plural', () => {
  it('agrees with numbers', () => {
    expect(correctAnswers(1)).toBe('tačan odgovor');
    expect(correctAnswers(3)).toBe('tačna odgovora');
    expect(correctAnswers(12)).toBe('tačnih odgovora');
    expect(correctAnswers(21)).toBe('tačan odgovor');
    expect(correctAnswers(0)).toBe('tačnih odgovora');
  });
});
