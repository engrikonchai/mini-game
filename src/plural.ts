/** "1 tačan odgovor", "3 tačna odgovora", "7 tačnih odgovora" (with Serbian/Montenegrin number agreement). */
export function correctAnswers(n: number): string {
  const d = n % 10;
  const h = n % 100;
  if (d === 1 && h !== 11) return 'tačan odgovor';
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'tačna odgovora';
  return 'tačnih odgovora';
}
