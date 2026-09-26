import { z } from 'zod';

import { PLACE_CATEGORIES } from './types.js';

export const placeCategorySchema = z.enum(PLACE_CATEGORIES);

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const normalizedPlaceInputSchema = z.object({
  name: z.string().min(1).max(160),
  category: placeCategorySchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().nullable(),
  borough: z.string().min(1),
  neighborhood: z.string().nullable(),
  description: z.string(),
  photos: z.array(z.string()),
  local_tips: z.array(z.string()),
  tags: z.array(z.string()),
  cuisine: z.string().nullable(),
  sidequest_objective: z.string().nullable(),
  cost_verified: z.boolean(),
  cost_info: z.string().nullable(),
  hidden_gem_verified: z.boolean(),
  inspection_grade: z.string().nullable(),
  inspection_score: z.number().int().nullable(),
  inspection_date: z.string().nullable(),
  event_starts_at: z.string().nullable(),
  event_ends_at: z.string().nullable(),
  source: z.enum(['community', 'admin', 'nyc_parks', 'nyc_restaurant_inspection', 'ticketmaster']),
  external_id: z.string().min(1),
  source_url: z.string().url().nullable(),
  source_payload: z.record(z.unknown()),
  source_updated_at: z.string().nullable(),
  is_active: z.boolean(),
  is_sample: z.boolean(),
});

export const checkInRequestSchema = coordinatesSchema.extend({
  placeId: z.string().uuid(),
  accuracyM: z.number().positive().max(150),
});

export const etlRequestSchema = z.object({
  limit: z.coerce.number().int().positive().max(5000).default(500),
});

export const reportSchema = z.object({
  targetType: z.enum(['echo', 'scrapbook_item', 'story', 'open_plan', 'trail', 'plan_message']),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(3).max(500),
});
