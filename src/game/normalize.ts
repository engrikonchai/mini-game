/**
 * Deterministic answer normalisation.
 *
 * Input and every accepted name go through the same function, so the comparison is symmetric:
 * - Cyrillic is transliterated to Latin.
 * - Case, surrounding whitespace, inner spaces, hyphens and punctuation are ignored.
 * - Diacritics are optional (č/ć→c, š→s, ž→z, đ/dj→d).
 * - Ijekavian and ekavian forms meet (medvjed/medved, vjeverica/veverica, Bjelorusija/Belorusija).
 */

const CYRILLIC: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k',
  л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u',
  ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
};

const SPECIAL: Record<string, string> = { ø: 'o', æ: 'ae', ß: 'ss', œ: 'oe', ł: 'l' };

export function transliterate(input: string): string {
  let out = '';
  for (const ch of input.toLowerCase()) out += CYRILLIC[ch] ?? ch;
  return out;
}

export function normalize(input: string): string {
  let s = transliterate(input.normalize('NFC')).trim();
  s = s.replace(/[øæßœł]/g, (c) => SPECIAL[c]);
  s = s.replace(/đ/g, 'd').replace(/dj/g, 'd');
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Ijekavian reflex of jat: "ije" and consonant + "je" → "e".
  s = s.replace(/ije/g, 'e').replace(/([bcdfghklmnprstvz])je/g, '$1e');
  s = s.replace(/[^a-z0-9]/g, '');
  return s;
}

const DIGRAPHS = ['lj', 'nj', 'dž'];

/** First letter of a name in the Montenegrin/Serbian Latin alphabet (Lj, Nj and Dž are single letters). */
export function firstLetter(name: string): string {
  const s = transliterate(name.normalize('NFC')).trim();
  const two = s.slice(0, 2);
  if (DIGRAPHS.includes(two)) return two[0].toUpperCase() + two[1];
  return s.charAt(0).toUpperCase();
}

/** Optimal string alignment distance, capped: returns max+1 as soon as it is exceeded. */
export function editDistance(a: string, b: string, max = 1): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows[i] = [i];
    for (let j = 1; j <= b.length; j++) rows[i][j] = i === 0 ? j : 0;
  }
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, rows[i - 2][j - 2] + 1);
      rows[i][j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return rows[a.length][b.length];
}
