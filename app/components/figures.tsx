import { useEffect, useRef, useState, type ReactNode } from "react";
import "./figures.css";
import parisSvg from "./paris.svg?raw";
import mazeSvg from "./maze.svg?raw";
import permPricedSvg from "./perm-priced.svg?raw";
import permSelectsSvg from "./perm-selects.svg?raw";
import permPrioritySvg from "./perm-priority.svg?raw";
import permCentersSvg from "./perm-centers.svg?raw";
import parkMobileGo from "./parkmobile-go.jpg";

/** A figure in a written page: the art, centered at up to `maxWidth`, and an optional caption. */
function Figure({ maxWidth, caption, className, children }: { maxWidth: string; caption?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <figure className={className ? `p27-figure ${className}` : "p27-figure"} style={{ maxWidth }}>
      {children}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

/**
 * US government spending on contractor-supplied IT, in billions: federal plus state, local and
 * education, from Deltek's GovWin IQ forecasts (the plan's [^govtech-spending] footnote). Deltek
 * publishes each forecast's first and last years; the years between assume steady growth.
 */
const FORECASTS = {
  // Federal Information Technology Market, 2026-2029, and the 2024-2028 edition before it.
  federal: { from: [2026, 144.5], to: [2029, 164.6], last: { from: [2024, 131.0], to: [2028, 156.1] } },
  // SLED IT Market Forecast, 2026-2029. The 2025-28 edition put 2025 at $155 billion.
  sled: { from: [2026, 168.5], to: [2029, 209.8], last2025: 155 },
} as const;
/** The value in `year` on a steady-growth path between two forecast points. */
const along = ([y0, v0]: readonly [number, number], [y1, v1]: readonly [number, number], year: number) => v0 * (v1 / v0) ** ((year - y0) / (y1 - y0));
const SPENDING = [2025, 2026, 2027, 2028, 2029].map((year) => {
  const { federal, sled } = FORECASTS;
  const fed = year === 2025 ? along(federal.last.from, federal.last.to, 2025) : along(federal.from, federal.to, year);
  const state = year === 2025 ? sled.last2025 : along(sled.from, sled.to, year);
  return { year, total: fed + state };
});

/** The spending above as a line, last year solid and the forecast dashed, on a scale from zero. */
function SpendingChart() {
  const x = (year: number) => 64 + (year - 2025) * 58;
  const y = (billions: number) => 196 - billions * 0.44;
  const [last, now, ...ahead] = SPENDING;
  const end = ahead[ahead.length - 1];
  const label = (b: number) => `$${Math.round(b)}B`;
  return (
    <div className="p27-spend">
      <div className="p27-spend-title">US government spending on IT, per year</div>
      <div className="p27-spend-key">
        <span><i className="p27-spend-line" />Estimate</span>
        <span><i className="p27-spend-line is-dashed" />Forecast</span>
      </div>
      <svg
        viewBox="0 0 320 228"
        role="img"
        aria-label={`Line chart, from zero: US government spending on contractor-supplied IT, federal plus state, local and education, about ${label(last.total)} in 2025 and ${label(now.total)} in 2026, forecast to reach ${label(end.total)} by 2029`}
      >
        {[0, 100, 200, 300, 400].map((b) => (
          <g key={b}>
            <line className={b === 0 ? "s-dim" : "s-line"} x1="64" x2="296" y1={y(b)} y2={y(b)} strokeWidth={1} />
            <text className="f-muted" x="56" y={y(b) + 4} fontSize="12" textAnchor="end">{b === 0 ? "$0" : `$${b}B`}</text>
          </g>
        ))}
        {SPENDING.map(({ year }) => (
          <text key={year} className="f-muted" x={x(year)} y="216" fontSize="12" textAnchor="middle">{year}</text>
        ))}
        <line className="s-red" x1={x(last.year)} y1={y(last.total)} x2={x(now.year)} y2={y(now.total)} strokeWidth={2} strokeLinecap="round" />
        <polyline
          className="f-none s-red"
          points={[now, ...ahead].map((p) => `${x(p.year)},${y(p.total)}`).join(" ")}
          strokeWidth={2}
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />
        {SPENDING.map(({ year, total }) => (
          <circle key={year} className="f-red s-bg" cx={x(year)} cy={y(total)} r="4" strokeWidth={2}>
            <title>{`${year}: ${label(total)}${year > 2026 ? " (forecast)" : ""}`}</title>
          </circle>
        ))}
        <text className="f-ink t-display" x={x(last.year)} y={y(last.total) + 22} fontSize="16" textAnchor="middle">{label(last.total)}</text>
        <text className="f-ink t-display" x={x(now.year)} y={y(now.total) - 12} fontSize="16" textAnchor="middle">{label(now.total)}</text>
        <text className="f-ink t-display" x={x(end.year)} y={y(end.total) + 22} fontSize="16" textAnchor="end">{label(end.total)}</text>
      </svg>
    </div>
  );
}

/** A statehouse chained to the vendor's padlocked cloud, beside what that rent costs each year and where it's headed. */
export function LockedIn() {
  return (
    <Figure maxWidth="40rem" className="p27-pair" caption="Rented, chained to the vendor, and costing more every year.">
      <div className="p27-pair-grid">
        <svg className="p27-pair-art" viewBox="140 36 180 224" role="img" aria-label="A statehouse chained to a padlocked vendor cloud">
          <g transform="translate(16 -26) scale(2)" className="f-none s-ink" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
            <path d="M70 60 a18 18 0 0 1 32 -14 a20 20 0 0 1 38 8 a14 14 0 0 1 2 28 H72 a14 14 0 0 1 -2 -22Z" />
            <path className="s-red" d="M104 64 v-6 a8 8 0 0 1 16 0 v6" strokeWidth={1.4} />
            <rect className="f-red s-none" x="100" y="64" width="24" height="16" rx="2" />
            <circle className="f-bg s-none" cx="112" cy="71" r="1.8" />
            {/* The chain, from the lock to the roof: links seen face-on, joined by links seen edge-on
                that pass through them. */}
            <g className="s-red">
              <path d="M112 78V87 M112 89V98" strokeWidth={1.6} />
              <rect x="109.8" y="84" width="4.4" height="8" rx="2.2" strokeWidth={1.2} />
              <rect x="109.8" y="95" width="4.4" height="8" rx="2.2" strokeWidth={1.2} />
            </g>
            <line x1="112" y1="101.5" x2="112" y2="106" />
            <path d="M86 118 L112 106 L138 118 Z" />
            <rect x="88" y="118" width="48" height="4" />
            <path d="M94 122 V134 M104 122 V134 M112 122 V134 M120 122 V134 M130 122 V134" />
            <path d="M84 134 H140 M80 137 H144" />
          </g>
        </svg>
        <SpendingChart />
      </div>
    </Figure>
  );
}

/** The $20B it would take to pay 100,000 developers, drawn to scale inside the $313B we spend. */
export function RentVsOwn() {
  return (
    <Figure
      maxWidth="24rem"
      caption="Paying 100,000 developers would take $20 billion of the roughly $313 billion we spend each year, leaving $293 billion for hosting, services, and everything else."
    >
      <svg
        viewBox="0 0 340 340"
        role="img"
        aria-label="A large square for $313 billion a year in government tech spending, with a small red square in its corner, drawn to scale, for the $20 billion it would take to pay 100,000 developers"
      >
        <rect className="f-none s-ink" x="20" y="20" width="300" height="300" strokeWidth={2} />
        {/* Inside the outline's stroke, which leaves 298 across, with its area to scale: a side of
            298 × √(20 / 313) ≈ 75.3. */}
        <rect className="f-red" x="21" y="243.7" width="75.3" height="75.3" />
        <text className="f-ink t-display" x="40" y="82" fontSize="56">$313B</text>
        <text className="f-muted" x="42" y="108" fontSize="17">rented, every year</text>
        <text className="f-ink t-display" x="112" y="272" fontSize="32">$20B</text>
        <text className="f-muted" x="112" y="292" fontSize="14">100,000 developers</text>
        <text className="f-muted" x="112" y="309" fontSize="14">at $200k each</text>
      </svg>
    </Figure>
  );
}

/** Each state's place in a 12 × 8 tile grid of the US, as [row, column]. */
const STATE_TILES: Record<string, [number, number]> = {
  AK: [0, 0], ME: [0, 11], VT: [1, 10], NH: [1, 11],
  WA: [2, 1], ID: [2, 2], MT: [2, 3], ND: [2, 4], MN: [2, 5], IL: [2, 6], WI: [2, 7], MI: [2, 8], NY: [2, 9], RI: [2, 10], MA: [2, 11],
  OR: [3, 1], NV: [3, 2], WY: [3, 3], SD: [3, 4], IA: [3, 5], IN: [3, 6], OH: [3, 7], PA: [3, 8], NJ: [3, 9], CT: [3, 10],
  CA: [4, 1], UT: [4, 2], CO: [4, 3], NE: [4, 4], MO: [4, 5], KY: [4, 6], WV: [4, 7], VA: [4, 8], MD: [4, 9], DE: [4, 10],
  AZ: [5, 2], NM: [5, 3], KS: [5, 4], AR: [5, 5], TN: [5, 6], NC: [5, 7], SC: [5, 8],
  OK: [6, 4], LA: [6, 5], MS: [6, 6], AL: [6, 7], GA: [6, 8],
  HI: [7, 0], TX: [7, 4], FL: [7, 9],
};
const FIRST_ADOPTERS = ["NC", "MN", "CO", "OR", "MA", "GA"];
const MORE_ADOPTERS = ["WA", "MD", "NY", "IL", "MI", "WI", "NM", "NJ", "PA", "CA", "AZ", "KY", "ME", "VT", "DE", "NV", "UT", "KS"];
const SPREAD = [
  { label: "1 state builds it", adopted: [] as string[] },
  { label: "others adopt it", adopted: FIRST_ADOPTERS },
  { label: "it spreads", adopted: [...FIRST_ADOPTERS, ...MORE_ADOPTERS] },
  { label: "all 50, in sync", adopted: Object.keys(STATE_TILES) },
];
const TILE = 11;
const STEP = 13;
const center = ([row, col]: [number, number]) => ({ x: col * STEP + TILE / 2, y: row * STEP + TILE / 2 });

/** One state builds a tool, then others adopt it, until all fifty run it. Adoption jumps around the map: sharing code isn't geographic. */
export function OneStateToFifty() {
  const origin = center(STATE_TILES.VA);
  return (
    <figure className="p27-figure p27-map">
      <div className="p27-map-grid">
        {SPREAD.map(({ label, adopted }, frame) => (
          <div key={label}>
            <svg viewBox="-1 -1 157 105" role="img" aria-label={`Tile map of the US: ${label}`}>
              {frame === 1
                ? FIRST_ADOPTERS.map((state) => {
                    const to = center(STATE_TILES[state]);
                    return <line key={state} className="s-red" x1={origin.x} y1={origin.y} x2={to.x} y2={to.y} strokeWidth={1} strokeOpacity={0.55} />;
                  })
                : null}
              {Object.entries(STATE_TILES).map(([state, [row, col]]) => {
                const lit = state === "VA" || adopted.includes(state);
                const className = lit ? (state === "VA" && frame > 0 ? "f-red s-ink" : "f-red s-none") : "f-none s-faint";
                return <rect key={state} className={className} x={col * STEP} y={row * STEP} width={TILE} height={TILE} rx={2} strokeWidth={lit ? 1.2 : 1} />;
              })}
            </svg>
            <div className="p27-map-label">{label}</div>
          </div>
        ))}
      </div>
    </figure>
  );
}

/** A fax machine, drawn in a 56 × 50 box at (x, y). */
function FaxIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="f-none s-red" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
      <path d={`M${x + 13} ${y + 22} V${y + 3} H${x + 39} V${y + 22}`} />
      <path d={`M${x + 18} ${y + 9} H${x + 34} M${x + 18} ${y + 15} H${x + 30}`} strokeWidth={1.5} />
      <rect x={x + 2} y={y + 22} width="52" height="26" rx="4" />
      <rect x={x + 8} y={y + 29} width="20" height="7" rx="1" strokeWidth={1.5} />
      {[0, 1, 2].map((c) => [0, 1].map((r) => <circle key={`${c}${r}`} className="f-red s-none" cx={x + 36 + c * 6} cy={y + 31 + r * 7} r="1.6" />))}
    </g>
  );
}

