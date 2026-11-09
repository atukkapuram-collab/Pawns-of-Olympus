import { describe, expect, it } from 'vitest';
import { computeScale } from '../src/game/scaler';

describe('integer scaler', () => {
  it('picks the largest whole multiple that fits', () => {
    expect(computeScale(1280, 720, 1).factor).toBe(4);
    expect(computeScale(1920, 1080, 1).factor).toBe(6);
    expect(computeScale(1000, 700, 1).factor).toBe(3);
  });

  it('works in device pixels on high-DPI and fractional scaling', () => {
    const s = computeScale(1536, 864, 1.25); // 1920x1080 at 125%
    expect(s.factor).toBe(6);
    expect(s.cssW * 1.25).toBe(1920);
  });

  it('never drops below 1x', () => {
    expect(computeScale(100, 100, 1).factor).toBe(1);
  });
});
