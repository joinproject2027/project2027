/**
 * The Project 2027 flock: thousands of birds that fly free, then stream along the strokes of a
 * picture (the flag, "We the People", Lady Justice, the map of the US) in two-way lanes.
 *
 * Ported from the "Project 2027 Flock" prototype. It drives FlockHero's markup: startFlock finds
 * the canvas and controls inside `root`. What it returns sends "you" into the flock when the reader
 * joins, and stops the animation, removing every listener and settings row it added.
 */

import usBorders from "./data/us-borders.json";
import ladyJustice from "./data/lady-justice.json";
import weThePeople from "./data/we-the-people.json";
import { blindfoldStrokes } from "./blindfold";
import { eagleStrokes, mottoBottom } from "./eagle";

type Pt = [number, number];
/** A point and a unit heading. */
type Vec4 = [number, number, number, number];
/** A point on a moving picture, and how brightly the cloth is lit there (0 to 1). */
type Projected = [number, number, number];

const rand = Math.random;
const gauss = () => {
  const u = rand() || 1e-9;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
};
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

// ---------- settings ----------
// [key, group, label, min, max, step, default, hint]
const SPEC = [
  ["speed", "g-motion", "Speed", 0.05, 1.5, 0.05, 0.2, "Overall pace of everything."],
  ["flow", "g-map", "Stream speed", 0, 3, 0.05, 0.25, "How fast birds travel along the borders. 0 stops the streams."],
  ["lane", "g-map", "Stream width", 0.2, 3, 0.05, 1.4, "How tightly birds hug each border line."],
  ["hold", "g-map", "Pull onto the borders", 0.2, 3, 0.05, 1.1, "Higher keeps birds locked to their stream."],
  ["loose", "g-map", "Unevenness", 0, 1, 0.05, 0.2, "How much birds bunch up or spread out along the route. 0 spaces them perfectly evenly."],
  ["blocks", "g-map", "State blocks", 0, 1, 0.05, 0, "How solid the states are drawn. 0 leaves them transparent."],
  ["channel", "g-map", "Channel width (px)", 0, 24, 0.5, 9, "The gap carved between the state blocks."],
  ["align", "g-flock", "Alignment", 0, 3, 0.05, 1, "Match the heading of nearby birds."],
  ["separation", "g-flock", "Separation", 0, 3, 0.05, 0.5, "Keep personal space."],
  ["jitter", "g-flock", "Restlessness", 0, 4, 0.05, 1.95, "Random wobble on every bird."],
  ["size", "g-birds", "Bird size", 0.5, 2.5, 0.05, 1, ""],
  ["flap", "g-birds", "Wing beat", 0, 3, 0.05, 0.2, "0 means every bird glides."],
  ["redShare", "g-birds", "Red birds (%)", 0, 20, 0.5, 2, "Applies to birds added from now on."],
  ["rate", "g-join", "New birds per second", 0, 30, 0.5, 4, ""],
  ["max", "g-join", "Maximum birds", 200, 6000, 100, 3400, ""],
  ["start", "g-join", "Starting birds", 100, 5000, 100, 1700, "Used when you restart the flock."],
] as const;

type SettingKey = (typeof SPEC)[number][0];
type Settings = Record<SettingKey, number>;

const DEFAULTS = Object.fromEntries(SPEC.map((s) => [s[0], s[6]])) as Settings;
const STORE_KEY = "p2027-flock-settings-v6";
const fmt = (v: number, step: number) =>
  step >= 1 ? String(Math.round(v)) : step >= 0.1 ? v.toFixed(1) : v.toFixed(2);

// ---------- map data ----------
// Every border in the US (state lines, coasts, the national border) as junction-to-junction arcs,
// plus each state's outline for the blocks. From US Census shapes via us-atlas, Albers USA projection,
// simplified to ~4px steps. Flat [x0, y0, x1, y1, ...] lists in a 937 x 585 frame.
const DW = 937,
  DH = 585;
const toPts = (flat: number[]): Pt[] => {
  const r: Pt[] = [];
  for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]);
  return r;
};
const EDGES_D = usBorders.edges.map(toPts);
const FILLS_D = usBorders.fills.map((rs) => rs.map(toPts));

// ---------- pictures ----------
// Each picture is a set of strokes. The birds fly every stroke once in each direction (an Euler tour of
// the doubled strokes), each pass on its own side, so a picture is drawn as two-way streams of birds.
//
// Lady Justice is traced from a bronze statuette photo on Wikimedia Commons (File:1660_blk_19329_zoom.png):
// the silhouette plus only the longest edges of the bronze (short folds and specks dropped), skeletonized
// and simplified. The statuette has no blindfold, so hers is drawn on by hand, in blindfold.ts.
//
// "We the People" is traced from the engrossed Constitution (public domain) as shared on Wikimedia Commons:
// the heavy pen strokes plus the hairlines attached to them, reduced to center lines. The P's bowl and the
// hairline joining it to the downstroke are too faint in the scan to trace, so they are placed by hand.
//
// The eagle over "E pluribus unum" is drawn by hand, in eagle.ts.

// ---------- the flag, in 3D ----------
// The flag is laid out flat in its own units (19:10, the official proportions), then every frame it is
// billowed by a few slow traveling waves, turned away from the viewer, tilted as if seen from below,
// and drawn in perspective. The birds follow the stripes, stars, edges and pole as the cloth moves.
const FW = 190,
  FH = 100;
function flagParamStrokes(): Pt[][] {
  const S: Pt[][] = [],
    sh = FH / 13,
    cw = 0.4 * FW,
    ch = 7 * sh;
  const line = (x0: number, y0: number, x1: number, y1: number): Pt[] => {
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3)),
      p: Pt[] = [];
    for (let i = 0; i <= n; i++) p.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
    return p;
  };
  S.push([
    ...line(0, 0, FW, 0),
    ...line(FW, 0, FW, FH).slice(1),
    ...line(FW, FH, 0, FH).slice(1),
    ...line(0, FH, 0, 0).slice(1),
  ]);
  for (let i = 1; i < 13; i++) S.push(line(i < 7 ? cw : 0, i * sh, FW, i * sh));
  S.push(line(cw, 0, cw, ch));
  for (let r = 0; r < 9; r++) {
    const six = r % 2 === 0;
    for (let j = 0; j < (six ? 6 : 5); j++) {
      const x = (cw * (six ? 1 + 2 * j : 2 + 2 * j)) / 12,
        y = (ch * (r + 1)) / 10,
        R = sh * 0.5,
        star: Pt[] = [];
      for (let k = 0; k <= 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5,
          rr = k % 2 ? R * 0.4 : R;
        star.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
      }
      S.push(star);
    }
  }
  S.push(line(-2.5, -6, -2.5, 175));
  return S;
}

// Cloth: waves grow from the pole to the fly end and run diagonally, slowly.
function flag3d(u: number, v: number, T: number): Projected {
  const r = clamp(u / FW, 0, 1),
    q = v / FH;
  // Two and a half slow diagonal swells, plus a smaller faster ripple, growing toward the fly end.
  const A = 20,
    grow = Math.pow(r, 0.9);
  const p1 = 8.6 * r - T + 1.7 * q,
    p2 = 15 * r - 1.55 * T + 2.6 * q + 1.3;
  const z = grow * (A * Math.sin(p1) + 5.5 * Math.sin(p2)) + 5 * r * Math.sin(2.4 * q - 0.6 * T);
  // The cloth streams up and away from the pole, and bunches up a little where it folds.
  const x = u - 8 * r * r - 2.2 * grow * Math.cos(p1);
  const y = v - 26 * r + 4 * r * Math.sin(3.4 * r - 0.8 * T + 1.2 * q);
  // Turn the flag slightly away, look up at it from below, then perspective and a leaning pole.
  const cy = Math.cos(-0.2),
    sy = Math.sin(-0.2),
    cp = Math.cos(0.22),
    sp = Math.sin(0.22);
  const X = x * cy + z * sy,
    Z1 = -x * sy + z * cy;
  const Y = y * cp - Z1 * sp,
    Z = y * sp + Z1 * cp;
  const d = 460,
    f = d / (d + Z + 40);
  const px = X * f,
    py = Y * f,
    cr = Math.cos(0.08),
    sr = Math.sin(0.08);
  // Light from the upper left: shade by how the cloth faces it.
  const dz = grow * (((A * 8.6) / FW) * Math.cos(p1) + ((5.5 * 15) / FW) * Math.cos(p2));
  return [px * cr - py * sr, px * sr + py * cr, clamp(0.55 - dz * 1.25, 0, 1)];
}