/** A sealed letter, drawn in a 56 × 50 box at (x, y). */
function LetterIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="f-none s-red" strokeWidth={2} strokeLinejoin="round">
      <rect x={x + 2} y={y + 8} width="52" height="36" rx="3" />
      <path d={`M${x + 3} ${y + 10} L${x + 28} ${y + 29} L${x + 53} ${y + 10}`} />
    </g>
  );
}

/** A screen exchanging records both ways, drawn in a 56 × 50 box at (x, y). */
function DigitalIcon({ x, y }: { x: number; y: number }) {
  return (
    <g className="f-none s-ink" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
      <rect x={x + 4} y={y + 3} width="48" height="33" rx="3" />
      <path d={`M${x + 28} ${y + 36} V${y + 44} M${x + 19} ${y + 45} H${x + 37}`} />
      <path d={`M${x + 16} ${y + 15} H${x + 40} M${x + 35} ${y + 10} L${x + 40} ${y + 15} L${x + 35} ${y + 20}`} strokeWidth={1.8} />
      <path d={`M${x + 40} ${y + 25} H${x + 16} M${x + 21} ${y + 20} L${x + 16} ${y + 25} L${x + 21} ${y + 30}`} strokeWidth={1.8} />
    </g>
  );
}

/** Ten hospitals: four still sending records by fax or mail, six exchanging them electronically. */
export function StillFaxing() {
  const spots = Array.from({ length: 10 }, (_, i) => ({ x: 60 + (i % 5) * 76, y: 40 + Math.floor(i / 5) * 84 }));
  return (
    <Figure maxWidth="28rem" caption="In 2025, 4 in 10 US hospitals often sent patients' records by mail or fax.">
      <svg viewBox="48 28 384 160" role="img" aria-label="Ten hospitals: four in red sending records by fax machine or letter, six in white exchanging them electronically">
        {spots.map(({ x, y }, i) =>
          i < 4 ? (i % 2 ? <LetterIcon key={i} x={x} y={y} /> : <FaxIcon key={i} x={x} y={y} />) : <DigitalIcon key={i} x={x} y={y} />,
        )}
      </svg>
    </Figure>
  );
}

