import { describe, expect, it } from 'vitest';

import { galleryRequestSchema, normalizePhoneNumber } from './user-gallery.js';

describe('normalizePhoneNumber', () => {
  it('normalizes common US phone formats to E.164', () => {
    expect(normalizePhoneNumber('(212) 555-0199')).toBe('+12125550199');
    expect(normalizePhoneNumber('1-212-555-0199')).toBe('+12125550199');
  });

  it('preserves valid international numbers', () => {
    expect(normalizePhoneNumber('+44 20 7946 0958')).toBe('+442079460958');
  });

  it('rejects invalid senders', () => {
    expect(() => normalizePhoneNumber('not-a-phone')).toThrow();
  });
});

describe('galleryRequestSchema', () => {
  it('accepts a protected gallery payload', () => {
    expect(
      galleryRequestSchema.parse({
        sender: '+12125550199',
        imageUrl: 'https://images.example.com/photo.jpg',
        caption: 'Lower Manhattan at sunset',
        timestamp: '2026-09-27T18:30:00.000Z',
      }),
    ).toMatchObject({ sender: '+12125550199' });
  });

  it('rejects insecure image URLs', () => {
    expect(() =>
      galleryRequestSchema.parse({
        sender: '+12125550199',
        imageUrl: 'http://images.example.com/photo.jpg',
      }),
    ).toThrow();
  });
});
