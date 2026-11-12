import { defineEntries } from './types';

/**
 * Towns in Montenegro: every municipal centre plus well-known smaller towns (Perast, Risan, Petrovac…).
 * Tags: coast (crnogorsko primorje), north (sjeverni region), central.
 */
export const montenegroCities = defineEntries('mne-city', [
  ['Podgorica', ['Titograd'], ['central']],
  ['Nikšić', [], ['central']],
  ['Cetinje', [], ['central']],
  ['Danilovgrad', [], ['central']],
  ['Tuzi', [], ['central']],
  ['Golubovci', [], ['central']],
  ['Spuž', [], ['central']],
  ['Virpazar', [], ['central']],
  ['Rijeka Crnojevića', [], ['central']],
  ['Herceg Novi', ['Novi'], ['coast']],
  ['Kotor', [], ['coast']],
  ['Tivat', [], ['coast']],
  ['Budva', [], ['coast']],
  ['Bar', [], ['coast']],
  ['Ulcinj', [], ['coast']],
  ['Petrovac', ['Petrovac na Moru'], ['coast']],
  ['Sutomore', [], ['coast']],
  ['Risan', [], ['coast']],
  ['Perast', [], ['coast']],
  ['Igalo', [], ['coast']],
  ['Bijela', [], ['coast']],
  ['Bijelo Polje', [], ['north']],
  ['Pljevlja', [], ['north']],
  ['Berane', ['Ivangrad'], ['north']],
  ['Rožaje', [], ['north']],
  ['Kolašin', [], ['north']],
  ['Mojkovac', [], ['north']],
  ['Žabljak', [], ['north']],
  ['Plav', [], ['north']],
  ['Gusinje', [], ['north']],
  ['Andrijevica', [], ['north']],
  ['Šavnik', [], ['north']],
  ['Plužine', [], ['north']],
  ['Petnjica', [], ['north']],
]);