/** A rigid structure that breaks at a barrier beside a tree that grows around the same barrier. */
export function GrownNotDesigned() {
  return (
    <Figure maxWidth="28rem">
      <svg
        viewBox="50 46 400 236"
        role="img"
        aria-label="On the left, a rigid designed structure hits a barrier near its base and breaks, so everything above it is never built. On the right, a tree hits the same barrier, bends around it, and keeps growing."
      >
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line className="s-dim" x1="60" y1="222" x2="200" y2="222" strokeWidth={1.5} />
          <path className="s-muted" strokeWidth={4} d="M130 222 V200" />
          <path
            className="s-muted"
            strokeOpacity={0.35}
            strokeWidth={4}
            strokeDasharray="6 6"
            d="M130 196 V70 M130 160 H96 V120 M130 130 H166 V90 M130 100 H104 M130 70 H156"
          />
          <path className="s-red" strokeWidth={3} d="M116 202 L144 192" />
          <line className="s-faint" x1="240" y1="50" x2="240" y2="240" strokeDasharray="2 5" />
          <line className="s-dim" x1="280" y1="222" x2="440" y2="222" strokeWidth={1.5} />
          <path
            className="s-ink"
            strokeWidth={3}
            d="M360 222 C360 210 384 208 384 195 C384 180 360 182 360 164 C359 140 359 110 358 72 M360 150 C350 140 340 130 334 112 M360 128 C372 118 382 106 386 90 M359 108 C352 98 348 90 346 78 M358 96 C362 88 368 82 372 74"
          />
          <path className="s-red" strokeWidth={3} d="M346 202 L374 192" />
        </g>
        <text className="f-muted" x="130" y="270" fontSize="17" textAnchor="middle">designed breaks</text>
        <text className="f-muted" x="360" y="270" fontSize="17" textAnchor="middle">grown adapts</text>
      </svg>
    </Figure>
  );
}

const KEY_PIN_HEIGHTS = [12, 18, 9, 15];
const LOCK_USERS: [number, number][] = [
  [262, 110], [270, 170], [266, 228], [296, 72], [330, 52], [390, 52], [424, 72], [454, 110], [460, 170], [454, 228], [300, 250], [420, 250],
];

/** A lock you can only see the outline of, beside one whose every part is visible to the people who use it. */
export function TwoLocks() {
  return (
    <Figure maxWidth="30rem">
      <svg
        viewBox="66 26 420 244"
        role="img"
        aria-label="On the left, a lock drawn as a bare outline with a question mark on it, versus, on the right, an x-ray of a lock showing its springs, pins and key, surrounded by the people who use it"
      >
        <g className="f-none s-muted" strokeWidth={1.6}>
          <path d="M96 140 v-26 a24 24 0 0 1 48 0 v26 M104 140 v-26 a16 16 0 0 1 32 0 v26" />
          <rect x="84" y="140" width="72" height="60" rx="6" />
        </g>
        <text className="f-muted t-display" x="120" y="190" fontSize="52" textAnchor="middle">?</text>
        <text className="f-muted t-display" x="208" y="180" fontSize="32" textAnchor="middle">vs</text>
        <g className="f-none s-ink" strokeWidth={1.2}>
          <path d="M336 142 v-28 a24 24 0 0 1 48 0 v28" />
          <path d="M344 142 v-28 a16 16 0 0 1 32 0 v28" />
          <rect x="324" y="140" width="72" height="60" rx="6" />
        </g>
        <rect className="f-none s-muted" x="330" y="160" width="60" height="32" rx="4" strokeWidth={1} strokeDasharray="3 2" />
        {[340, 353, 366, 379].map((x, i) => (
          <g key={x} className="f-none">
            <path className="s-ink" d={`M${x} 143 l3 1.5 l-6 1.5 l6 1.5 l-6 1.5 l3 1.5`} strokeWidth={1} />
            <rect className="s-ink" x={x - 3} y="151" width="6" height="9" strokeWidth={1} />
            <rect className="s-red" x={x - 3} y="160" width="6" height={KEY_PIN_HEIGHTS[i]} strokeWidth={1.2} />
          </g>
        ))}
        <g className="f-none s-red" strokeWidth={1.4}>
          <path d="M398 184 H334 L334 177 L340 172 L346 176 L353 178 L359 174 L366 169 L372 172 L379 175 L386 172 L398 172" />
          <circle cx="408" cy="178" r="9" />
          <circle cx="408" cy="178" r="3" strokeWidth={1} />
        </g>
        {LOCK_USERS.map(([x, y]) => <Person key={`${x},${y}`} x={x} y={y + 14} scale={0.45} strokeWidth={1.4} />)}
      </svg>
    </Figure>
  );
}

/**
 * What Linux would earn if licensed like Windows, drawn to scale against one smaller amount: a
 * square bottom-aligned to the right of the big one, labeled above.
 */
