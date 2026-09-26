import { describe, expect, it } from 'vitest';

import { normalizedPlaceInputSchema } from '../src/schemas.js';

describe('normalizedPlaceInputSchema', () => {
  it('accepts a normalized place', () => {
    const result = normalizedPlaceInputSchema.safeParse({
      name: 'Sample Park',
      category: 'park',
      lat: 40.7,
      lng: -73.9,
      address: null,
      borough: 'Queens',
      neighborhood: null,
      description: '',
      photos: [],
      local_tips: [],
      tags: [],
      cuisine: null,
      sidequest_objective: null,
      cost_verified: false,
      cost_info: null,
      hidden_gem_verified: false,
      inspection_grade: null,
      inspection_score: null,
      inspection_date: null,
      event_starts_at: null,
      event_ends_at: null,
      source: 'nyc_parks',
      external_id: 'P001',
      source_url: null,
      source_payload: {},
      source_updated_at: null,
      is_active: true,
      is_sample: false,
    });

    expect(result.success).toBe(true);
  });

  it('rejects impossible coordinates', () => {
    expect(
      normalizedPlaceInputSchema.safeParse({ name: 'Nope', category: 'park', lat: 200 }),
    ).toMatchObject({ success: false });
  });
});
