/**
 * Lady Justice's blindfold, added to the traced statuette (which has none). In the trace's own
 * frame (see data/lady-justice.json): she faces left in three-quarter view, her face along x ≈ 301
 * and the back of her head at x ≈ 355, her eyes at about y 105. The band runs across her eyes and
 * just past the line of her face, and ties at the back of her head, with two loose ends trailing.
 */

type Pt = [number, number];

const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 12): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n,
      u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ];
  });

export function blindfoldStrokes(): Pt[][] {
  // The band: from the knot, along its top edge to the face, round the front, and back along its bottom.
  const band: Pt[] = [
    [356, 105],
    [327, 104],
    [298, 103],
    [296.5, 106.5],
    [298, 110],
    [327, 110.5],
    [356, 111],
  ];
  // The knot, and the two ends of the cloth hanging from it, blowing back a little.
  const knot: Pt[] = cubic([356, 105], [363, 103], [364, 112], [356, 111], 8);
  const ends = [cubic([359, 110], [369, 117], [377, 123], [379, 136]), cubic([357, 111], [361, 121], [359, 131], [365, 142])];
  // The band is listed twice, so it gets twice the birds and reads as a solid strip across her eyes.
  return [band, band, knot, ...ends];
}
