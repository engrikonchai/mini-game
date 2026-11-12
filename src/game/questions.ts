import { CATEGORIES, ENTRIES, type CategoryId, type Entry } from '../data';
import { editDistance, firstLetter, normalize } from './normalize';
import type { Rng } from './rng';

export interface Template {
  key: string;
  category: CategoryId;
  weight: number;
  /** Question text; letter templates receive the letter. */
  text: (letter?: string) => string;
  /** Attribute filter. */
  test: (e: Entry) => boolean;
  /** Short reason shown when a recognised answer of the right category does not fit. */
  mismatch?: (e: Entry) => string;
  letter?: boolean;
}

const has = (tag: string) => (e: Entry) => e.tags.includes(tag);
const any = () => true;

export const TEMPLATES: Template[] = [
  { key: 'country-any', category: 'country', weight: 1, text: () => 'Navedi državu u Evropi.', test: any },
  {
    key: 'country-coast', category: 'country', weight: 1, text: () => 'Navedi državu u Evropi koja ima more.', test: has('coast'),
    mismatch: (e) => `${e.name} nema izlaz na more.`,
  },
  {
    key: 'country-landlocked', category: 'country', weight: 0.8, text: () => 'Navedi državu u Evropi bez izlaza na more.', test: has('landlocked'),
    mismatch: (e) => (e.tags.includes('coast') ? `${e.name} ima izlaz na more.` : `${e.name} se ne računa u ovom pitanju.`),
  },
  {
    key: 'country-eu', category: 'country', weight: 0.8, text: () => 'Navedi državu članicu Evropske unije.', test: has('eu'),
    mismatch: (e) => `${e.name} nije članica EU.`,
  },
  {
    key: 'country-exyu', category: 'country', weight: 0.35, text: () => 'Navedi državu nastalu raspadom Jugoslavije.', test: has('exyu'),
    mismatch: (e) => `${e.name} nije bila republika SFRJ.`,
  },
  { key: 'country-letter', category: 'country', weight: 1.2, letter: true, text: (l) => `Navedi državu u Evropi na slovo ${l}.`, test: any },

  { key: 'capital-any', category: 'capital', weight: 1, text: () => 'Navedi glavni grad u Evropi.', test: any },
  {
    key: 'capital-eu', category: 'capital', weight: 0.6, text: () => 'Navedi glavni grad neke članice EU.', test: has('eu'),
    mismatch: (e) => `${e.name} nije glavni grad članice EU.`,
  },
  {
    key: 'capital-exyu', category: 'capital', weight: 0.3, text: () => 'Navedi glavni grad bivše jugoslovenske republike.', test: has('exyu'),
    mismatch: (e) => `${e.name} nije glavni grad bivše republike SFRJ.`,
  },
  { key: 'capital-letter', category: 'capital', weight: 0.8, letter: true, text: (l) => `Navedi glavni grad u Evropi na slovo ${l}.`, test: any },

  { key: 'mne-any', category: 'mne-city', weight: 1, text: () => 'Navedi grad u Crnoj Gori.', test: any },
  {
    key: 'mne-coast', category: 'mne-city', weight: 0.8, text: () => 'Navedi grad na crnogorskom primorju.', test: has('coast'),
    mismatch: (e) => `${e.name} nije na primorju.`,
  },
  {
    key: 'mne-north', category: 'mne-city', weight: 0.8, text: () => 'Navedi grad na sjeveru Crne Gore.', test: has('north'),
    mismatch: (e) => `${e.name} nije na sjeveru.`,
  },

  { key: 'mammal-any', category: 'mammal', weight: 1, text: () => 'Navedi jednog sisara.', test: any },
  {
    key: 'mammal-domestic', category: 'mammal', weight: 0.7, text: () => 'Navedi domaću životinju koja je sisar.', test: has('domestic'),
    mismatch: (e) => `${cap(e.name)} nije domaća životinja.`,
  },
  {
    key: 'mammal-balkan', category: 'mammal', weight: 0.8, text: () => 'Navedi divljeg kopnenog sisara sa Balkana.', test: has('balkan'),
    mismatch: (e) => `${cap(e.name)} nije divlji kopneni sisar Balkana.`,
  },
  {
    key: 'mammal-sea', category: 'mammal', weight: 0.6, text: () => 'Navedi sisara koji živi u moru.', test: has('sea'),
    mismatch: (e) => `${cap(e.name)} ne živi u moru.`,
  },
  { key: 'mammal-letter', category: 'mammal', weight: 1, letter: true, text: (l) => `Navedi sisara na slovo ${l}.`, test: any },

  { key: 'bird-any', category: 'bird', weight: 1, text: () => 'Navedi jednu vrstu ptice.', test: any },
  {
    key: 'bird-raptor', category: 'bird', weight: 0.7, text: () => 'Navedi pticu grabljivicu.', test: has('raptor'),
    mismatch: (e) => `${cap(e.name)} nije grabljivica.`,
  },
  {
    key: 'bird-water', category: 'bird', weight: 0.7, text: () => 'Navedi pticu koja živi na vodi ili uz vodu.', test: has('water'),
    mismatch: (e) => `${cap(e.name)} nije vodena ptica.`,
  },
  {
    key: 'bird-poultry', category: 'bird', weight: 0.4, text: () => 'Navedi domaću pticu (živinu).', test: has('poultry'),
    mismatch: (e) => `${cap(e.name)} nije živina.`,
  },
  { key: 'bird-letter', category: 'bird', weight: 0.8, letter: true, text: (l) => `Navedi pticu na slovo ${l}.`, test: any },
];

