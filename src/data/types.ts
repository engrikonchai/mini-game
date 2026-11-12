export type CategoryId = 'country' | 'capital' | 'mne-city' | 'mammal' | 'bird';

export interface Entry {
  /** Stable canonical id, e.g. "country:italija". */
  id: string;
  category: CategoryId;
  /** Display name in Montenegrin/Serbian Latin. */
  name: string;
  /** Accepted alternatives (regional variants, other names). The display name is always accepted. */
  aliases: string[];
  /** Attributes used by question templates. */
  tags: string[];
  /** If false, the answer is accepted but never shown as a suggestion. */
  hint: boolean;
}

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  /** Noun used in feedback: "Pariz nije {noun}." */
  noun: string;
}

type Def = [name: string, aliases?: string[], tags?: string[], hint?: boolean];

export function defineEntries(category: CategoryId, defs: Def[]): Entry[] {
  return defs.map(([name, aliases = [], tags = [], hint = true]) => ({
    id: `${category}:${slug(name)}`,
    category,
    name,
    aliases,
    tags,
    hint,
  }));
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'dj')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