interface PictureDef {
  name: "flag" | "people" | "eagle" | "justice" | "map";
  strokes: Pt[][];
  /** On phones, draw these instead (We the People goes onto two lines). */
  mobileStrokes?: Pt[][];
  /** Animated pictures place each flat (u, v) point on screen at time T. */
  param?: (u: number, v: number, T: number) => Projected;
  fill: number;
  /** Size the picture by its first `sizeBy` strokes only. */
  sizeBy?: number;
  /** How far down the picture the birds start to dissolve, as a fraction of its height. */
  fade?: number;
  /** Scales how far apart the two streams along each stroke fly: below 1 keeps lettering crisp. */
  lane?: number;
  /**
   * On desktop, everything above this line (in the picture's own units) has to clear the copy: if
   * the picture's box would put it lower, the picture moves up, and then shrinks if it must.
   */
  keepAbove?: number;
  minLoop?: number;
}

interface Picture extends PictureDef {
  w: number;
  h: number;
  /** Center of an animated picture, in its own units. */
  ox: number;
  oy: number;
  tours: Pt[][];
}

interface Directed {
  e: number;
  fwd: boolean;
  from: string;
  to: string;
  sx: number;
  sy: number;
  ex: number;
  ey: number;
}

function eulerTours(strokes: Pt[][], minLoop: number): Pt[][] {
  const key = (p: Pt) => p[0].toFixed(2) + "," + p[1].toFixed(2);
  const dir: Directed[] = [],
    out = new Map<string, number[]>();
  strokes.forEach((pts, e) => {
    for (const fwd of [true, false]) {
      const p = fwd ? pts : pts.slice().reverse();
      const from = key(p[0]),
        to = key(p[p.length - 1]);
      const a0 = p[0],
        a1 = p[Math.min(2, p.length - 1)],
        z0 = p[Math.max(0, p.length - 3)],
        z1 = p[p.length - 1];
      const sd = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) || 1,
        ed = Math.hypot(z1[0] - z0[0], z1[1] - z0[1]) || 1;
      dir.push({
        e,
        fwd,
        from,
        to,
        sx: (a1[0] - a0[0]) / sd,
        sy: (a1[1] - a0[1]) / sd,
        ex: (z1[0] - z0[0]) / ed,
        ey: (z1[1] - z0[1]) / ed,
      });
      const exits = out.get(from) ?? [];
      exits.push(dir.length - 1);
      out.set(from, exits);
    }
  });
  const used = Array.from({ length: dir.length }, () => false);
  // At a junction, take the unused exit that best continues the current heading, and avoid doubling straight back.
  const choose = (node: string, via: number) => {
    let best = -1,
      score = -1e9;
    for (const di of out.get(node) ?? []) {
      if (used[di]) continue;
      let sc = via >= 0 ? dir[via].ex * dir[di].sx + dir[via].ey * dir[di].sy : 0;
      if (via >= 0 && dir[di].e === dir[via].e) sc -= 3;
      if (sc > score) {
        score = sc;
        best = di;
      }
    }
    return best;
  };
  const tours: Pt[][] = [];
  for (let d0 = 0; d0 < dir.length; d0++) {
    if (used[d0]) continue;
    const stack: [string, number][] = [[dir[d0].from, -1]],
      circuit: number[] = [];
    while (stack.length) {
      const [v, via] = stack[stack.length - 1];
      const nx = choose(v, via);
      if (nx >= 0) {
        used[nx] = true;
        stack.push([dir[nx].to, nx]);
      } else {
        stack.pop();
        if (via >= 0) circuit.push(via);
      }
    }
    circuit.reverse();
    const pts: Pt[] = [];
    for (const di of circuit) {
      const p = dir[di].fwd ? strokes[dir[di].e] : strokes[dir[di].e].slice().reverse();
      for (let i = pts.length ? 1 : 0; i < p.length; i++) pts.push(p[i]);
    }
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (len > minLoop && pts.length > 1) tours.push(pts);
  }
  return tours;
}

type Box = [centerX: number, centerY: number, width: number, height: number];

/** Screens this wide and up get the desktop layout (the CSS switches at the same width). */
const DESKTOP_MIN = 900;
/** For a picture's `keepAbove`: how far above the copy it stays (its backdrop reaches about 40px
    up), and how close to the top of the screen it may go to make room. On phones the whole picture
    stays above the copy, and below the header. */
const COPY_CLEARANCE = 36,
  TOP_MARGIN = 16,
  MOBILE_COPY_CLEARANCE = 24;

/**
 * Where each picture sits: [center x, center y, width, height], each a fraction of the screen, so
 * 0.5 is the middle and 1 is the full width or height. A picture scales to fit inside its box
 * without stretching, so whichever of its width or height runs out first sets its size; `fill`
 * below then shrinks it a touch. The flag is sized by its cloth alone, so its pole runs past the box.
 *
 * Desktop is DESKTOP_MIN wide and up, where the copy sits in the bottom left. Mobile is anything
 * narrower, where the copy starts about halfway down the screen (40vh below the header,
 * `.hero` in flock-hero.css); the wide pictures sit low in the space above it.
 */
const LAYOUT: Record<PictureDef["name"], { desktop: Box; mobile: Box }> = {
  // Right of center, so the pole and the canton stay clear of the copy. On phones it's narrower
  // than the screen and nudged right, so the pole, which leans left as it falls, stays on screen.
  flag: { desktop: [0.57, 0.41, 0.75, 0.71], mobile: [0.53, 0.24, 0.8, 0.34] },
  people: { desktop: [0.5, 0.52, 0.92, 0.84], mobile: [0.5, 0.27, 0.9, 0.32] },
  // The motto is the part that has to read, so on desktop it runs nearly the width of the screen,
  // high enough to clear the copy.
  eagle: { desktop: [0.5, 0.42, 0.96, 0.66], mobile: [0.5, 0.27, 0.94, 0.34] },
  // Zoomed in on her scales and blindfold: her box is taller than the screen, so about the bottom
  // third of her runs off it. She sits right of center so the scales clear the copy.
  justice: { desktop: [0.64, 0.8, 0.9, 1.4], mobile: [0.5, 0.25, 0.94, 0.34] },
  map: { desktop: [0.5, 0.52, 0.92, 0.84], mobile: [0.5, 0.27, 0.94, 0.34] },
};

/**
 * "We the People" on two lines, for phones, where one line would make the lettering tiny: "People"
 * moves down under "We the", and both lines are centered.
 */
function twoLinePeople(strokes: Pt[][]): Pt[][] {
  // In the lettering's own units: the gap between the "e" of "the" and the "P", and how far down
  // the second line goes (close, as in the original hand).
  const SPLIT_X = 700,
    LINE_GAP = 240;
  const midX = (s: Pt[]) => s.reduce((sum, p) => sum + p[0], 0) / s.length;
  const centerX = (lines: Pt[][]) => {
    let x0 = Infinity,
      x1 = -Infinity;
    for (const s of lines)
      for (const [x] of s) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
      }
    return (x0 + x1) / 2;
  };
  const first = strokes.filter((s) => midX(s) < SPLIT_X),
    second = strokes.filter((s) => midX(s) >= SPLIT_X);
  const dx = centerX(first) - centerX(second);
  return [...first, ...second.map((s) => s.map(([x, y]): Pt => [x + dx, y + LINE_GAP]))];
}

