export interface FlexTrack {
  basis?: number;
  grow?: number;
  shrink?: number;
  min?: number;
  max?: number;
}

export function solveFlex(total: number, tracks: FlexTrack[], gap = 0): number[] {
  if (tracks.length === 0) return [];
  const usable = Math.max(0, Math.floor(total) - Math.max(0, tracks.length - 1) * Math.max(0, Math.floor(gap)));
  const sizes = tracks.map((track) => clampSize(track.basis ?? track.min ?? 0, track));
  const base = sizes.reduce((sum, size) => sum + size, 0);
  if (base < usable) distributeGrow(sizes, tracks, usable);
  if (base > usable) distributeShrink(sizes, tracks, usable);
  return reconcileRounding(sizes, usable, tracks);
}

function distributeGrow(sizes: number[], tracks: FlexTrack[], target: number): void {
  distributeDelta(sizes, tracks, target, "grow");
}

function distributeShrink(sizes: number[], tracks: FlexTrack[], target: number): void {
  distributeDelta(sizes, tracks, target, "shrink");
}

function distributeDelta(sizes: number[], tracks: FlexTrack[], target: number, mode: "grow" | "shrink"): void {
  const direction = mode === "grow" ? 1 : -1;
  const epsilon = 0.0001;
  for (let guard = 0; guard < tracks.length * 4; guard += 1) {
    const delta = target - sizes.reduce((sum, size) => sum + size, 0);
    if (Math.abs(delta) < epsilon || Math.sign(delta) !== direction) return;
    const candidates = tracks
      .map((track, index) => ({
        index,
        track,
        weight: mode === "grow" ? Math.max(0, track.grow ?? 0) : Math.max(0, track.shrink ?? 1) * sizes[index],
      }))
      .filter(({ index, track }) => canMove(sizes[index], track, direction));

    if (candidates.length === 0) return;
    const weighted = candidates.filter((candidate) => candidate.weight > 0);
    const active = weighted.length > 0 ? weighted : [candidates[candidates.length - 1]];
    const totalWeight = active.reduce((sum, candidate) => sum + (candidate.weight > 0 ? candidate.weight : 1), 0);
    let applied = 0;
    for (const candidate of active) {
      const weight = candidate.weight > 0 ? candidate.weight : 1;
      const share = delta * (weight / totalWeight);
      const next = clampSize(sizes[candidate.index] + share, candidate.track);
      applied += next - sizes[candidate.index];
      sizes[candidate.index] = next;
    }
    if (Math.abs(applied) < epsilon) return;
  }
}

function reconcileRounding(sizes: number[], target: number, tracks: FlexTrack[]): number[] {
  const rounded = sizes.map((size, index) => clampSize(Math.floor(size), tracks[index] ?? {}));
  let delta = target - rounded.reduce((sum, size) => sum + size, 0);
  const limit = Math.max(1, rounded.length * 2);
  for (let guard = 0; delta !== 0 && guard < limit; guard += 1) {
    const step = delta > 0 ? 1 : -1;
    const index = findRoundingIndex(sizes, rounded, tracks, step);
    if (index === -1) {
      return rounded;
    }
    rounded[index] += step;
    delta -= step;
  }
  return rounded;
}

function findRoundingIndex(
  sizes: number[],
  rounded: number[],
  tracks: FlexTrack[],
  direction: number,
): number {
  let bestIndex = -1;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < rounded.length; index += 1) {
    if (canMove(rounded[index], tracks[index] ?? {}, direction)) {
      const score = direction > 0 ? sizes[index] - rounded[index] : rounded[index] - sizes[index];
      if (score > bestScore || (score === bestScore && index > bestIndex)) {
        bestScore = score;
        bestIndex = index;
      }
    }
  }
  return bestIndex;
}

function canMove(size: number, track: FlexTrack, direction: number): boolean {
  const min = Math.max(0, track.min ?? 0);
  const max = Math.max(min, track.max ?? Number.POSITIVE_INFINITY);
  return direction > 0 ? size < max : size > min;
}

function clampSize(value: number, track: FlexTrack): number {
  const min = Math.max(0, track.min ?? 0);
  const max = Math.max(min, track.max ?? Number.POSITIVE_INFINITY);
  return Math.max(min, Math.min(max, value));
}
