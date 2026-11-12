import { Check, HelpCircle, Play, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

const DEMOS = [
  { q: 'Navedi grad u Crnoj Gori.', a: ['Kotor', 'Nikšić', 'Žabljak'] },
  { q: 'Država u Evropi koja ima more?', a: ['Italija', 'Grčka', 'Hrvatska'] },
  { q: 'Navedi jednog sisara.', a: ['Medvjed', 'Vuk', 'Delfin'] },
];

interface Props {
  best: number;
  onPlay: () => void;
  onRules: () => void;
}

export function StartScreen({ best, onPlay, onRules }: Props) {
  const [demo, setDemo] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setDemo((d) => (d + 1) % DEMOS.length), 3200);
    return () => window.clearInterval(id);
  }, []);

  const d = DEMOS[demo];

  return (
    <section className="screen start" aria-labelledby="wordmark">
      <div className="start__top">
        <div className="record-pill" aria-label={best > 0 ? `Tvoj rekord: ${best}` : 'Još nemaš rekord'}>
          <Trophy size={15} strokeWidth={2.2} aria-hidden />
          <span>{best > 0 ? <>Rekord <strong>{best}</strong></> : 'Bez rekorda'}</span>
        </div>
        <button type="button" className="icon-btn" aria-label="Kako se igra" onClick={onRules}>
          <HelpCircle size={22} strokeWidth={2} />
        </button>
      </div>

      <div className="start__hero">
        <h1 id="wordmark" className="wordmark">
          Dok<br />znaš<span className="wordmark__dot" aria-hidden>.</span>
        </h1>
        <p className="start__lead">Jedno pitanje, mnogo tačnih odgovora. Nabrajaj dok znaš — tri greške i kraj.</p>
      </div>

      <div className="demo" aria-hidden>
        <p key={demo} className="demo__q">{d.q}</p>
        <ul className="demo__answers">
          {d.a.map((a, i) => (
            <li key={`${demo}-${a}`} style={{ animationDelay: `${180 + i * 140}ms` }}>
              <Check size={14} strokeWidth={3} /> {a}
            </li>
          ))}
        </ul>
      </div>

      <div className="start__actions">
        <button type="button" className="btn btn--primary btn--xl" onClick={onPlay}>
          <Play size={20} strokeWidth={2.6} fill="currentColor" aria-hidden />
          Igraj
        </button>
        <button type="button" className="btn btn--ghost" onClick={onRules}>
          Kako se igra?
        </button>
      </div>
    </section>
  );
}
