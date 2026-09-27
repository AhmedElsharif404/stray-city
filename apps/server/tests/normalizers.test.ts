import { describe, expect, it } from 'vitest';

import {
  normalizePark,
  normalizeRestaurant,
  normalizeTicketmasterEvent,
} from '../src/etl/normalizers.js';

describe('ETL normalizers', () => {
  it('normalizes NYC Parks without inventing pricing', () => {
    const place = normalizePark({
      gispropnum: 'Q001',
      signname: 'Astoria Park',
      borough: 'Queens',
      latitude: '40.779',
      longitude: '-73.922',
    });
    expect(place).toMatchObject({
      external_id: 'Q001',
      category: 'park',
      cost_verified: false,
      hidden_gem_verified: false,
    });
  });

  it('derives a map point from the NYC Parks multipolygon geometry', () => {
    const place = normalizePark({
      gispropnum: 'Q001',
      signname: 'Geometry Park',
      borough: 'Q',
      multipolygon: {
        type: 'MultiPolygon',
        coordinates: [[[[-73.94, 40.74], [-73.92, 40.74], [-73.92, 40.76], [-73.94, 40.76]]]],
      },
    });
    expect(place).toMatchObject({ lat: 40.75, lng: -73.93, category: 'park' });
  });

  it('keeps inspection data informational', () => {
    const place = normalizeRestaurant({
      camis: '5001',
      dba: 'Tiny Cafe',
      boro: 'Queens',
      latitude: '40.74',
      longitude: '-73.91',
      cuisine_description: 'Coffee/Tea',
      grade: 'A',
      score: '7',
    });
    expect(place).toMatchObject({
      category: 'cafe',
      cuisine: 'Coffee/Tea',
      inspection_grade: 'A',
      inspection_score: 7,
      cost_verified: false,
      hidden_gem_verified: false,
    });
  });

  it('classifies bakeries and bars from official establishment data', () => {
    const bakery = normalizeRestaurant({
      camis: '5002',
      dba: 'Neighborhood Bake Shop',
      boro: 'Brooklyn',
      latitude: '40.68',
      longitude: '-73.97',
      cuisine_description: 'Bakery Products/Desserts',
    });
    const bar = normalizeRestaurant({
      camis: '5003',
      dba: 'West Side Tavern',
      boro: 'Manhattan',
      latitude: '40.76',
      longitude: '-73.99',
      cuisine_description: 'American',
    });
    expect(bakery?.category).toBe('bakery');
    expect(bar?.category).toBe('bar');
  });

  it('normalizes Ticketmaster events as map places', () => {
    const place = normalizeTicketmasterEvent({
      id: 'event-1',
      name: 'Night Market',
      dates: { start: { dateTime: '2026-10-01T22:00:00Z' } },
      _embedded: {
        venues: [{ location: { latitude: '40.72', longitude: '-73.95' } }],
      },
    });
    expect(place).toMatchObject({
      category: 'popup_event',
      event_starts_at: '2026-10-01T22:00:00Z',
    });
  });
});
