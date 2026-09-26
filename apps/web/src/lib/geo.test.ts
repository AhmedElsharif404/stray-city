import { describe, expect, it } from 'vitest';

import { distanceInMeters, formatDistance } from './geo';

describe('geo helpers', () => {
  it('calculates a plausible NYC block distance', () => {
    const distance = distanceInMeters(
      { lat: 40.7685, lng: -73.9361 },
      { lat: 40.7614, lng: -73.9509 },
    );
    expect(distance).toBeGreaterThan(1000);
    expect(distance).toBeLessThan(2000);
  });

  it('formats meters and miles clearly', () => {
    expect(formatDistance(420)).toBe('400 m');
    expect(formatDistance(3218)).toBe('2.0 mi');
  });
});