function AgainstLinuxRevenue({ side, value, lines, red = false, label }: { side: number; value: string; lines: [string, string]; red?: boolean; label: string }) {
  const top = 320 - side;
  return (
    <Figure maxWidth="34rem">
      <svg viewBox="0 0 530 330" role="img" aria-label={label}>
        <rect className="f-none s-ink" x="10" y="20" width="300" height="300" strokeWidth={2} />
        <text className="f-ink t-display" x="30" y="84" fontSize="60">$1.3T</text>
        <text className="f-muted" x="32" y="112" fontSize="17">Revenue if Linux was</text>
        <text className="f-muted" x="32" y="133" fontSize="17">licensed like Windows</text>
        <rect className={red ? "f-red" : "f-shape"} x="350" y={top} width={side} height={side} />
        <text className={`${red ? "f-red" : "f-ink"} t-display`} x="350" y={top - 58} fontSize="34">{value}</text>
        <text className="f-muted" x="350" y={top - 37} fontSize="15">{lines[0]}</text>
        <text className="f-muted" x="350" y={top - 19} fontSize="15">{lines[1]}</text>
      </svg>
    </Figure>
  );
}

/** Linux, licensed like Windows, against what Microsoft actually makes from server products and cloud. */
export function LinuxVsMicrosoft() {
  return (
    <AgainstLinuxRevenue
      side={82.5}
      value="$98.4B"
      lines={["Actual Microsoft server", "& cloud revenue"]}
      label="Squares drawn to scale: a large square for the $1.3 trillion Linux would earn if licensed like Windows, beside a smaller square for Microsoft's actual $98.4 billion of server and cloud revenue"
    />
  );
}

/**
 * The Magnificent Seven's revenue in each one's latest fiscal year, in billions, from their 10-Ks
 * (the plan's [^mag7] footnote), against what Linux would earn if licensed like Windows.
 */
const LINUX_REVENUE = 1300;
const LINUX_UPKEEP = 7.7;
const MAG_SEVEN = [
  { name: "Amazon", revenue: 716.92, profit: 77.67 },
  { name: "Apple", revenue: 478.83, profit: 132.18 },
  { name: "Alphabet", revenue: 402.84, profit: 132.17 },
  { name: "Microsoft", revenue: 331.84, profit: 133.75 },
  { name: "Nvidia", revenue: 215.94, profit: 120.07 },
  { name: "Meta", revenue: 200.97, profit: 60.46 },
  { name: "Tesla", revenue: 94.83, profit: 3.79 },
];
/** Billions as a short dollar amount: $717B, or $1.3T and $1.29T past a thousand. */
const dollars = (billions: number) => (billions >= 1000 ? `$${Number((billions / 1000).toFixed(2))}T` : `$${Math.round(billions)}B`);

/** Linux, licensed like Windows, out-earning each of the Mag 7: one bar each, to scale. */
export function MagSevenRevenue() {
  const rows = [{ name: "Linux, licensed like Windows", revenue: LINUX_REVENUE, linux: true }, ...MAG_SEVEN.map((c) => ({ ...c, linux: false }))];
  return (
    <Figure maxWidth="34rem" caption="Each company's revenue in its latest fiscal year, against what Linux would bring in if it were licensed like Windows.">
      <div className="p27-bars">
        {rows.map(({ name, revenue, linux }) => (
          <div key={name} className={linux ? "p27-bars-row is-linux" : "p27-bars-row"}>
            <div className="p27-bars-label">{name}</div>
            <div className="p27-bars-track">
              <div className="p27-bars-bar" style={{ width: `calc((100% - 3.75rem) * ${revenue / LINUX_REVENUE})` }} aria-hidden />
              <span className="p27-bars-value">{dollars(revenue)}</span>
            </div>
          </div>
        ))}
      </div>
    </Figure>
  );
}

/** A year of revenue split into profit and costs, for Linux and for the Mag 7 combined, to scale. */
export function MagSevenProfit() {
  const magRevenue = MAG_SEVEN.reduce((sum, c) => sum + c.revenue, 0);
  const magProfit = MAG_SEVEN.reduce((sum, c) => sum + c.profit, 0);
  const rows = [
    { name: "Linux, licensed like Windows", revenue: LINUX_REVENUE, profit: LINUX_REVENUE - LINUX_UPKEEP },
    { name: "The Mag 7, combined", revenue: magRevenue, profit: magProfit },
  ];
  return (
    <Figure
      maxWidth="34rem"
    >
      <div className="p27-split">
        <div className="p27-split-legend">
          <span><i className="p27-swatch is-profit" />Profit</span>
          <span><i className="p27-swatch is-cost" />Costs</span>
        </div>
        {rows.map(({ name, revenue, profit }) => (
          <div key={name} className="p27-split-row">
            <div className="p27-split-label">{name}</div>
            <div className="p27-split-bar" style={{ width: `${(revenue / magRevenue) * 100}%` }} aria-hidden>
              <span className="p27-split-seg is-profit" style={{ flexGrow: profit }} />
              <span className="p27-split-seg is-cost" style={{ flexGrow: revenue - profit }} />
            </div>
            <div className="p27-split-stat">
              <strong>{dollars(profit)}</strong> profit on {dollars(revenue)} of revenue, a <strong>{Math.round((profit / revenue) * 100)}%</strong> margin
            </div>
          </div>
        ))}
      </div>
    </Figure>
  );
}

/** Linux, licensed like Windows, against what all of open source gets to maintain it. */
export function LinuxVsMaintenance() {
  return (
    <AgainstLinuxRevenue
      side={23.1}
      value="$7.7B"
      red
      lines={["Spent maintaining all of", "open source, per year"]}
      label="Squares drawn to scale: a large square for the $1.3 trillion Linux would earn if licensed like Windows, beside a tiny red square for the $7.7 billion a year spent maintaining all of open source"
    />
  );
}

const PAIN_LOOP = 480;
const PAIN_BAND = 72;
const painCenter = (layer: number) => PAIN_BAND / 2 + layer * PAIN_BAND;
const painBoundary = (below: number) => PAIN_BAND * (below + 1);
/** Where the people stand, as [layer, x]. */
const PAIN_PEOPLE: [number, number][] = [[0, 170], [0, 360], [0, 420], [1, 190], [1, 380], [2, 180], [2, 400], [3, 220], [3, 360]];
const PAIN_X = 290;

/**
 * The animation clock for the pain-signal figure: a frame count that loops, running only while the
 * figure is on screen. With reduced motion it stays still, and the panels draw a summary instead.
 */
function usePainClock() {
  const ref = useRef<HTMLDivElement>(null);
  const [t, setT] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      return;
    }
    let raf = 0;
    let frame = 0;
    let running = false;
    const tick = () => {
      frame = (frame + 1) % PAIN_LOOP;
      setT(frame);
      raf = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        raf = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return { ref, t, still };
}