const PEOPLE_STROKES = weThePeople.map(toPts);

const PICTURE_DEFS: PictureDef[] = [
  { name: "flag", strokes: flagParamStrokes(), param: flag3d, fill: 1, sizeBy: 64 },
  { name: "map", strokes: EDGES_D, minLoop: 40, fill: 0.86 },
  { name: "eagle", strokes: eagleStrokes(), fill: 0.96, minLoop: 10, lane: 0.7, keepAbove: mottoBottom() },
  { name: "justice", strokes: [...ladyJustice.map(toPts), ...blindfoldStrokes()], fill: 1, fade: 0.55, minLoop: 10 },
  { name: "people", strokes: PEOPLE_STROKES, mobileStrokes: twoLinePeople(PEOPLE_STROKES), fill: 0.92, minLoop: 10 },
];

function toPicture(pic: PictureDef): Picture {
  // Normalize every picture to start at 0,0 so it can be fitted into the same box.
  let x0 = 1e9,
    y0 = 1e9,
    x1 = -1e9,
    y1 = -1e9;
  for (const s of pic.strokes)
    for (const [x, y] of s) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  if (pic.name === "map") {
    x0 = 0;
    y0 = 0;
    x1 = DW;
    y1 = DH;
  }
  const param = pic.param;
  if (param) {
    // Animated pictures keep their own coordinates; their size comes from how they look projected.
    let bx0 = 1e9,
      by0 = 1e9,
      bx1 = -1e9,
      by1 = -1e9;
    // Size by the cloth alone, so the pole can run off the bottom of the screen.
    const sized = pic.sizeBy ? pic.strokes.slice(0, pic.sizeBy) : pic.strokes;
    for (let T = 0; T < 6.3; T += 0.7)
      for (const st of sized)
        for (const [u, v] of st) {
          const q = param(u, v, T);
          bx0 = Math.min(bx0, q[0]);
          by0 = Math.min(by0, q[1]);
          bx1 = Math.max(bx1, q[0]);
          by1 = Math.max(by1, q[1]);
        }
    return {
      ...pic,
      w: bx1 - bx0,
      h: by1 - by0,
      ox: (bx0 + bx1) / 2,
      oy: (by0 + by1) / 2,
      tours: eulerTours(pic.strokes, pic.minLoop || 0),
    };
  }
  const strokes = pic.strokes.map((s) => s.map(([x, y]): Pt => [x - x0, y - y0]));
  const keepAbove = pic.keepAbove === undefined ? undefined : pic.keepAbove - y0;
  return { ...pic, strokes, keepAbove, w: x1 - x0, h: y1 - y0, ox: 0, oy: 0, tours: eulerTours(strokes, pic.minLoop || 0) };
}

const PICTURES = PICTURE_DEFS.map(toPicture);
/** The pictures as phones draw them: the same, except where a picture has `mobileStrokes`. */
const MOBILE_PICTURES = PICTURE_DEFS.map((pic, i) =>
  pic.mobileStrokes ? toPicture({ ...pic, strokes: pic.mobileStrokes }) : PICTURES[i],
);

// ---------- the running flock ----------

interface Tour {
  p: Pt[];
  cum: number[];
  len: number;
}

/** A picture fitted to the screen. */
interface Net {
  name: PictureDef["name"];
  tours: Tour[];
  lens: number[];
  starts: number[];
  total: number;
  s: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  fade: number;
  lane: number;
  top: number;
  bottom: number;
  project?: (u: number, v: number) => Projected;
  tiles?: Path2D;
  channels?: Path2D;
}

interface Bird {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ang: number;
  /** Wing beat phase. */
  ph: number;
  size: number;
  /** Index into ALPHAS: nearer birds are darker. */
  alpha: number;
  red: boolean;
  joining: boolean;
  /** The loop the bird's slot is on, and how far along it. */
  c: number;
  u: number;
  jit: number;
  lane: number;
  /** How lit the flag is where the bird flies. */
  shade: number;
  nearC: number;
  nearU: number;
  near: number;
}

type Mode = "auto" | "us" | "free";

const PERCEPTION = 16,
  SEP_DIST = 5.5,
  CELL = 16;
// Auto: a picture holds for HOLD_MS once it has fully formed, then the flock flies free for
// FREE_MS before gathering into the next one. A picture counts as formed once it stops getting
// tighter: when the farthest tenth of the birds haven't closed in on their places by more than
// SETTLE_GAIN for SETTLE_MS. (The flag's cloth keeps moving, so its birds never sit exactly in
// place; this catches that as well as stragglers still arriving.) If it hasn't settled after
// FORM_TIMEOUT_MS, it counts anyway, so the cycle can't stall.
const HOLD_MS = 20000,
  FREE_MS = 14000,
  SETTLE_GAIN = 0.05,
  SETTLE_MS = 1500,
  FORM_TIMEOUT_MS = 15000;
// Gathering: whenever the flock starts to form a picture (the first one, as the page opens, and every
// one after), it rushes into it. The rush speeds everything up RUSH times and eases off over
// RUSH_MS, and the boost keeps things a little faster than usual until the flock has settled.
const RUSH = 3,
  RUSH_MS = 2500,
  BOOST = 1.7,
  BOOST_MS = 16000;
// Intro: the birds start scattered across the middle of the screen and rush into the first picture.
// How far the starting cloud spreads from the middle of the screen: one standard deviation, as a
// fraction of the screen's width and height.
const INTRO_SPREAD = 0.2;
const ALPHAS = [0.45, 0.7, 0.95];
/** Dark birds on a light page read thinner than light birds on a dark one, so in light mode
    they're drawn darker and a touch bigger, with a narrower range of shades. (The flag shades its
    birds by how the waving cloth catches the light, and about a third land in the faintest.) */
const LIGHT_ALPHAS = [0.8, 0.92, 1],
  LIGHT_SIZE = 1.3;
/** Whether a #rrggbb color is nearer white than black. Anything else counts as dark. */
function isLightColor(color: string) {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 128;
}
// "You": the bird that joins when the reader clicks Join. It's bigger than the rest, and draws a
// trail, a pulsing ring and a label on the way. It flies an arc to its place in the picture: the
// path bows up (YOU_CURVE, as a share of the distance), and the flight takes YOU_MS plus YOU_MS_PER_PX
// for each pixel of it, between YOU_MIN_MS and YOU_MAX_MS. If it somehow hasn't landed a while after
// that, the join counts anyway.
const YOU_SIZE = 2.2,
  YOU_CURVE = 0.35,
  YOU_MS = 1000,
  YOU_MS_PER_PX = 1.8,
  YOU_MIN_MS = 1600,
  YOU_MAX_MS = 2800,
  YOU_TRAIL = 26,
  YOU_LABEL_MS = 7000;

/** A running flock. */
export interface Flock {
  /** Stops the animation and removes everything the flock added to the page. */
  stop(): void;
  /** Sends "you" from the join button into the picture; resolves once it's in its place. */
  join(): Promise<void>;
}

