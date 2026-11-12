# Dok znaš

A quick knowledge game for phones. You get a question with many valid answers, type one, and keep your streak going until you lose three lives.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # data, normalisation, question generation and game rules
npm run build
```

## Structure

- `src/data/` holds the curated answer data (European countries and capitals, towns in Montenegro, mammals, birds). Each entry has a canonical id, a display name, aliases and attribute tags.
- `src/game/normalize.ts` normalises answers: case, spacing, diacritics, ijekavian/ekavian and Cyrillic.
- `src/game/questions.ts` holds the question templates, the question generator and answer checking.
- `src/game/engine.ts` is a pure reducer with explicit phases (`idle → playing ⇄ review → over`). It runs on a deadline-based timer and uses round ids to ignore stale events.
- `src/hooks/useVisualViewport.ts` tracks the visible viewport so the layout stays usable while the keyboard is open.
- `src/components/` contains the screens and the bottom sheet.

Answer reports from "Prijavi odgovor" are saved in `localStorage` under `dokznas.reports`.