/** One side of the pain-signal figure: a person in pain, a signal heading down, and the bug causing it. */
function PainPanel({ open, t, still }: { open: boolean; t: number; still: boolean }) {
  const speed = 1.1;
  const start = 50;
  const from = painCenter(0);
  const bugY = painCenter(2);
  const stopY = open ? bugY - 12 : painBoundary(0);
  const arrive = start + (stopY - from) / speed;

  let trail: { to: number; opacity: number } | null = null;
  let pulse: number | null = null;
  let ripple: { half: number; opacity: number } | null = null;
  const rings: { y: number; r: number; opacity: number }[] = [];
  let fixed = false;

  if (still) {
    trail = { to: stopY, opacity: 0.6 };
    if (open) fixed = true;
    else ripple = { half: 45, opacity: 0.7 };
  } else {
    if (t < 60) rings.push({ y: from, r: 8 + t * 0.5, opacity: 1 - t / 60 });
    if (t >= start && t < arrive) {
      pulse = from + (t - start) * speed;
      trail = { to: pulse, opacity: 0.6 };
    } else if (t >= arrive && t < arrive + 50) {
      trail = { to: stopY, opacity: 0.6 * (1 - (t - arrive) / 50) };
    }
    if (!open && t >= arrive && t < arrive + 70) {
      const u = (t - arrive) / 70;
      ripple = { half: u * 70, opacity: 1 - u };
    }
    if (open && t >= arrive && t < arrive + 50) rings.push({ y: bugY, r: 12 + (t - arrive) * 0.5, opacity: 1 - (t - arrive) / 50 });
    fixed = open && t >= arrive + 50 && t < PAIN_LOOP - 30;
  }

  return (
    <svg viewBox="130 0 320 288" role="img" aria-label={open ? "With permeability work: the signal passes through the interface and reaches the bug in services, which gets fixed" : "Today: the signal stops at the sealed boundary under the public, and the bug in services stays"}>
      {[0, 1, 2].map((i) => {
        const sealed = !open && i === 0;
        return (
          <line
            key={i}
            className={sealed ? "s-red" : "s-dim"}
            x1="135" x2="445" y1={painBoundary(i)} y2={painBoundary(i)}
            strokeWidth={sealed ? 2.5 : 1.5}
            strokeDasharray={sealed ? undefined : !open && i === 1 ? "14 6" : "4 10"}
          />
        );
      })}
      {PAIN_PEOPLE.map(([layer, x], j) => (
        <circle key={j} className="f-ink" cx={x} cy={painCenter(layer) + (j % 2 ? 8 : -6)} r="5" />
      ))}
      {trail ? <line className="s-red" x1={PAIN_X} x2={PAIN_X} y1={from} y2={trail.to} strokeWidth={2} strokeOpacity={trail.opacity} strokeDasharray="2 4" strokeLinecap="round" /> : null}
      {ripple ? <line className="s-red" x1={PAIN_X - ripple.half} x2={PAIN_X + ripple.half} y1={stopY} y2={stopY} strokeWidth={3} strokeOpacity={ripple.opacity} strokeLinecap="round" /> : null}
      {rings.map((ring, k) => (
        <circle key={k} className="f-none s-red" cx={PAIN_X} cy={ring.y} r={ring.r} strokeWidth={2} strokeOpacity={ring.opacity} />
      ))}
      {pulse !== null ? <circle className="f-red" cx={PAIN_X} cy={pulse} r="6" /> : null}
      <circle className={fixed ? "f-ink" : "f-red"} cx={PAIN_X} cy={from} r="6" />
      <rect className={`f-bg ${fixed ? "s-ink" : "s-red"}`} x={PAIN_X - 10} y={bugY - 10} width="20" height="20" rx="3" strokeWidth={2} />
      <path
        className={`f-none ${fixed ? "s-ink" : "s-red"}`}
        d={fixed ? `M${PAIN_X - 5} ${bugY} l4 4 l7 -8` : `M${PAIN_X - 5} ${bugY - 5} l10 10 M${PAIN_X + 5} ${bugY - 5} l-10 10`}
        strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/** A person's pain travels down toward the bug causing it: stopped at the interface today, delivered and fixed with permeability. */
export function PainSignal() {
  const { ref, t, still } = usePainClock();
  return (
    <figure className="p27-figure p27-pain" ref={ref}>
      <div className="p27-pain-grid">
        <div>
          <div className="p27-pain-title">Today</div>
          <PainPanel open={false} t={t} still={still} />
        </div>
        <div>
          <div className="p27-pain-title">With permeability work</div>
          <PainPanel open t={t} still={still} />
        </div>
      </div>
      <figcaption>
        Today, the pain signal stops propagating at the UI. With
        permeability, it reaches the layer where it can be fixed.
      </figcaption>
    </figure>
  );
}

/** Mailed license applications winding through a paper maze, beside a direct path to an approved license. */
export function PaperMaze() {
  return (
    <figure className="p27-figure p27-maze" style={{ maxWidth: "40rem" }}>
      <div dangerouslySetInnerHTML={{ __html: mazeSvg }} />
    </figure>
  );
}

/** A rat on a Paris rooftop, looking out at the Eiffel Tower. */
export function ParisRooftop() {
  return (
    <figure className="p27-figure p27-paris" style={{ maxWidth: "40rem" }}>
      <div dangerouslySetInnerHTML={{ __html: parisSvg }} />
      <figcaption className="p27-paris-quote">
        <blockquote>Not everyone can become a great chef, but a great chef can come from anywhere.</blockquote>
      </figcaption>
    </figure>
  );
}

/** Oil through a narrow strait beside software through a vendor's switch: two chokepoints that can close overnight. */
const STRAIT_TOP = "M0 78C126 78 205 184 280 184C355 184 434 78 560 78";
const STRAIT_BOTTOM = "M0 342C126 342 205 236 280 236C355 236 434 342 560 342";
const APP_ICONS = [
  { key: "doc", draw: (c: string) => <path className={`f-none ${c}`} strokeWidth={1.4} d="M-7-4H5L10 1V14H-7Z M5-4V1H10 M-3 6H6 M-3 10H4" /> },
  {
    key: "calendar",
    draw: (c: string, f: string) => (
      <>
        <rect className={`f-none ${c}`} strokeWidth={1.3} x="-11" y="-3" width="22" height="17" rx="1" />
        <path className={`f-none ${c}`} strokeWidth={1.2} d="M-11 2H11 M-6-6V-1 M6-6V-1" />
        {[-6, 0, 6].map((x) => <circle key={x} className={f} cx={x} cy="8" r="1.1" />)}
      </>
    ),
  },
  {
    key: "chat",
    draw: (c: string, f: string) => (
      <>
        <path className={`f-none ${c}`} strokeWidth={1.4} d="M-12-3H12V10H1L-6 16V10H-12Z" />
        {[-6, 0, 6].map((x) => <circle key={x} className={f} cx={x} cy="3" r="1" />)}
      </>
    ),
  },
];

function AppWindow({ x, icon, off }: { x: number; icon: (typeof APP_ICONS)[number]; off?: boolean }) {
  const c = off ? "s-faint" : "s-ink";
  const f = off ? "f-faint" : "f-ink";
  return (
    <g transform={`translate(${x} 210)`}>
      <rect className={`f-bg ${c}`} strokeWidth={1.7} x="-22" y="-20" width="44" height="40" rx="3" />
      <path className={`f-none ${c}`} strokeWidth={1.2} d="M-22-10H22" />
      {[-15, -10, -5].map((cx) => <circle key={cx} className={f} cx={cx} cy="-15" r="1" />)}
      {icon.draw(c, f)}
    </g>
  );
}

function Tanker({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 205)`}>
      <path className="f-ink" d="M-25 4H25L17 17H-19Z" />
      <rect className="f-ink" x="-18" y="-11" width="12" height="15" />
      <rect className="f-ink" x="-16" y="-16" width="4" height="5" />
      {[-1, 8, 17].map((rx) => <rect key={rx} className="f-ink" x={rx} y="-1" width="6" height="5" rx="1" />)}
      <path className="f-none s-bg" strokeWidth={1.1} strokeLinecap="round" d="M-18 10H13" />
    </g>
  );
}

/** One of the two passages: its drawing (560 wide, cropped to the strait) over its title. */
function Passage({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  return (
    <div className="p27-choke-panel">
      <svg viewBox="0 66 560 288" role="img" aria-label={label}>
        <g strokeLinecap="round" strokeLinejoin="round">
          <path className="f-none s-ink" strokeWidth={3} d={STRAIT_TOP} />
          <path className="f-none s-ink" strokeWidth={3} d={STRAIT_BOTTOM} />
          {children}
        </g>
      </svg>
      <p className="p27-choke-title">{title}</p>
    </div>
  );
}

/** Two matching narrow passages, side by side, or stacked on phones (figures.css). */
export function TwoChokepoints() {
  return (
    <Figure maxWidth="44rem" className="p27-choke">
      <div className="p27-choke-grid">
        <Passage title="Oil: the Strait of Hormuz" label="Oil tankers approach a red block in the narrow Strait of Hormuz.">
          <path className="f-none s-dim" strokeWidth={1.6} strokeDasharray="5 8" d="M18 210H249 M311 210H542" />
          {[58, 124, 190].map((x) => <Tanker key={x} x={x} />)}
          <path className="f-none s-red" strokeWidth={5} d="M266 196L294 224 M294 196L266 224" />
        </Passage>
        <Passage
          title="Software: a vendor’s off switch"
          label="Documents, calendar and messaging apps pass through a single vendor-controlled switch. The switch is off, and the services beyond it are dimmed."
        >
          <path className="f-none s-dim" strokeWidth={1.6} strokeDasharray="5 8" d="M18 210H230" />
          <path className="f-none s-faint" strokeWidth={1.6} strokeDasharray="3 9" d="M330 210H542" />
          {APP_ICONS.map((icon, i) => <AppWindow key={icon.key} x={58 + i * 66} icon={icon} />)}
          {APP_ICONS.map((icon, i) => <AppWindow key={icon.key} x={373 + i * 66} icon={icon} off />)}
          <rect className="f-bg s-red" strokeWidth={4} x="235" y="183" width="90" height="54" rx="27" />
          <circle className="f-red" cx="261" cy="210" r="18" />
          <text className="f-red" x="280" y="160" fontSize="15" fontWeight="600" letterSpacing="1.5" textAnchor="middle">
            OFF
          </text>
        </Passage>
      </div>
    </Figure>
  );
}

/**
 * The permeability figures were drawn on the design canvas in its fixed palette. They're inlined so
 * figures.css (.p27-board) can map those colors onto the site's light and dark themes.
 */
function BoardFigure({ svg, caption, maxWidth = "40rem" }: { svg: string; caption?: string; maxWidth?: string }) {
  return (
    <figure className="p27-figure p27-board" style={{ maxWidth }}>
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

/** A user's pain hits a priced wall and only a dot gets through, vs crossing a permeable boundary whole. */
export function PricedVsPermeable() {
  return <BoardFigure svg={permPricedSvg} />;
}

/** One pain, several fixes; people try them and the useful one spreads. */
export function UseSelectsWhatSpreads() {
  return <BoardFigure svg={permSelectsSvg} caption="People try different fixes, improve them, and share the ones that help." />;
}

/** Groups of people over each problem; the most widely felt ones tend to get fixed first. */
export function SharedPainPriority() {
  return <BoardFigure svg={permPrioritySvg} />;
}

/** Five local teams, each with its own tool, linked as peers inside one set of shared rules. */
export function ManyCenters() {
  return <BoardFigure svg={permCentersSvg} caption="Many centers of decision-making, one set of shared rules." />;
}

/** ParkMobile's in-app pitch for its subscription: a phone screenshot, with the screen's rounded corners. */
export function ParkMobileUpsell() {
  return (
    <Figure maxWidth="18rem">
      <img
        className="p27-screenshot"
        src={parkMobileGo}
        width={720}
        height={1334}
        loading="lazy"
        decoding="async"
        alt="ParkMobile's offer: “Skip platform fee with ParkMobile Go”, a 30 day free trial, then $5.99 a month, with no platform fee on parking, “Park more, pay less”, and buttons to start the free trial or say maybe later."
      />
    </Figure>
  );
}

/** A server rack plugged into the wall, drawn in a 200 × 156 box. */
function PlugInIcon() {
  return (
    <svg viewBox="0 0 200 156" aria-hidden="true">
      <g className="f-none" strokeLinecap="round" strokeLinejoin="round">
        <rect className="s-muted" x="20" y="18" width="34" height="26" rx="3" strokeWidth={1.6} />
        <path className="s-muted" d="M32 26V34 M42 26V34" strokeWidth={1.6} />
        <path className="s-red" d="M37 56V48 M33 52L37 48L41 52" strokeWidth={1.8} />
        <path className="s-ink" d="M33 58V66 M41 58V66" strokeWidth={2} />
        <rect className="s-ink" x="28" y="66" width="18" height="16" rx="2" strokeWidth={2} />
        <path className="s-ink" d="M37 82V120Q37 132 49 132H110" strokeWidth={2} />
        <rect className="s-ink" x="110" y="14" width="70" height="126" rx="4" strokeWidth={2} />
        {[26, 56, 86].map((y) => (
          <g key={y}>
            <rect className="s-muted" x="118" y={y} width="54" height="22" rx="2" strokeWidth={1.4} />
            <path className="s-dim" d={`M125 ${y + 9}H146 M125 ${y + 14}H140`} strokeWidth={1.4} />
            <circle className="f-red s-none" cx="163" cy={y + 11} r="2.5" />
          </g>
        ))}
        <circle className="f-red s-none" cx="145" cy="125" r="3" />
        <path className="s-ink" d="M120 140V148 M170 140V148" strokeWidth={2} />
      </g>
    </svg>
  );
}

/** A setup window with one button, drawn in a 200 × 156 box. */
function SetUpIcon() {
  return (
    <svg viewBox="0 0 200 156" aria-hidden="true">
      <rect className="f-tile s-ink" x="16" y="22" width="168" height="114" rx="6" strokeWidth={2} />
      <path className="f-none s-dim" d="M16 40H184" strokeWidth={1.4} />
      {[28, 36].map((cx) => <circle key={cx} className="f-muted" cx={cx} cy="31" r="2" />)}
      <text className="f-ink" x="100" y="78" fontSize="20" fontWeight="500" textAnchor="middle">School OS</text>
      <rect className="f-red" x="58" y="94" width="84" height="26" rx="3" />
      <text className="f-on-red" x="100" y="112" fontSize="13" fontWeight="700" textAnchor="middle">Set up</text>
    </svg>
  );
}

/** A check mark circled by update arrows, over a ticked "Automatic updates" box, in a 200 × 156 box. */
function KeepCurrentIcon() {
  return (
    <svg viewBox="0 0 200 156" aria-hidden="true">
      <g className="f-none" strokeLinecap="round" strokeLinejoin="round">
        <path className="s-red" d="M58.7 55A44 44 0 0 1 141.3 55 M144.5 43.2L141.3 55L131.3 48" strokeWidth={2.4} />
        <path className="s-red" d="M141.3 85A44 44 0 0 1 58.7 85 M68.7 92L58.7 85L55.5 96.8" strokeWidth={2.4} />
        <path className="s-ink" d="M86 70L96 80L115 59" strokeWidth={4} />
      </g>
      <rect className="f-red" x="36" y="126" width="18" height="18" rx="3" />
      <path className="f-none s-on-red" d="M40 135L44 139L50 131" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <text className="f-ink" x="62" y="140" fontSize="13">Automatic updates</text>
    </svg>
  );
}

const SETUP_STEPS = [
  { title: "Plug it in", detail: "A “cloud-in-a-box” commodity server.", Icon: PlugInIcon },
  { title: "Set up School OS", detail: "The tools the school needs.", Icon: SetUpIcon },
  { title: "Keep it current", detail: "Updates install themselves.", Icon: KeepCurrentIcon },
];

/** Running a school's own services in three steps: plug in a server, set up School OS, leave updates on. */
export function SchoolSetup() {
  return (
    <Figure maxWidth="44rem" className="p27-setup" caption="School IT should be this simple.">
      <ol className="p27-setup-steps">
        {SETUP_STEPS.map(({ title, detail, Icon }, i) => (
          <li key={title} className="p27-setup-step">
            <span className="p27-setup-num">{i + 1}</span>
            <div className="p27-setup-art">
              <Icon />
              {i < SETUP_STEPS.length - 1 ? (
                <svg className="p27-setup-arrow" viewBox="0 0 40 12" aria-hidden="true">
                  <path d="M2 6H37 M31 1L37 6L31 11" />
                </svg>
              ) : null}
            </div>
            <span className="p27-setup-title">{title}</span>
            <span className="p27-setup-detail">{detail}</span>
          </li>
        ))}
      </ol>
    </Figure>
  );
}

/** A cloud outline, about 406 × 222, spanning x 34–440 and y 18–240. */
const CLOUD = "M110 240H370A70 70 0 0 0 382 101A110 110 0 0 0 175 82A80 80 0 0 0 64 160A50 50 0 0 0 110 240Z";

/** An app in a 64 × 64 tile at (x, y), shown at `size`: mail, calendar or docs. Red for the one in focus. */
function AppTile({ x, y, size = 64, app, red }: { x: number; y: number; size?: number; app: "mail" | "calendar" | "doc"; red?: boolean }) {
  const s = red ? "s-on-red" : "s-ink";
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 64})`}>
      <rect className={red ? "f-red" : "f-tile"} width="64" height="64" rx="3" />
      <g className={`f-none ${s}`} strokeWidth={size < 40 ? 1 : 1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
        <rect x="10" y="10" width="44" height="44" rx="2" vectorEffect="non-scaling-stroke" />
        <path d="M10 20H54" vectorEffect="non-scaling-stroke" />
        {app === "mail" ? (
          <path d="M20 29H44V45H20Z M20 30L32 38L44 30" vectorEffect="non-scaling-stroke" />
        ) : app === "calendar" ? (
          <path d="M21 28H43V47H21Z M21 33H43 M26 25V30 M38 25V30" vectorEffect="non-scaling-stroke" />
        ) : (
          <path d="M24 26H36L41 31V49H24Z M36 26V31H41 M28 37H37 M28 41H37 M28 45H34" vectorEffect="non-scaling-stroke" />
        )}
      </g>
      {app === "calendar"
        ? [[28, 38], [32, 38], [36, 38], [28, 42], [32, 42]].map(([cx, cy]) => (
            <circle key={`${cx},${cy}`} className={red ? "f-on-red" : "f-ink"} cx={cx} cy={cy} r="1.4" />
          ))
        : null}
    </g>
  );
}

const APPS = ["mail", "calendar", "doc"] as const;

/** A key lying across a line at (x, y), drawn in red. */
function Key({ x, y }: { x: number; y: number }) {
  return (
    <path
      className="f-none s-red"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      d={`M${x - 6} ${y}A6 6 0 1 1 ${x - 18} ${y}A6 6 0 1 1 ${x - 6} ${y}H${x + 14} M${x + 7} ${y}V${y + 5} M${x + 12} ${y}V${y + 5}`}
    />
  );
}

/** A person, head and shoulders, standing on (x, y): 42 wide and 56 tall at scale 1. */
function Person({ x, y, scale: s = 1, strokeWidth = 2 }: { x: number; y: number; scale?: number; strokeWidth?: number }) {
  return (
    <g className="f-none s-ink" strokeWidth={strokeWidth} strokeLinecap="round">
      <circle cx={x} cy={y - 46 * s} r={10 * s} />
      <path d={`M${x - 21 * s} ${y}V${y - 6 * s}A${21 * s} ${21 * s} 0 0 1 ${x + 21 * s} ${y - 6 * s}V${y}`} />
    </g>
  );
}

/** The same three apps, as accounts on one provider's cloud versus a personal cloud for each of us. */
export function WhoHoldsTheKeys() {
  const PEOPLE_Y = 380;
  const SMALL = 0.36;
  return (
    <Figure maxWidth="44rem" className="p27-keys" caption="The same apps, a different kind of ownership.">
      <div className="p27-keys-grid">
        <div className="p27-keys-panel">
          <svg viewBox="0 0 480 390" role="img" aria-label="One big cloud labeled provider's server, holding mail, calendar and docs apps, with the only key. Three people connect to it by lines from below.">
            <path className="f-none s-ink" strokeWidth={2.4} strokeLinejoin="round" d={CLOUD} />
            <text className="f-muted" x="226" y="112" fontSize="13" fontWeight="700" letterSpacing="2" textAnchor="middle">PROVIDER’S SERVER</text>
            <Key x={330} y={107} />
            {APPS.map((app, i) => <AppTile key={app} x={133 + i * 75} y={134} app={app} red={app === "calendar"} />)}
            <path className="f-none s-dim" strokeWidth={1.6} d={`M240 240V282 M120 ${PEOPLE_Y - 64}V282H360V${PEOPLE_Y - 64} M240 282V${PEOPLE_Y - 64}`} />
            {[120, 240, 360].map((x) => <Person key={x} x={x} y={PEOPLE_Y} />)}
          </svg>
          <p className="p27-keys-title">One provider holds the keys.</p>
          <p className="p27-keys-detail">You get an account.</p>
        </div>
        <div className="p27-keys-panel">
          <svg viewBox="0 0 480 390" role="img" aria-label="Three small clouds, each a personal cloud with its own mail, calendar and docs apps, each connected to one person who holds its key.">
            <text className="f-muted" x="240" y="40" fontSize="13" fontWeight="700" letterSpacing="2" textAnchor="middle">YOUR OWN PERSONAL CLOUD</text>
            {[82, 240, 398].map((cx) => (
              <g key={cx}>
                <path
                  className="f-none s-ink"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  transform={`translate(${cx - 237 * SMALL} ${70 - 18 * SMALL}) scale(${SMALL})`}
                  d={CLOUD}
                />
                {APPS.map((app, i) => <AppTile key={app} x={cx - 44 + i * 30} y={112} size={26} app={app} red={app === "calendar"} />)}
                <path className="f-none s-dim" strokeWidth={1.6} d={`M${cx} 146V${PEOPLE_Y - 64}`} />
                <Key x={cx + 2} y={236} />
                <Person x={cx} y={PEOPLE_Y} />
              </g>
            ))}
          </svg>
          <p className="p27-keys-title">Everyone holds their own.</p>
          <p className="p27-keys-detail">You get the software.</p>
        </div>
      </div>
    </Figure>
  );
}

/**
 * Edge on Chromium: a shared line of versions that Google maintains, and the fork Microsoft could
 * split off at any point if a change went against it. The fork is an option, drawn dashed, not an event.
 */
export function CredibleExit() {
  const LINE = 170;
  const FORK = 300;
  return (
    <Figure
      maxWidth="36rem"
      caption="A credible exit keeps power in check. The fork doesn’t have to happen for the option to matter: knowing Microsoft can leave gives Google a reason not to weaponize the shared core."
    >
      <svg
        viewBox="0 0 640 380"
        role="img"
        aria-label="A timeline of Chromium versions that Google maintains and Microsoft builds Edge on. A hypothetical change at Microsoft's expense sits further along the line. From the last shared version, a dashed red path branches off: Microsoft maintaining its own fork, independent of Google's decisions. The dashed path is an option, not an event."
      >
        <g className="f-none s-ink" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="20" y="30" width="56" height="44" rx="4" />
          <path d="M20 42H76" strokeWidth={1.4} />
          <path d="M40 52L33 59L40 66 M56 52L63 59L56 66 M51 50L45 68" strokeWidth={1.8} />
        </g>
        {[27, 33, 39].map((cx) => <circle key={cx} className="f-ink" cx={cx} cy="36" r="1.4" />)}
        <text className="f-ink" x="92" y="52" fontSize="22" fontWeight="600">Shared Chromium core</text>
        <text className="f-muted" x="92" y="76" fontSize="17">maintained by Google</text>

        <text className="f-red" x="420" y="104" fontSize="18" fontWeight="700" textAnchor="middle">Hypothetical change</text>
        <text className="f-muted" x="420" y="128" fontSize="17" textAnchor="middle">at Microsoft’s expense</text>
        <path className="f-none s-red" strokeWidth={1.6} strokeDasharray="3 4" d={`M420 138V${LINE - 16}`} />
        <text className="f-muted" x="220" y={LINE - 20} fontSize="16" textAnchor="middle">last shared version</text>

        <g className="f-none" strokeLinecap="round" strokeLinejoin="round">
          <path className="s-ink" strokeWidth={2.5} d={`M20 ${LINE}H616 M604 ${LINE - 10}L616 ${LINE}L604 ${LINE + 10}`} />
          <path className="s-red" strokeWidth={2.5} strokeDasharray="7 7" d={`M220 ${LINE}C290 ${LINE} 280 ${FORK} 350 ${FORK}H604`} />
          <path className="s-red" strokeWidth={2.5} d={`M604 ${FORK - 10}L616 ${FORK}L604 ${FORK + 10}`} />
        </g>
        {[60, 140, 220, 510, 580].map((cx) => <circle key={cx} className="f-bg s-ink" strokeWidth={2.5} cx={cx} cy={LINE} r="8" />)}
        <rect className="f-bg s-red" strokeWidth={2} strokeDasharray="4 3" x="410" y={LINE - 10} width="20" height="20" transform={`rotate(45 420 ${LINE})`} />
        {[400, 480, 560].map((cx) => <circle key={cx} className="f-bg s-red" strokeWidth={2.5} cx={cx} cy={FORK} r="8" />)}

        <text className="f-muted" x="140" y={LINE + 34} fontSize="17" textAnchor="middle">Microsoft builds Edge on it</text>
        <text className="f-red" x="480" y={FORK - 26} fontSize="19" fontWeight="600" textAnchor="middle">Microsoft can maintain its own fork</text>
        <text className="f-muted" x="480" y={FORK + 36} fontSize="17" textAnchor="middle">independent of Google’s decisions</text>

        <path className="f-none s-red" strokeWidth={2.5} strokeDasharray="7 7" strokeLinecap="round" d="M20 366H64" />
        <text className="f-muted" x="76" y="371" fontSize="16">an available path, not an event</text>
      </svg>
    </Figure>
  );
}