const TEMPLATE_BY_KEY = new Map(TEMPLATES.map((t) => [t.key, t]));

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface Question {
  /** Template key + letter. Two questions with the same id ask the same thing. */
  id: string;
  templateKey: string;
  category: CategoryId;
  text: string;
  letter?: string;
}

export function getTemplate(key: string): Template {
  const t = TEMPLATE_BY_KEY.get(key);
  if (!t) throw new Error(`Unknown template ${key}`);
  return t;
}

export function acceptedNames(e: Entry): string[] {
  return [e.name, ...e.aliases];
}

function namesForLetter(e: Entry, letter: string): string[] {
  return acceptedNames(e).filter((n) => firstLetter(n) === letter);
}

/** Does entry `e` answer question `q` (by any accepted name)? */
export function isEligible(e: Entry, q: Question): boolean {
  if (e.category !== q.category) return false;
  if (!getTemplate(q.templateKey).test(e)) return false;
  return !q.letter || namesForLetter(e, q.letter).length > 0;
}

/** Name to show when suggesting `e` for `q` (for letter questions, the name that starts with the letter). */
export function displayNameFor(e: Entry, q: Question): string {
  const name = q.letter ? namesForLetter(e, q.letter)[0] ?? e.name : e.name;
  return q.category === 'mammal' || q.category === 'bird' ? cap(name) : name;
}

export function remainingAnswers(q: Question, used: ReadonlySet<string>, hintOnly = true): Entry[] {
  return ENTRIES.filter((e) => (!hintOnly || e.hint) && !used.has(e.id) && isEligible(e, q));
}

export function suggestions(q: Question, used: ReadonlySet<string>, rng: Rng, count = 3): string[] {
  const pool = remainingAnswers(q, used);
  return rng.shuffle(pool).slice(0, count).map((e) => displayNameFor(e, q));
}

// ---------------------------------------------------------------------------
// Question generation

const LETTERS = ['A', 'B', 'C', 'Č', 'Ć', 'D', 'Dž', 'Đ', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'Lj', 'M', 'N', 'Nj', 'O', 'P', 'R', 'S', 'Š', 'T', 'U', 'V', 'Z', 'Ž'];

interface Candidate {
  question: Question;
  remaining: number;
  weight: number;
}

function buildCandidates(used: ReadonlySet<string>): Candidate[] {
  const out: Candidate[] = [];
  for (const t of TEMPLATES) {
    if (t.letter) {
      const perLetter: Candidate[] = [];
      for (const letter of LETTERS) {
        const q: Question = { id: `${t.key}:${letter}`, templateKey: t.key, category: t.category, text: t.text(letter), letter };
        const remaining = remainingAnswers(q, used).length;
        if (remaining > 0) perLetter.push({ question: q, remaining, weight: 0 });
      }
      // Split the template's weight across its letters so letter questions don't dominate.
      perLetter.forEach((c) => (c.weight = t.weight / Math.max(1, Math.min(perLetter.length, 6))));
      out.push(...perLetter);
    } else {
      const q: Question = { id: t.key, templateKey: t.key, category: t.category, text: t.text() };
      const remaining = remainingAnswers(q, used).length;
      if (remaining > 0) out.push({ question: q, remaining, weight: t.weight });
    }
  }
  return out;
}

