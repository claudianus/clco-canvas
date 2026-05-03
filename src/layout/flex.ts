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
  if (base < usable) distributeGrow(sizes, tracks, usable - base);
  if (base > usable) distributeShrink(sizes, tracks, base - usable);
  return reconcileRounding(sizes, usable, tracks);
}

function distributeGrow(sizes: number[], tracks: FlexTrack[], extra: number): void {
  let remaining = extra;
  const growTotal = tracks.reduce((sum, track) => sum + Math.max(0, track.grow ?? 0), 0);
  if (growTotal <= 0) {
    sizes[sizes.length - 1] = clampSize(sizes[sizes.length - 1] + remaining, tracks[tracks.length - 1] ?? {});
    return;
  }
  tracks.forEach((track, index) => {
    const share = remaining * (Math.max(0, track.grow ?? 0) / growTotal);
    sizes[index] = clampSize(sizes[index] + share, track);
  });
}

function distributeShrink(sizes: number[], tracks: FlexTrack[], overflow: number): void {
  const weighted = tracks.map((track, index) => Math.max(0, track.shrink ?? 1) * sizes[index]);
  const shrinkTotal = weighted.reduce((sum, value) => sum + value, 0);
  if (shrinkTotal <= 0) return;
  tracks.forEach((track, index) => {
    const share = overflow * (weighted[index] / shrinkTotal);
    sizes[index] = clampSize(sizes[index] - share, track);
  });
}

function reconcileRounding(sizes: number[], target: number, tracks: FlexTrack[]): number[] {
  const rounded = sizes.map((size, index) => clampSize(Math.floor(size), tracks[index] ?? {}));
  let delta = target - rounded.reduce((sum, size) => sum + size, 0);
  let index = rounded.length - 1;
  while (delta !== 0 && rounded.length > 0) {
    const track = tracks[index] ?? {};
    const step = delta > 0 ? 1 : -1;
    const next = clampSize(rounded[index] + step, track);
    if (next !== rounded[index]) {
      rounded[index] = next;
      delta -= step;
    }
    index = index === 0 ? rounded.length - 1 : index - 1;
    if (Math.abs(delta) > target + rounded.length * 100) break;
  }
  return rounded;
}

function clampSize(value: number, track: FlexTrack): number {
  const min = Math.max(0, track.min ?? 0);
  const max = Math.max(min, track.max ?? Number.POSITIVE_INFINITY);
  return Math.max(min, Math.min(max, value));
}

