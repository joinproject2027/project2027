/**
 * The eagle: an eagle with raised wings and a striped shield over a banner reading "E PLURIBUS
 * UNUM", with ribbons curling below. Drawn by hand as strokes after a small engraving, with its
 * cut-off ribbons finished as full curls.
 *
 * The motto matters most. Drawn by birds, a letter needs to be tall for its strokes and gaps to
 * read, so the banner is the biggest thing in the picture, its letters tall and narrow, with room
 * between them and the banner's edges. The eagle above it is smaller than in the engraving, its
 * wings spread wider than they are high, and it's kept to outlines, so it doesn't thin out the birds
 * on the letters. Everything is in a frame about 1000 wide, y down; the flock fits it to the screen.
 */

type Pt = [number, number];

// ---------- drawing helpers ----------

const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 24): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n,
      u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  });

const quad = (p0: Pt, p1: Pt, p2: Pt, n = 20): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n,
      u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  });

/** Points around an ellipse, from angle a0 to a1 in degrees (0 is right, 90 is down). */
const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 16): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  });

/** Joins pieces into one stroke, dropping the repeated point where each piece meets the last. */
const join = (...pieces: Pt[][]): Pt[] => pieces.flatMap((p, i) => (i ? p.slice(1) : p));

const mirror = (stroke: Pt[]): Pt[] => stroke.map(([x, y]): Pt => [1000 - x, y]);

// ---------- the motto's letters ----------
// Single-line capitals in a box one unit tall (y down), as [width, strokes].

const GLYPHS: Record<string, [number, Pt[][]]> = {
  E: [0.52, [[[0.52, 0], [0, 0], [0, 1], [0.52, 1]], [[0, 0.5], [0.44, 0.5]]]],
  P: [0.54, [join([[0, 1], [0, 0], [0.28, 0]], arc(0.28, 0.26, 0.26, 0.26, -90, 90), [[0.28, 0.52], [0, 0.52]])]],
  L: [0.48, [[[0, 0], [0, 1], [0.48, 1]]]],
  U: [0.58, [join([[0, 0], [0, 0.71]], arc(0.29, 0.71, 0.29, 0.29, 180, 0), [[0.58, 0.71], [0.58, 0]])]],
  R: [
    0.56,
    [join([[0, 1], [0, 0], [0.28, 0]], arc(0.28, 0.26, 0.26, 0.26, -90, 90), [[0.28, 0.52], [0, 0.52]]), [[0.26, 0.52], [0.56, 1]]],
  ],
  I: [0, [[[0, 0], [0, 1]]]],
  B: [
    0.56,
    [
      join([[0, 0.48], [0.26, 0.48]], arc(0.26, 0.24, 0.24, 0.24, 90, -90), [[0.26, 0], [0, 0], [0, 1], [0.3, 1]], arc(0.3, 0.74, 0.26, 0.26, 90, -90), [[0.3, 0.48], [0.26, 0.48]]),
    ],
  ],
  S: [0.54, [join(arc(0.27, 0.25, 0.27, 0.25, -20, -270), arc(0.27, 0.75, 0.27, 0.25, -90, 160))]],
  N: [0.6, [[[0, 1], [0, 0], [0.6, 1], [0.6, 0]]]],
  M: [0.72, [[[0, 1], [0, 0], [0.36, 0.72], [0.72, 0], [0.72, 1]]]],
};
// Letters are narrowed to CONDENSE of their drawn width, so tall ones still fit across the screen.
const CONDENSE = 0.86,
  LETTER_GAP = 0.26,
  WORD_GAP = 0.42,
  LETTER_H = 110;
const MOTTO = "E PLURIBUS UNUM";
// The flock spreads its birds evenly along all of a picture's strokes, so each letter is listed
// this many times over: the same two streams, with this many times the birds in them.
const MOTTO_WEIGHT = 4;

const charWidth = (ch: string) => (ch === " " ? WORD_GAP : GLYPHS[ch][0] * CONDENSE);
/** The motto's length, in letter heights. */
const MOTTO_LEN = [...MOTTO].reduce((sum, ch, i, all) => sum + charWidth(ch) + (i < all.length - 1 ? LETTER_GAP : 0), 0);

// ---------- the banner ----------
// It sags in a gentle smile: its middle line is an arc of a big circle whose center is far above.
// It reaches a little past the motto at each end, and its edges sit well clear of the letters.

const BANNER_SAG = 50,
  BANNER_HALF = (MOTTO_LEN * LETTER_H) / 2 + 110,
  BANNER_LOW = 400,
  BAND = 88;
const R = (BANNER_HALF * BANNER_HALF + BANNER_SAG * BANNER_SAG) / (2 * BANNER_SAG);
const CX = 500,
  CY = BANNER_LOW - R;
const PHI_END = Math.asin(BANNER_HALF / R);

/** The point on the banner at angle phi from its middle, offset `off` below its middle line. */
const onBanner = (phi: number, off = 0): Pt => [CX + (R + off) * Math.sin(phi), CY + (R + off) * Math.cos(phi)];