/** Minimum number of unused suggestible answers we want for a question at this streak. */
export function minRemainingFor(streak: number): number {
  if (streak < 3) return 12;
  if (streak < 5) return 6;
  if (streak < 15) return 4;
  if (streak < 30) return 2;
  return 1;
}

/**
 * Picks the next question. Guarantees at least one unused accepted answer; returns null only when
 * every template is exhausted. `recent` holds previous question template keys, newest last.
 */
export function generateQuestion(
  rng: Rng,
  used: ReadonlySet<string>,
  recent: readonly string[],
  streak: number,
): Question | null {
  const all = buildCandidates(used);
  if (all.length === 0) return null;

  const last = recent[recent.length - 1];
  const lastCategory = last ? getTemplate(last).category : undefined;
  const recentKeys = new Set(recent.slice(-4));
  const min = minRemainingFor(streak);

  const tiers: ((c: Candidate) => boolean)[] = [
    (c) => c.remaining >= min && !recentKeys.has(c.question.templateKey) && c.question.category !== lastCategory,
    (c) => c.remaining >= min && c.question.templateKey !== last,
    (c) => c.remaining >= 1 && c.question.templateKey !== last,
    () => true,
  ];

  for (const tier of tiers) {
    const pool = all.filter(tier);
    if (pool.length) return rng.weighted(pool, (c) => c.weight).question;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Answer checking

export type Verdict =
  | { kind: 'empty' }
  | { kind: 'correct'; entry: Entry; shown: string }
  | { kind: 'duplicate'; entry: Entry }
  | { kind: 'wrong'; entry: Entry; reason: string }
  | { kind: 'unknown' };

interface IndexItem {
  entry: Entry;
  name: string;
  norm: string;
}

const INDEX: IndexItem[] = ENTRIES.flatMap((entry) =>
  acceptedNames(entry).map((name) => ({ entry, name, norm: normalize(name) })),
);

/** Finds the best matching entry/name. Exact matches win; a single-typo match is accepted only if unique. */
function lookup(norm: string, items: IndexItem[]): IndexItem | null {
  const exact = items.find((i) => i.norm === norm);
  if (exact) return exact;
  if (norm.length < 5) return null;
  const close = items.filter((i) => i.norm.length >= 5 && editDistance(norm, i.norm) <= 1);
  const ids = new Set(close.map((c) => c.entry.id));
  return ids.size === 1 ? close[0] : null;
}

export function checkAnswer(input: string, q: Question, used: ReadonlySet<string>): Verdict {
  const norm = normalize(input);
  if (!norm) return { kind: 'empty' };

  const inCategory = INDEX.filter((i) => i.entry.category === q.category);
  const hit = lookup(norm, inCategory);

  if (hit) {
    const t = getTemplate(q.templateKey);
    const e = hit.entry;
    if (!t.test(e)) return { kind: 'wrong', entry: e, reason: t.mismatch?.(e) ?? 'Ne odgovara pitanju.' };
    if (q.letter) {
      const first = firstLetter(hit.name);
      if (first !== q.letter) {
        const shown = q.category === 'mammal' || q.category === 'bird' ? cap(hit.name) : hit.name;
        return { kind: 'wrong', entry: e, reason: `${shown} počinje slovom ${first}, ne ${q.letter}.` };
      }
    }
    if (used.has(e.id)) return { kind: 'duplicate', entry: e };
    const shown = q.category === 'mammal' || q.category === 'bird' ? cap(e.name) : e.name;
    return { kind: 'correct', entry: e, shown };
  }

  const other = lookup(norm, INDEX);
  if (other) {
    const shown = other.entry.category === 'mammal' || other.entry.category === 'bird' ? cap(other.name) : other.name;
    return { kind: 'wrong', entry: other.entry, reason: `${shown} nije ${CATEGORIES[q.category].noun}.` };
  }
  return { kind: 'unknown' };
}
