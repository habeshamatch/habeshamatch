'use client';

import { useState } from 'react';

type Point = { day: string; n: number };

const shortDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// One series of daily counts as columns: thin bars (max 24px) with a 4px rounded top on a single
// baseline, 2px gaps, the peak labelled, a hover tooltip on every bar, and a table for exact values.
export function DailyBars({ title, data }: { title: string; data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((p) => p.n));
  const peak = data.reduce((best, p, i) => (p.n > data[best].n ? i : best), 0);
  const total = data.reduce((s, p) => s + p.n, 0);
  const shown = hover ?? null;

  return (
    <figure className="space-y-3 rounded-2xl bg-surface p-5">
      <figcaption className="flex items-baseline justify-between">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted">{total} in 14 days</span>
      </figcaption>

      <div className="relative h-40" role="img" aria-label={`${title}: ${data.map((p) => `${shortDay(p.day)} ${p.n}`).join(', ')}`}>
        {shown !== null && (
          <div className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-raised px-2 py-1 text-xs text-text shadow">
            {shortDay(data[shown].day)}: <span className="font-semibold">{data[shown].n}</span>
          </div>
        )}
        <div className="flex h-full items-end gap-[2px] border-b border-raised">
          {data.map((p, i) => (
            <div
              key={p.day}
              className="flex h-full flex-1 cursor-default items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div className="relative flex w-full max-w-6 flex-col items-center justify-end" style={{ height: '100%' }}>
                {i === peak && p.n > 0 && <span className="mb-1 text-xs text-muted">{p.n}</span>}
                <div
                  className={`w-full rounded-t-[4px] ${hover === i ? 'bg-accent-soft' : 'bg-accent'}`}
                  style={{ height: `${(p.n / max) * 85}%`, minHeight: p.n > 0 ? 2 : 0 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span>{shortDay(data[0]?.day ?? '')}</span>
        <span>{shortDay(data[data.length - 1]?.day ?? '')}</span>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <table className="mt-2 w-full">
          <tbody>
            {data.map((p) => (
              <tr key={p.day} className="border-t border-raised">
                <td className="py-1 text-muted">{shortDay(p.day)}</td>
                <td className="py-1 text-right">{p.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