function bannerEdge(off: number): Pt[] {
  const n = 40;
  return Array.from({ length: n + 1 }, (_, i) => onBanner(-PHI_END + (2 * PHI_END * i) / n, off));
}

/** A banner end: its edge, the fold behind it, and the swallowtail, built outward from the end. */
function bannerEnd(side: -1 | 1): Pt[] {
  const phi = side * PHI_END;
  const [px, py] = onBanner(phi);
  // Along the banner, outward, and down across it.
  const out: Pt = [side * Math.cos(phi), -side * Math.sin(phi)],
    down: Pt = [Math.sin(phi), Math.cos(phi)];
  const at = (x: number, y: number): Pt => [px + x * out[0] + y * down[0], py + x * out[1] + y * down[1]];
  const drop = 34,
    tail = 110;
  return [
    at(0, -BAND),
    at(0, BAND),
    at(20, BAND + drop),
    at(tail, BAND + drop),
    at(tail - 34, drop),
    at(tail, -BAND + drop),
    at(0, -BAND + drop),
  ];
}

function motto(): Pt[][] {
  const strokes: Pt[][] = [];
  let x = -MOTTO_LEN / 2;
  for (const ch of MOTTO) {
    const w = charWidth(ch);
    if (ch !== " ") {
      // Each letter stands upright on the curve: its middle sits on the banner's middle line.
      const phi = ((x + w / 2) * LETTER_H) / R;
      const t: Pt = [Math.cos(phi), -Math.sin(phi)],
        n: Pt = [Math.sin(phi), Math.cos(phi)];
      const [px, py] = onBanner(phi);
      for (const s of GLYPHS[ch][1])
        strokes.push(
          s.map(([gx, gy]): Pt => {
            const lx = (gx * CONDENSE - w / 2) * LETTER_H,
              ly = (gy - 0.5) * LETTER_H;
            return [px + lx * t[0] + ly * n[0], py + lx * t[1] + ly * n[1]];
          }),
        );
    }
    x += w + LETTER_GAP;
  }
  return strokes;
}

// ---------- the eagle ----------
// Drawn at engraving proportions with the shield's point at (500, 344), then scaled down (wings
// stretched sideways first) and set on the banner, the shield's point just behind its top edge.

const EAGLE_SCALE = 0.86,
  WING_STRETCH = 1.2;
// The wings' outlines are listed twice over (see MOTTO_WEIGHT), so their feathers have the birds to show.
const WING_WEIGHT = 2;
const placeEagle =
  (stretch: number) =>
  (stroke: Pt[]): Pt[] =>
    stroke.map(([x, y]): Pt => [500 + (x - 500) * stretch * EAGLE_SCALE, BANNER_LOW - BAND + 14 - (344 - y) * EAGLE_SCALE]);

function shield(): Pt[][] {
  const left = join([[440, 168], [440, 250]], quad([440, 250], [442, 318], [500, 344])),
    right = join([[560, 168], [560, 250]], quad([560, 250], [558, 318], [500, 344]));
  const top: Pt[] = [
    [440, 168],
    [560, 168],
  ];
  // Stripes run from the band across the top to the shield's curved bottom.
  const bottomAt = (x: number) => {
    const side = x < 500 ? left : right;
    let best = side[0];
    for (const p of side) if (Math.abs(p[0] - x) < Math.abs(best[0] - x) && p[1] > 250) best = p;
    return best[1];
  };
  const stripes = [462, 484, 516, 538].map((x): Pt[] => [
    [x, 202],
    [x, bottomAt(x)],
  ]);
  return [left, right, top, [[440, 202], [560, 202]], ...stripes, [[500, 202], [500, 344]]];
}

/** The head in profile, facing left: back of the neck, crown, hooked beak, then the throat. */
function head(): Pt[][] {
  const outline = join(
    cubic([528, 168], [534, 130], [530, 94], [508, 76]),
    cubic([508, 76], [488, 62], [458, 70], [446, 88]),
    cubic([446, 88], [436, 96], [420, 100], [413, 116]),
    cubic([413, 116], [408, 128], [416, 136], [424, 132]),
    cubic([424, 132], [426, 124], [438, 120], [452, 120]),
    cubic([452, 120], [460, 128], [464, 146], [470, 168]),
  );
  const eye = arc(474, 96, 8, 7, 0, 360, 14);
  return [outline, eye];
}

const unit = (deg: number): Pt => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
const plus = (p: Pt, d: Pt, k: number): Pt => [p[0] + d[0] * k, p[1] + d[1] * k];

/**
 * The left wing, raised as in the engraving: an arm that rises from the shoulder and arches out to
 * the wrist, with long feathers fanning from it. Their rounded tips make the wing's outer edge, a
 * C-shaped curve from the top back down toward the banner, and the top ones are split deeper, like
 * an eagle's fingered primaries. A row of short coverts runs along the arm.
 */