export function startFlock(root: HTMLElement): Flock {
  const $ = <T extends Element = HTMLElement>(selector: string): T => {
    const el = root.querySelector<T>(selector);
    if (!el) throw new Error(`The flock needs ${selector} in its markup`);
    return el;
  };
  const canvas = $<HTMLCanvasElement>("#sky");
  // "You" is drawn on a layer of its own, above the copy, so it shows the whole way from the button.
  const youCanvas = $<HTMLCanvasElement>("#you-layer");
  const context = canvas.getContext("2d"),
    youContext = youCanvas.getContext("2d");
  if (!context || !youContext) return { stop: () => {}, join: () => Promise.resolve() };
  const ctx: CanvasRenderingContext2D = context,
    yctx: CanvasRenderingContext2D = youContext;
  // New birds fly out of the join button, or from the calls to action once it's gone (after you've
  // joined, new birds can still come in, at #tune).
  const ctaRow = $(".cta-row");
  const spawnRect = () => (root.querySelector("#join") ?? ctaRow).getBoundingClientRect();
  const streamBtn = $<HTMLButtonElement>("#stream");
  const pauseBtn = $<HTMLButtonElement>("#pause");
  const statusEl = $("#status");
  const modeBtns: Record<Mode, HTMLButtonElement> = {
    auto: $<HTMLButtonElement>("#mode-auto"),
    us: $<HTMLButtonElement>("#mode-us"),
    free: $<HTMLButtonElement>("#mode-free"),
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Every listener goes through `on`, so stopping removes them all at once.
  const abort = new AbortController();
  const on = (target: EventTarget, type: string, fn: () => void) =>
    target.addEventListener(type, fn, { signal: abort.signal });

  // ---------- settings ----------
  let P: Settings = { ...DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved) P = { ...DEFAULTS, ...saved };
  } catch {}
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(P));
    } catch {}
  }

  const inputs = {} as Record<SettingKey, { inp: HTMLInputElement; out: HTMLOutputElement; step: number }>;
  const settingRows: HTMLElement[] = [];
  for (const [key, group, label, min, max, step, , hint] of SPEC) {
    const row = document.createElement("div");
    row.className = "row";
    const id = "set-" + key;
    const lab = document.createElement("label");
    lab.htmlFor = id;
    lab.textContent = label;
    const out = document.createElement("output");
    out.htmlFor.add(id);
    const inp = document.createElement("input");
    inp.type = "range";
    inp.id = id;
    inp.min = String(min);
    inp.max = String(max);
    inp.step = String(step);
    inp.value = String(P[key]);
    out.textContent = fmt(Number(P[key]), step);
    on(inp, "input", () => {
      P[key] = Number(inp.value);
      out.textContent = fmt(P[key], step);
      save();
      onSetting(key);
    });
    // appendChild rather than append: Cloudflare's worker types replace the DOM's Element.append.
    row.appendChild(lab);
    row.appendChild(out);
    row.appendChild(inp);
    if (hint) {
      const h = document.createElement("span");
      h.className = "hint";
      h.textContent = hint;
      row.appendChild(h);
    }
    $("#" + group).appendChild(row);
    settingRows.push(row);
    inputs[key] = { inp, out, step };
  }
  function syncInputs() {
    for (const k of Object.keys(inputs) as SettingKey[]) {
      inputs[k].inp.value = String(P[k]);
      inputs[k].out.textContent = fmt(Number(P[k]), inputs[k].step);
    }
  }

  // ---------- state ----------
  let W = 0,
    H = 0,
    dpr = 1;
  let net!: Net;
  let birds: Bird[] = [];
  let mode: Mode = "auto",
    paused = false,
    phase: "free" | "us" = "free",
    phaseStart = 0,
    formedAt = 0,
    formW = 0;
  // While a picture forms: how far the farthest tenth of the birds are from their places (the
  // tightest seen so far, and when it last got tighter).
  let tightest = Infinity,
    tightestAt = 0;
  const gaps: number[] = [];
  /** When the flock last started to gather into a picture, for the rush. */
  let rushAt = 0;
  let cycle = true; // true: rotate through the pictures (the default); false: hold the chosen one
  let streaming = false,
    lastSpawn = 0;
  let you: Bird | null = null,
    youSince = 0,
    youTrail: Pt[] = [],
    // The flight: where it starts, the point its arc bows toward, and how long it takes.
    youFrom: Pt = [0, 0],
    youBow: Pt = [0, 0],
    youMs = YOU_MIN_MS,
    youJoined: Promise<void> | null = null,
    youLanded: (() => void) | null = null;
  const timers: number[] = [];
  let colors = { bg: "", ink: "", red: "", tile: "", mono: "" };
  let alphas = ALPHAS,
    themeSize = 1;

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    const g = (n: string) => cs.getPropertyValue(n).trim();
    colors = { bg: g("--bg"), ink: g("--ink"), red: g("--red"), tile: g("--tile"), mono: g("--mono") };
    const light = isLightColor(colors.bg);
    alphas = light ? LIGHT_ALPHAS : ALPHAS;
    themeSize = light ? LIGHT_SIZE : 1;
  }

  let pics: Net[] = [],
    picIndex = 0,
    waveT = 0;
  /** How big birds are drawn, set from the map's scale so they shrink with the pictures on small
      screens. Applied as they're drawn, so a resize resizes the whole flock. */
  let birdScale = 1;
  let layoutNow: "desktop" | "mobile" | undefined;
  // Where a picture's `keepAbove` line would land below `limit` (the copy's top, less some room for
  // its backdrop), moves the picture up, as far as keeping its top at `top` allows, then shrinks it.
  // Takes and returns the picture's center y and scale.
  function clearCopy(line: number, h: number, cy: number, s: number, limit: number, top: number): [number, number] {
    const lineAt = (c: number, k: number) => c + (line - h / 2) * k;
    if (lineAt(cy, s) <= limit) return [cy, s];
    cy = Math.max(limit - (line - h / 2) * s, top + (h / 2) * s);
    if (lineAt(cy, s) <= limit) return [cy, s];
    s = Math.max(limit - top, 0) / line;
    return [top + (h / 2) * s, s];
  }

  function buildNetwork() {
    const layout = W >= DESKTOP_MIN ? "desktop" : "mobile";
    const copyTop = root.querySelector(".copy")?.getBoundingClientRect().top;
    // Phones anchor the copy to the bottom of the screen, so on a short one it rides up into the
    // picture: there the whole picture moves up, between the header and the copy, and shrinks to fit.
    const headerBottom = root.querySelector("header.top")?.getBoundingClientRect().bottom ?? 0;
    pics = (layout === "desktop" ? PICTURES : MOBILE_PICTURES).map((pic) => {
      const box = LAYOUT[pic.name][layout];
      const cx = W * box[0],
        bW = W * box[2],
        bH = H * box[3];
      let cy = H * box[1],
        s = Math.min(bW / pic.w, bH / pic.h) * pic.fill;
      if (copyTop !== undefined) {
        if (layout === "mobile") {
          // Down to half size: past that, the picture is too small to read, so it may as well sit
          // partly behind the copy.
          const s0 = s;
          [cy, s] = clearCopy(pic.h, pic.h, cy, s, copyTop - MOBILE_COPY_CLEARANCE, headerBottom + TOP_MARGIN);
          if (s < s0 / 2) {
            s = s0 / 2;
            cy = headerBottom + TOP_MARGIN + (pic.h / 2) * s;
          }
        }
        else if (pic.keepAbove !== undefined)
          [cy, s] = clearCopy(pic.keepAbove, pic.h, cy, s, copyTop - COPY_CLEARANCE, TOP_MARGIN);
      }
      const X = (x: number) => cx + (x - pic.w / 2) * s,
        Y = (y: number) => cy + (y - pic.h / 2) * s;
      const tours = pic.tours.map((pts): Tour => {
        const p = pic.param ? pts : pts.map((q): Pt => [X(q[0]), Y(q[1])]);
        const cum = [0];
        for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
        return { p, cum, len: cum[cum.length - 1] };
      });
      const lens = tours.map((t) => t.len),
        starts: number[] = [];
      let acc = 0;
      for (const L of lens) {
        starts.push(acc);
        acc += L;
      }
      const out: Net = {
        name: pic.name,
        tours,
        lens,
        starts,
        total: acc,
        s,
        cx,
        cy,
        rx: bW / 2,
        ry: bH / 2,
        fade: pic.fade || 0,
        lane: pic.lane ?? 1,
        top: Y(0),
        bottom: Y(pic.h),
      };
      const param = pic.param;
      if (param)
        out.project = (u, v) => {
          const q = param(u, v, waveT);
          return [cx + (q[0] - pic.ox) * s, cy + (q[1] - pic.oy) * s, q[2]];
        };
      if (pic.name === "map") {
        const tiles = new Path2D(),
          channels = new Path2D();
        for (const rs of FILLS_D)
          for (const r of rs) {
            r.forEach((q, i) => (i ? tiles.lineTo(X(q[0]), Y(q[1])) : tiles.moveTo(X(q[0]), Y(q[1]))));
            tiles.closePath();
          }
        for (const pts of EDGES_D)
          pts.forEach((q, i) => (i ? channels.lineTo(X(q[0]), Y(q[1])) : channels.moveTo(X(q[0]), Y(q[1]))));
        out.tiles = tiles;
        out.channels = channels;
      }
      return out;
    });
    const map = pics.find((p) => p.name === "map");
    birdScale = clamp((map ? map.s : 1) * 1.15, 0.4, 1.25);
    net = pics[picIndex];
    // A picture can be drawn with different loops on phones (We the People), so when the layout
    // switches, hand out the slots again.
    const switched = layoutNow !== undefined && layout !== layoutNow;
    layoutNow = layout;
    if (switched && birds.length) reslot();
  }

  // Position and direction at distance d around a loop.
  function tourPoint(t: Tour, d: number): Vec4 {
    const cum = t.cum,
      n = cum.length;
    d = ((d % t.len) + t.len) % t.len;
    let lo = 0,
      hi = n - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cum[mid] <= d) lo = mid;
      else hi = mid - 1;
    }
    const a = t.p[lo],
      c = t.p[lo + 1],
      sl = cum[lo + 1] - cum[lo] || 1,
      f = (d - cum[lo]) / sl;
    return [a[0] + (c[0] - a[0]) * f, a[1] + (c[1] - a[1]) * f, (c[0] - a[0]) / sl, (c[1] - a[1]) / sl];
  }

  // Every bird has a slot. Slots are spaced evenly over all of the picture's strokes, and each loop slides forward.
  let travelled = 0,
    loopShift: number[] = [];
  function loopAt(V: number) {
    const st = net.starts;
    let lo = 0,
      hi = st.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (st[mid] <= V) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
  function placeAll() {
    const n = birds.length,
      T = net.total;
    birds.forEach((b, i) => {
      const V = (((((i + 0.5 + b.jit * P.loose) / n) * T) % T) + T) % T;
      const c = loopAt(V);
      b.c = c;
      b.u = V - net.starts[c] + travelled + (loopShift[c] || 0);
    });
  }

  // Points along the picture's loops, as [screen x, screen y, loop, distance along it].
  function loopSamples() {
    let count = 0;
    for (const t of net.tours) count += t.p.length;
    const stride = Math.max(1, Math.ceil(count / 2500));
    const samples: [number, number, number, number][] = [];
    net.tours.forEach((t, c) => {
      for (let i = 0; i < t.p.length; i += stride) {
        const sp = net.project ? net.project(t.p[i][0], t.p[i][1]) : t.p[i];
        samples.push([sp[0], sp[1], c, t.cum[i]]);
      }
    });
    return samples;
  }
  function nearestSample(samples: [number, number, number, number][], x: number, y: number) {
    let best = 1e18,
      bs = samples[0];
    for (const sm of samples) {
      const dx = sm[0] - x,
        dy = sm[1] - y,
        d = dx * dx + dy * dy;
      if (d < best) {
        best = d;
        bs = sm;
      }
    }
    return bs;
  }

  // Before a picture forms, hand out slots by where birds already are, so each one has only a short way to go.
  function reslot() {
    loopShift = net.tours.map(() => 0);
    const samples = loopSamples();
    for (const b of birds) {
      const bs = nearestSample(samples, b.x, b.y);
      b.nearC = bs[2];
      b.nearU = bs[3];
      b.near = net.starts[bs[2]] + bs[3];
    }
    birds.sort((a, b) => a.near - b.near);
    const n = birds.length,
      T = net.total,
      sx = net.tours.map(() => 0),
      sy = net.tours.map(() => 0);
    birds.forEach((b, i) => {
      const V = ((i + 0.5) / n) * T,
        c = loopAt(V);
      if (c !== b.nearC) return;
      const L = net.lens[c],
        a = ((b.nearU - (V - net.starts[c]) - travelled) / L) * Math.PI * 2;
      sx[c] += Math.cos(a);
      sy[c] += Math.sin(a);
    });
    loopShift = net.tours.map((_, c) => (sx[c] || sy[c] ? (Math.atan2(sy[c], sx[c]) / (Math.PI * 2)) * net.lens[c] : 0));
    placeAll();
  }

  function showPicture(i: number) {
    picIndex = (i + pics.length) % pics.length;
    net = pics[picIndex];
    startForming(performance.now());
    reslot();
  }

  function laneW() {
    return 3.2 * P.lane * birdScale * net.lane;
  }

  // The target sits a little to the right of travel, so the two passes over each stroke form two lanes.
  function targetOf(b: Bird, ahead: number): Vec4 {
    let q = tourPoint(net.tours[b.c], b.u + ahead);
    if (net.project) {
      // Map the point on the flat flag onto the moving cloth; the heading comes from a step along the stroke.
      const a = net.project(q[0], q[1]),
        c = net.project(q[0] + q[2] * 0.6, q[1] + q[3] * 0.6);
      const tx = c[0] - a[0],
        ty = c[1] - a[1],
        l = Math.hypot(tx, ty) || 1;
      b.shade = a[2];
      q = [a[0], a[1], tx / l, ty / l];
    }
    const off = b.lane * laneW();
    return [q[0] - q[3] * off, q[1] + q[2] * off, q[2], q[3]];
  }

  function makeBird(x: number, y: number, vx: number, vy: number, isRed: boolean, joining: boolean) {
    const depth = rand();
    const b: Bird = {
      x,
      y,
      vx,
      vy,
      ang: Math.atan2(vy, vx),
      ph: rand() * Math.PI * 2,
      size: 1.7 + depth * 1.1,
      alpha: depth < 0.3 ? 0 : depth < 0.65 ? 1 : 2,
      red: isRed,
      joining,
      c: 0,
      u: 0,
      jit: clamp(gauss() * 0.35, -0.9, 0.9),
      lane: clamp(0.65 + gauss() * 0.22, 0.25, 1.1),
      shade: 1,
      nearC: 0,
      nearU: 0,
      near: 0,
    };
    birds.push(b);
    return b;
  }

  function settle(b: Bird) {
    const t = targetOf(b, 0);
    b.x = t[0];
    b.y = t[1];
    b.vx = t[2];
    b.vy = t[3];
    b.ang = Math.atan2(b.vy, b.vx);
    b.joining = false;
  }

  function populate() {
    birds = [];
    you = null;
    youTrail = [];
    loopShift = [];
    net = pics[picIndex];
    const n = Math.round(P.start);
    for (let i = 0; i < n; i++) makeBird(0, 0, 0, 0, rand() * 100 < P.redShare, false);
    placeAll();
    birds.forEach(settle);
  }

  function spawnFromButton(isYou: boolean) {
    if (birds.length >= P.max && !isYou) return null;
    const r = spawnRect();
    const x = r.right - 8 + gauss() * 4,
      y = r.top + r.height / 2 + gauss() * 6;
    const b = makeBird(x, y, 2.2 + rand() * 1.2, -0.4 - rand() * 1.4, isYou || rand() * 100 < P.redShare * 2.5, true);
    if (isYou) {
      b.size *= YOU_SIZE;
      b.alpha = 2;
      you = b;
      youSince = performance.now();
      youTrail = [];
      slotNearMiddle(b);
    }
    placeAll();
    if (isYou) planFlight(b);
    if (reduce || paused) settle(b);
    return b;
  }

  // Plans "you"'s arc: from the button toward its place, bowing up and out to one side.
  function planFlight(b: Bird) {
    const [tx, ty] = targetOf(b, 0);
    const dx = tx - b.x,
      dy = ty - b.y,
      dist = Math.hypot(dx, dy) || 1;
    // Of the two directions square to the flight, take the one that points up.
    let nx = dy / dist,
      ny = -dx / dist;
    if (ny > 0) [nx, ny] = [-nx, -ny];
    youFrom = [b.x, b.y];
    youBow = [b.x + dx / 2 + nx * dist * YOU_CURVE, b.y + dy / 2 + ny * dist * YOU_CURVE];
    youMs = clamp(YOU_MS + dist * YOU_MS_PER_PX, YOU_MIN_MS, YOU_MAX_MS);
  }

  // A bird's slot comes from its place in `birds` (see placeAll), and a new bird's is at the end,
  // which can be anywhere, even off screen (the end of the flag's pole). So "you" moves to the
  // place in the list whose slot is, right now, the closest point of the picture to its middle.
  function slotNearMiddle(b: Bird) {
    const [, , c, along] = nearestSample(loopSamples(), net.cx, net.cy);
    const L = net.lens[c];
    const V = net.starts[c] + ((((along - travelled - (loopShift[c] || 0)) % L) + L) % L);
    birds.splice(birds.indexOf(b), 1);
    const i = clamp(Math.round((V / net.total) * (birds.length + 1) - 0.5), 0, birds.length);
    birds.splice(i, 0, b);
    b.jit = 0;
  }

  function join(): Promise<void> {
    if (youJoined) return youJoined;
    youJoined = new Promise<void>((resolve) => {
      youLanded = resolve;
    });
    const b = spawnFromButton(true);
    if (!b || !b.joining || !running) {
      // Nothing's moving (reduced motion, paused, or a hidden tab), so "you" goes straight to its place.
      if (b?.joining) settle(b);
      draw(performance.now());
      landed();
    } else timers.push(window.setTimeout(landed, youMs + 1500));
    return youJoined;
  }
  function landed() {
    youLanded?.();
    youLanded = null;
  }

  // "You" flies on its own, ignoring the flock, along its planned arc: it eases off the button, picks
  // up speed, and settles into its place, following the place as it moves along the picture. It goes
  // by the clock, not the flock's speed, so it takes the same time however fast the flock is going.
  function flyYou(b: Bird, now: number, realK: number) {
    const t = clamp((now - youSince) / youMs, 0, 1),
      e = t * t * (3 - 2 * t),
      u = 1 - e;
    const home = targetOf(b, 0);
    const x = u * u * youFrom[0] + 2 * u * e * youBow[0] + e * e * home[0],
      y = u * u * youFrom[1] + 2 * u * e * youBow[1] + e * e * home[1];
    b.vx = (x - b.x) / realK;
    b.vy = (y - b.y) / realK;
    b.x = x;
    b.y = y;
    if (t >= 1) {
      // In its place: it heads along the picture with the rest of the flock.
      b.vx = home[2] * 1.5;
      b.vy = home[3] * 1.5;
      b.joining = false;
    }
    const v = Math.hypot(b.vx, b.vy);
    youTrail.push([b.x, b.y]);
    if (youTrail.length > YOU_TRAIL) youTrail.shift();
    // Face the way it's going (it barely moves at the very start, so it keeps its heading then).
    if (v > 0.05) {
      let da = Math.atan2(b.vy, b.vx) - b.ang;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      b.ang += da * Math.min(1, 0.4 * realK);
    }
    b.ph += (0.12 + v * 0.05) * realK * P.flap;
  }

  function onSetting(key: SettingKey) {
    if (key === "max" && birds.length > P.max) birds.length = Math.max(P.max, 1);
    if (key === "max" || key === "loose") placeAll();
    if (reduce || paused) {
      birds.forEach(settle);
      draw(performance.now());
    }
  }

  // ---------- simulation ----------
  let grid: Bird[][] = [],
    cols = 0,
    rows = 0;
  function rebuildGrid() {
    cols = Math.ceil(W / CELL) + 2;
    rows = Math.ceil(H / CELL) + 2;
    if (grid.length !== cols * rows) grid = Array.from({ length: cols * rows }, () => []);
    for (let i = 0; i < grid.length; i++) grid[i].length = 0;
    for (const b of birds) {
      const c = clamp(Math.floor(b.x / CELL) + 1, 0, cols - 1),
        r = clamp(Math.floor(b.y / CELL) + 1, 0, rows - 1);
      grid[r * cols + c].push(b);
    }
  }

  function step(now: number, k: number, realK: number) {
    if (mode === "auto") {
      if (phase === "us" && !formedAt && (now - tightestAt > SETTLE_MS || now - phaseStart > FORM_TIMEOUT_MS))
        formedAt = now;
      const done = phase === "us" ? formedAt > 0 && now - formedAt > HOLD_MS : now - phaseStart > FREE_MS;
      if (done && (cycle || phase !== "us")) {
        // Each time the flock gathers again, it draws the next picture.
        if (phase === "free") {
          showPicture(picIndex + 1);
          syncShapes();
        }
        phase = phase === "us" ? "free" : "us";
        phaseStart = now;
        if (phase === "us") startForming(now);
      }
    } else phase = mode;
    formW += ((phase === "us" ? 1 : 0) - formW) * Math.min(1, 0.024 * k);
    // While a picture is still forming, measure how close the birds are to their places.
    const measuring = mode === "auto" && phase === "us" && !formedAt;
    gaps.length = 0;

    const wt = now * P.speed;
    // Flying free, the flock drifts around a point that wanders over the picture's box, kept on
    // screen for boxes that run off it.
    const ax = clamp(net.cx + net.rx * 0.8 * Math.sin(wt * 0.00031), W * 0.1, W * 0.9);
    const ay = clamp(net.cy + net.ry * 0.7 * Math.sin(wt * 0.00047 + 1.3), H * 0.15, H * 0.85);
    const cruise = 1.5 * P.flow;
    travelled += cruise * k;
    waveT += 0.1 * k;
    placeAll();

    rebuildGrid();
    const per2 = PERCEPTION * PERCEPTION,
      sep2 = SEP_DIST * SEP_DIST;

    for (const b of birds) {
      if (b === you && b.joining) {
        flyYou(b, now, realK);
        continue;
      }
      let n = 0,
        avx = 0,
        avy = 0,
        sx = 0,
        sy = 0;
      const c0 = clamp(Math.floor(b.x / CELL) + 1, 0, cols - 1),
        r0 = clamp(Math.floor(b.y / CELL) + 1, 0, rows - 1);
      outer: for (let r = r0 - 1; r <= r0 + 1; r++) {
        if (r < 0 || r >= rows) continue;
        for (let c = c0 - 1; c <= c0 + 1; c++) {
          if (c < 0 || c >= cols) continue;
          const cell = grid[r * cols + c];
          for (let j = 0; j < cell.length; j++) {
            const o = cell[j];
            if (o === b) continue;
            const dx = b.x - o.x,
              dy = b.y - o.y,
              d2 = dx * dx + dy * dy;
            if (d2 > per2) continue;
            // Only follow birds headed roughly the same way, so opposing lanes don't drag on each other.
            if (o.vx * b.vx + o.vy * b.vy > 0) {
              n++;
              avx += o.vx;
              avy += o.vy;
            }
            if (d2 < sep2 && d2 > 0.01) {
              sx += dx / d2;
              sy += dy / d2;
            }
            if (n > 16) break outer;
          }
        }
      }

      if (measuring && !b.joining) {
        const home = targetOf(b, 0);
        gaps.push(Math.hypot(home[0] - b.x, home[1] - b.y));
      }
      const w = b.joining ? 1 : formW;
      let fx = 0,
        fy = 0;
      let maxSpeed = 2.6 + (1 - w) * 1.2;

      if (n > 0) {
        fx += (avx / n - b.vx) * 0.06 * P.align;
        fy += (avy / n - b.vy) * 0.06 * P.align;
      }
      fx += sx * 0.5 * P.separation * (1 - 0.5 * w);
      fy += sy * 0.5 * P.separation * (1 - 0.5 * w);

      if (w > 0.01) {
        // Chase a point just ahead of this bird's slot on the loop.
        const t = targetOf(b, 7);
        const dx = t[0] - b.x,
          dy = t[1] - b.y,
          dist = Math.hypot(dx, dy);
        const pull = b.joining ? 0.05 : 0.09 * P.hold;
        const dvx = t[2] * cruise + dx * pull,
          dvy = t[3] * cruise + dy * pull;
        // Birds far from their slot hurry to it, so the map comes together quickly from anywhere.
        const far = Math.max(0, dist - 30);
        const lim = (b.joining ? 0.15 : 0.22) * Math.max(0.6, P.hold) * (1 + Math.min(far / 150, 2));
        maxSpeed += Math.min(far / 50, 5) * w;
        let stx = dvx - b.vx,
          sty = dvy - b.vy;
        const sm = Math.hypot(stx, sty);
        if (sm > lim) {
          stx = (stx / sm) * lim;
          sty = (sty / sm) * lim;
        }
        fx += stx * w;
        fy += sty * w;
        if (b.joining) {
          maxSpeed = 3.2;
          if (dist < 10) b.joining = false;
        }
      }
      if (w < 0.99) {
        const dx = ax - b.x,
          dy = ay - b.y,
          d = Math.hypot(dx, dy) || 1;
        fx += (dx / d) * 0.035 * (1 - w);
        fy += (dy / d) * 0.035 * (1 - w);
        const margin = 50;
        if (b.x < margin) fx += 0.06;
        if (b.x > W - margin) fx -= 0.06;
        if (b.y < margin) fy += 0.06;
        if (b.y > H - margin) fy -= 0.06;
      }
      fx += gauss() * 0.006 * P.jitter;
      fy += gauss() * 0.006 * P.jitter;

      b.vx += fx * k;
      b.vy += fy * k;
      let v = Math.hypot(b.vx, b.vy);
      if (v > maxSpeed) {
        b.vx = (b.vx / v) * maxSpeed;
        b.vy = (b.vy / v) * maxSpeed;
        v = maxSpeed;
      }
      const minSpeed = (1 - w) * 1.4;
      if (v < minSpeed && v > 1e-6) {
        b.vx *= minSpeed / v;
        b.vy *= minSpeed / v;
        v = minSpeed;
      }
      b.x += b.vx * k;
      b.y += b.vy * k;

      if (v > 0.03) {
        let da = Math.atan2(b.vy, b.vx) - b.ang;
        da = Math.atan2(Math.sin(da), Math.cos(da));
        b.ang += da * Math.min(1, 0.3 * realK);
      }
      b.ph += (0.12 + v * 0.05) * realK * P.flap;
    }
    if (gaps.length) {
      gaps.sort((a, b) => a - b);
      const spread = gaps[Math.floor(gaps.length * 0.9)];
      // Only count it as tighter once the flock is mostly in formation, not while it's still turning toward it.
      if (spread < tightest * (1 - SETTLE_GAIN) || formW < 0.9) {
        tightest = Math.min(tightest, spread);
        tightestAt = now;
      }
    }
  }
  // A picture starts to form: the flock rushes into it, and its hold waits until it has.
  function startForming(now: number) {
    rushAt = now;
    formedAt = 0;
    tightest = Infinity;
    tightestAt = now;
  }

  // ---------- drawing ----------
  function addBirdPath(p: Path2D, b: Bird) {
    const c = Math.cos(b.ang),
      s = Math.sin(b.ang);
    const z = b.size * birdScale * themeSize * P.size;
    const span = P.flap > 0 ? 0.55 + 0.45 * Math.sin(b.ph) : 0.85;
    const sweep = (1 - span) * 0.7;
    const pt = (lx: number, ly: number): Pt => [b.x + (lx * c - ly * s) * z, b.y + (lx * s + ly * c) * z];
    const n = pt(1.7, 0),
      l = pt(-1.1 - sweep, -2.3 * span),
      m = pt(-0.3, 0),
      r = pt(-1.1 - sweep, 2.3 * span);
    p.moveTo(n[0], n[1]);
    p.lineTo(l[0], l[1]);
    p.lineTo(m[0], m[1]);
    p.lineTo(r[0], r[1]);
    p.closePath();
  }

  function draw(now: number) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (P.blocks > 0 && net.tiles) {
      ctx.globalAlpha = P.blocks;
      ctx.fillStyle = colors.tile;
      ctx.fill(net.tiles);
      ctx.globalAlpha = 1;
      if (P.channel > 0 && net.channels) {
        ctx.strokeStyle = colors.bg;
        ctx.lineWidth = P.channel;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke(net.channels);
      }
    }
    const marked = you && now - youSince < YOU_LABEL_MS ? you : null;
    const paths = [new Path2D(), new Path2D(), new Path2D()],
      redPath = new Path2D();
    for (const b of birds)
      if (b !== marked)
        addBirdPath(
          b.red
            ? redPath
            : paths[net.project && formW > 0.5 ? (b.shade < 0.38 ? 0 : b.shade < 0.62 ? 1 : 2) : b.alpha],
          b,
        );
    ctx.fillStyle = colors.ink;
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = alphas[i];
      ctx.fill(paths[i]);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.red;
    ctx.fill(redPath);
    // Some pictures dissolve toward the bottom: erase the birds there with a soft gradient.
    if (net.fade && formW > 0.01) {
      const y0 = net.top + (net.bottom - net.top) * net.fade,
        y1 = net.bottom + 8;
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, "rgba(0,0,0," + formW.toFixed(3) + ")");
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = g;
      ctx.fillRect(0, y0, W, H - y0);
      ctx.restore();
    }
    yctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (youLayerUsed) yctx.clearRect(0, 0, W, H);
    youLayerUsed = !!marked;
    if (marked) drawYou(marked, now);
  }

  // Marks "you", on its own layer: the bird, the trail it flew in on, a pulsing ring, and a label
  // that says when it's in. When the marks have faded, it goes back to being drawn with the flock.
  let youLayerUsed = false;
  function drawYou(b: Bird, now: number) {
    const t = (now - youSince) / YOU_LABEL_MS;
    const shown = t < 0.85 ? 1 : (1 - t) / 0.15;
    const ctx = yctx;
    ctx.save();
    ctx.strokeStyle = colors.red;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5 * birdScale;
    for (let i = 1; i < youTrail.length; i++) {
      ctx.globalAlpha = (i / youTrail.length) * 0.55 * shown;
      ctx.beginPath();
      ctx.moveTo(youTrail[i - 1][0], youTrail[i - 1][1]);
      ctx.lineTo(youTrail[i][0], youTrail[i][1]);
      ctx.stroke();
    }
    const pulse = 0.5 + 0.5 * Math.sin(now / 160);
    ctx.globalAlpha = (0.35 + 0.4 * pulse) * shown;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, (15 + 5 * pulse) * birdScale, 0, Math.PI * 2);
    ctx.stroke();
    // The label gets an outline in the page color, so it reads even over other birds.
    const label = b.joining ? "← you" : "← you're in",
      lx = b.x + 26 * birdScale,
      ly = b.y + 5;
    ctx.globalAlpha = shown;
    ctx.font = "700 15px " + colors.mono;
    ctx.lineWidth = 4;
    ctx.strokeStyle = colors.bg;
    ctx.strokeText(label, lx, ly);
    ctx.fillStyle = colors.red;
    ctx.fillText(label, lx, ly);
    const bird = new Path2D();
    addBirdPath(bird, b);
    ctx.globalAlpha = 1;
    ctx.fill(bird);
    ctx.restore();
  }

  // ---------- loop ----------
  let last = 0,
    running = false,
    raf = 0;
  function frame(now: number) {
    if (!running) return;
    const dt = last ? now - last : 16.7;
    last = now;
    const realK = clamp(dt / 16.7, 0.2, 3);
    if (streaming && P.rate > 0 && now - lastSpawn > 1000 / P.rate) {
      spawnFromButton(false);
      lastSpawn = now;
    }
    const since = now - rushAt;
    const boost = 1 + (BOOST - 1) * clamp(1 - since / BOOST_MS, 0, 1);
    const rush = 1 + (RUSH - 1) * clamp(1 - since / RUSH_MS, 0, 1) ** 2;
    step(now, realK * P.speed * boost * rush, realK);
    if (you && !you.joining) {
      if (youLanded) landed();
      // Once "you" is in, its trail shrinks away behind it.
      youTrail.splice(0, 2);
    }
    draw(now);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduce || paused) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = youCanvas.width = Math.round(W * dpr);
    canvas.height = youCanvas.height = Math.round(H * dpr);
    buildNetwork();
    if (reduce || paused) {
      birds.forEach(settle);
      draw(performance.now());
    }
  }

  // ---------- controls ----------
  function setMode(m: Mode) {
    if (m === "us" && mode === "free" && net) reslot();
    mode = m;
    for (const key of Object.keys(modeBtns) as Mode[]) modeBtns[key].setAttribute("aria-pressed", String(key === m));
    if (m === "auto") {
      phase = "us";
      phaseStart = performance.now();
    }
    if (m !== "free") startForming(performance.now());
  }
  // Shape picker: hold one picture, or rotate through all of them. The chosen button is pressed, and
  // the picture the flock is drawing is marked current and names the menu's button, so while
  // cycling the picker shows where it is.
  const shapeBtns = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-shape]"));
  const shapeLabel = $("#shape-current");
  function syncShapes() {
    shapeBtns.forEach((btn) => {
      const v = btn.dataset.shape;
      const onScreen = pics[picIndex]?.name === v;
      btn.setAttribute("aria-pressed", String(v === "cycle" ? cycle : !cycle && onScreen));
      if (v === "cycle") return;
      if (onScreen) {
        btn.setAttribute("aria-current", "true");
        shapeLabel.textContent = btn.textContent;
      } else btn.removeAttribute("aria-current");
    });
  }
  shapeBtns.forEach((btn) =>
    on(btn, "click", () => {
      const v = btn.dataset.shape;
      if (v === "cycle") {
        cycle = true;
        syncShapes();
        return;
      }
      cycle = false;
      const i = pics.findIndex((p) => p.name === v);
      setMode("auto");
      showPicture(i);
      syncShapes();
      if (reduce || paused) {
        birds.forEach(settle);
        draw(performance.now());
      }
    }),
  );
  on(modeBtns.auto, "click", () => setMode("auto"));
  on(modeBtns.us, "click", () => setMode("us"));
  on(modeBtns.free, "click", () => setMode("free"));
  on(pauseBtn, "click", () => {
    paused = !paused;
    pauseBtn.setAttribute("aria-pressed", String(paused));
    pauseBtn.textContent = paused ? "Resume motion" : "Pause motion";
    if (paused) stop();
    else start();
  });
  on(streamBtn, "click", () => {
    streaming = !streaming;
    streamBtn.setAttribute("aria-pressed", String(streaming));
  });
  // The tuning controls show only at #tune.
  const panel = $("#settings");
  const tuneBar = $("#tune-bar");
  const showTune = () => {
    const shown = location.hash === "#tune";
    panel.hidden = !shown;
    tuneBar.hidden = !shown;
  };
  on(window, "hashchange", showTune);
  showTune();
  on($("#replay"), "click", () => intro());
  on($("#next-pic"), "click", () => {
    showPicture(picIndex + 1);
    syncShapes();
    if (reduce || paused) {
      birds.forEach(settle);
      draw(performance.now());
    }
  });
  on($("#reset-flock"), "click", () => {
    intro();
    statusEl.textContent = "Flock restarted with " + birds.length.toLocaleString() + " birds.";
  });
  on($("#defaults"), "click", () => {
    P = { ...DEFAULTS };
    save();
    syncInputs();
    if (reduce || paused) {
      birds.forEach(settle);
      draw(performance.now());
    }
    statusEl.textContent = "Settings back to defaults.";
  });
  on($("#copy"), "click", () => {
    const text = JSON.stringify(P);
    const done = () => {
      statusEl.textContent = "Settings copied.";
    };
    const fail = () => {
      statusEl.textContent = text;
    };
    try {
      navigator.clipboard.writeText(text).then(done, fail);
    } catch {
      fail();
    }
  });
  if (reduce) {
    streamBtn.setAttribute("aria-pressed", "false");
    streamBtn.disabled = true;
    pauseBtn.hidden = true;
  }

  readColors();
  const onTheme = () => {
    readColors();
    if (reduce || paused) draw(performance.now());
  };
  on(window.matchMedia("(prefers-color-scheme: dark)"), "change", onTheme);
  const themeObserver = new MutationObserver(onTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  on(window, "resize", resize);
  on(document, "visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  // A random spot along one axis of the screen, in a cloud around its middle. Spots off the screen are redrawn.
  function aroundMiddle(size: number) {
    let v: number;
    do v = size / 2 + gauss() * size * INTRO_SPREAD;
    while (v < 0 || v > size);
    return v;
  }

  // Start with the birds scattered in a loose cloud around the middle of the screen, each already
  // headed for its place in the first picture, so the picture comes together at once.
  function intro() {
    populate();
    if (reduce) {
      setMode(mode);
      formW = 1;
      draw(performance.now());
      return;
    }
    for (const b of birds) {
      b.x = aroundMiddle(W);
      b.y = aroundMiddle(H);
      const a = rand() * Math.PI * 2,
        sp = 0.6 + rand() * 0.6;
      b.vx = Math.cos(a) * sp;
      b.vy = Math.sin(a) * sp;
      b.ang = a;
    }
    // Hand out places by where the birds now are, so each one has only a short way to go.
    reslot();
    mode = "auto";
    setMode("auto");
    formW = 1;
    if (paused) {
      birds.forEach(settle);
      draw(performance.now());
    }
  }

  resize();
  // The copy's height depends on the web fonts, and pictures can be placed around it, so place
  // them again once the fonts are in.
  void document.fonts.ready.then(() => {
    if (!abort.signal.aborted) resize();
  });
  intro();
  syncShapes();
  if (reduce) draw(performance.now());
  else start();

  return {
    stop() {
      stop();
      abort.abort();
      themeObserver.disconnect();
      for (const timer of timers) window.clearTimeout(timer);
      for (const row of settingRows) row.remove();
    },
    join,
  };
}
