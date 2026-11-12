import { birds } from './birds';
import { capitals } from './capitals';
import { countries } from './countries';
import { mammals } from './mammals';
import { montenegroCities } from './montenegro';
import type { CategoryId, CategoryMeta, Entry } from './types';

export type { CategoryId, CategoryMeta, Entry } from './types';

export const ENTRIES: Entry[] = [...countries, ...capitals, ...montenegroCities, ...mammals, ...birds];

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  country: { id: 'country', label: 'Države', noun: 'evropska država' },
  capital: { id: 'capital', label: 'Glavni gradovi', noun: 'glavni grad u Evropi' },
  'mne-city': { id: 'mne-city', label: 'Crna Gora', noun: 'mjesto u Crnoj Gori' },
  mammal: { id: 'mammal', label: 'Sisari', noun: 'sisar' },
  bird: { id: 'bird', label: 'Ptice', noun: 'ptica' },
};