function wing(): Pt[][] {
  // The arm, from the shoulder up to the wrist; each feather grows from a point along it.
  const arm = cubic([436, 198], [396, 158], [372, 100], [392, 52], 40);
  const along = (t: number) => arm[Math.round(t * (arm.length - 1))];
  // From the wrist down: [where along the arm (1 is the wrist), angle in degrees, length, width].
  const feathers: [number, number, number, number][] = [
    [1, -106, 120, 34],
    [0.87, -128, 156, 36],
    [0.74, -150, 182, 38],
    [0.6, -170, 194, 40],
    [0.46, -188, 190, 40],
    [0.32, -203, 172, 40],
    [0.18, -216, 148, 40],
    [0.04, -227, 118, 38],
  ];
  const PRIMARIES = 4;
  const shaped = feathers.map(([t, a, len, w]) => {
    const base = along(t),
      r = w / 2,
      tip = plus(base, unit(a), len - r);
    return { base, a, len, r, tip };
  });
  const outline: Pt[][] = [arm];
  shaped.forEach((f, i) => {
    // Up the feather's leading side, around its rounded tip, and down into the split before the next.
    outline.push([plus(f.tip, unit(f.a + 90), f.r)], arc(f.tip[0], f.tip[1], f.r, f.r, f.a + 90, f.a - 90, 8));
    const next = shaped[i + 1];
    if (next) {
      const mid: Pt = [(f.base[0] + next.base[0]) / 2, (f.base[1] + next.base[1]) / 2];
      const depth = (i < PRIMARIES ? 0.58 : 0.8) * Math.min(f.len, next.len);
      outline.push([plus(mid, unit((f.a + next.a) / 2), depth)]);
    }
  });
  // The last feather's trailing side runs back in to the body, behind the banner.
  const last = shaped[shaped.length - 1];
  outline.push([plus(last.base, unit(last.a - 90), last.r), [438, 262]]);
  // The coverts: a scalloped row across the feathers' roots, from the shoulder up to the wrist.
  const roots = shaped.map((f) => plus(f.base, unit(f.a), 54)).reverse();
  const coverts = join(
    ...roots.slice(1).map((p, i) => {
      const q = roots[i],
        a = (shaped[shaped.length - 1 - i].a + shaped[shaped.length - 2 - i].a) / 2;
      return quad(q, plus([(q[0] + p[0]) / 2, (q[1] + p[1]) / 2], unit(a), 12), p, 6);
    }),
  );
  return [outline.flat(), coverts];
}

// ---------- the ribbons below ----------
// Drawn hanging from a banner whose bottom edge is at y 452, then moved down to this one's and
// spread out under its ends.

const placeRibbon = (stroke: Pt[]): Pt[] =>
  stroke.map(([x, y]): Pt => [500 + (x - 500) * 1.45, y + BANNER_LOW + BAND - 452 - 6]);

/** A ribbon streaming out from under the middle of the banner and rolling up into a curl. */
function ribbon(): Pt[][] {
  const sweep = cubic([476, 452], [468, 528], [336, 552], [258, 516], 28);
  // The curl continues the sweep's heading (up and left), turning back down and inward.
  const cx = 222,
    cy = 548,
    turns = 1.35,
    n = 60;
  const a0 = Math.atan2(516 - cy, 258 - cx);
  const r0 = Math.hypot(258 - cx, 516 - cy);
  const curl: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n,
      a = a0 - t * turns * Math.PI * 2,
      r = r0 * (1 - 0.7 * t);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
  // The ribbon's other edge, alongside the sweep.
  const width = 22;
  const other = sweep.map((p, i): Pt => {
    const q = sweep[Math.min(i + 1, sweep.length - 1)],
      o = sweep[Math.max(i - 1, 0)];
    const dx = q[0] - o[0],
      dy = q[1] - o[1],
      l = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / l) * width, p[1] + (dx / l) * width];
  });
  return [join(sweep, curl), other];
}

/** How far down the frame the motto's letters reach: on desktop they stay clear of the copy. */
export function mottoBottom(): number {
  return Math.max(...motto().flatMap((stroke) => stroke.map(([, y]) => y)));
}

/** Every stroke of the eagle picture. */
export function eagleStrokes(): Pt[][] {
  const [wingOutline, coverts] = wing().map(placeEagle(WING_STRETCH)),
    leftRibbon = ribbon().map(placeRibbon);
  const letters = motto();
  return [
    ...Array.from({ length: MOTTO_WEIGHT }, () => letters).flat(),
    bannerEdge(-BAND),
    bannerEdge(BAND),
    bannerEnd(-1),
    bannerEnd(1),
    ...[...shield(), ...head()].map(placeEagle(1)),
    ...Array.from({ length: WING_WEIGHT }, () => [wingOutline, mirror(wingOutline)]).flat(),
    coverts,
    mirror(coverts),
    ...leftRibbon,
    ...leftRibbon.map(mirror),
  ];
}
