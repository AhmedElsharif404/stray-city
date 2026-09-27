import { describe, expect, it } from 'vitest';

import type { NormalizedPlaceInput } from '@stray-city/shared';

import { normalizeCatalogRecord } from '../src/etl/catalog.js';
import { deduplicateNormalizedPlaces, findInspectionMatch } from '../src/etl/matching.js';
import { isWithinNyc } from '../src/etl/normalizers.js';

function place(overrides: Partial<NormalizedPlaceInput> = {}): NormalizedPlaceInput {
  return {
    name: 'Astoria Books',
    category: 'bookstore',
    lat: 40.7643,
    lng: -73.9235,
    address: '31-01 Broadway, Queens, NY 11106',
    borough: 'Queens',
    neighborhood: 'Astoria',
    description: '',
    photos: [],
    local_tips: [],
    tags: ['bookstore'],
    cuisine: null,
    website_url: null,
    phone: null,
    opening_hours: null,
    sidequest_objective: null,
    cost_verified: false,
    cost_info: null,
    price_level: null,
    hidden_gem_verified: false,
    inspection_grade: null,
    inspection_score: null,
    inspection_date: null,
    event_starts_at: null,
    event_ends_at: null,
    source: 'osm_catalog',
    external_id: 'node/1',
    source_url: null,
    source_payload: {},
    source_updated_at: null,
    is_active: true,
    is_sample: false,
    ...overrides,
  };
}

describe('NYC catalog ingestion', () => {
  it('validates the NYC import boundary', () => {
    expect(isWithinNyc(40.7643, -73.9235)).toBe(true);
    expect(isWithinNyc(42.3601, -71.0589)).toBe(false);
  });

  it('normalizes a cached OSM feature', () => {
    expect(
      normalizeCatalogRecord({
        id: 'node/42',
        lat: 40.7643,
        lon: -73.9235,
        tags: { name: 'Astoria Books', shop: 'books', 'addr:postcode': '11106' },
      }),
    ).toMatchObject({ provider: 'osm_catalog', category: 'bookstore', borough: null });
  });

  it('deduplicates by source identity and normalized name plus distance', () => {
    const duplicate = place({ external_id: 'node/2', lat: 40.76431, lng: -73.92351 });
    expect(deduplicateNormalizedPlaces([place(), place(), duplicate])).toHaveLength(1);
  });

  it('matches inspections by normalized name and geographic proximity', () => {
    const inspection = place({
      name: 'CAFE À LA MODE',
      category: 'restaurant',
      source: 'nyc_restaurant_inspection',
      external_id: '5001',
      lat: 40.76431,
      lng: -73.92351,
      address: '31-01 Broadway NY 11106',
    });
    const match = findInspectionMatch(inspection, [
      {
        id: 'p1',
        name: 'Cafe a la Mode',
        address: '31-01 Broadway, NY 11106',
        lat: 40.7643,
        lng: -73.9235,
      },
    ]);
    expect(match?.id).toBe('p1');
  });
});
