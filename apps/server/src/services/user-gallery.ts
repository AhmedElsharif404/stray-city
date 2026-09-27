import { z } from 'zod';

import { requireSupabaseAdmin } from '../lib/supabase.js';

export const galleryRequestSchema = z.object({
  sender: z.string().min(8).max(40),
  imageUrl: z.string().url().refine((value) => value.startsWith('https://'), {
    message: 'imageUrl must use HTTPS.',
  }),
  caption: z.string().trim().max(500).optional(),
  timestamp: z.string().datetime({ offset: true }).optional(),
  messageId: z.string().trim().min(1).max(255).optional(),
});

export interface SaveGalleryItemInput {
  sender: string;
  imageUrl?: string;
  storagePath?: string;
  caption?: string;
  timestamp?: string;
  messageId?: string;
  source: 'api' | 'imessage';
}

export function normalizePhoneNumber(input: string): string {
  const trimmed = input.trim().replace(/^tel:/i, '');
  const hasInternationalPrefix = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  const normalized = hasInternationalPrefix
    ? `+${digits}`
    : digits.length === 10
      ? `+1${digits}`
      : digits.length === 11 && digits.startsWith('1')
        ? `+${digits}`
        : '';

  if (!/^\+[1-9][0-9]{7,14}$/.test(normalized)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ['sender'],
        message: 'sender must be a valid phone number, preferably in E.164 format.',
      },
    ]);
  }
  return normalized;
}

export async function ensureImessageProfile(sender: string) {
  const client = requireSupabaseAdmin();
  const phoneE164 = normalizePhoneNumber(sender);
  const { data: contact, error: contactError } = await client
    .from('user_private_contacts')
    .select('user_id')
    .eq('phone_e164', phoneE164)
    .maybeSingle();
  if (contactError) throw contactError;

  const linkedUserId = (contact?.user_id as string | undefined) ?? null;
  const { data: existing, error: existingError } = await client
    .from('imessage_profiles')
    .select('id, user_id')
    .eq('phone_e164', phoneE164)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    if (linkedUserId && existing.user_id !== linkedUserId) {
      const { data: updated, error } = await client
        .from('imessage_profiles')
        .update({ user_id: linkedUserId })
        .eq('id', existing.id)
        .select('id, user_id')
        .single();
      if (error) throw error;
      return { id: String(updated.id), userId: String(updated.user_id), created: false };
    }
    return {
      id: String(existing.id),
      userId: (existing.user_id as string | null) ?? null,
      created: false,
    };
  }

  const { data: created, error: createError } = await client
    .from('imessage_profiles')
    .insert({ phone_e164: phoneE164, user_id: linkedUserId })
    .select('id, user_id')
    .single();
  if (createError) throw createError;
  return {
    id: String(created.id),
    userId: (created.user_id as string | null) ?? null,
    created: true,
  };
}

export async function saveGalleryItem(input: SaveGalleryItemInput) {
  if (!input.imageUrl && !input.storagePath) {
    throw new Error('A gallery image URL or storage path is required.');
  }

  const client = requireSupabaseAdmin();
  const profile = await ensureImessageProfile(input.sender);

  if (input.messageId) {
    const { data: duplicate, error } = await client
      .from('user_gallery_items')
      .select('id, image_url, storage_path, caption, captured_at, created_at')
      .eq('provider_message_id', input.messageId)
      .maybeSingle();
    if (error) throw error;
    if (duplicate) return { profile, item: duplicate, duplicate: true };
  }

  const { data: item, error } = await client
    .from('user_gallery_items')
    .insert({
      imessage_profile_id: profile.id,
      user_id: profile.userId,
      image_url: input.imageUrl ?? null,
      storage_path: input.storagePath ?? null,
      caption: input.caption?.trim() || null,
      captured_at: input.timestamp ?? new Date().toISOString(),
      source: input.source,
      provider_message_id: input.messageId ?? null,
    })
    .select('id, image_url, storage_path, caption, captured_at, created_at')
    .single();
  if (error) throw error;
  return { profile, item, duplicate: false };
}
