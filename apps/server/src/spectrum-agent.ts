import { createHash } from 'node:crypto';
import path from 'node:path';

import { Spectrum } from 'spectrum-ts';
import { imessage } from 'spectrum-ts/providers/imessage';

import { config, hasSpectrumAgent } from './config.js';
import { requireSupabaseAdmin } from './lib/supabase.js';
import { ensureImessageProfile, normalizePhoneNumber, saveGalleryItem } from './services/user-gallery.js';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function safeFileName(name: string, mimeType: string): string {
  const suppliedExtension = path.extname(name).toLowerCase();
  const extension = suppliedExtension || `.${mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'}`;
  const stem = path.basename(name, suppliedExtension).replace(/[^a-z0-9_-]/gi, '-').slice(0, 60);
  return `${stem || 'photo'}${extension}`;
}

async function consumeSpectrumMessages() {
  const spectrum = await Spectrum({
    projectId: config.SPECTRUM_PROJECT_ID!,
    projectSecret: config.SPECTRUM_PROJECT_SECRET!,
    providers: [imessage.config()],
  });
  console.log('Spectrum iMessage agent connected.');

  for await (const [space, message] of spectrum.messages) {
    if (message.direction !== 'inbound' || message.platform !== 'imessage' || !message.sender) {
      continue;
    }
    if (message.content.type !== 'attachment' || !message.content.mimeType.startsWith('image/')) {
      continue;
    }
    const content = message.content;
    const senderIdentity = message.sender.id;

    await space.responding(async () => {
      try {
        if (content.size && content.size > MAX_IMAGE_BYTES) {
          await message.reply('That image is larger than the 10 MB gallery limit.');
          return;
        }

        const sender = normalizePhoneNumber(senderIdentity);
        const profile = await ensureImessageProfile(sender);
        const imageBytes = await content.read();
        if (imageBytes.byteLength > MAX_IMAGE_BYTES) {
          await message.reply('That image is larger than the 10 MB gallery limit.');
          return;
        }

        const senderHash = createHash('sha256').update(sender).digest('hex').slice(0, 24);
        const storagePath = `${senderHash}/${message.id}/${safeFileName(content.name, content.mimeType)}`;
        const { error: uploadError } = await requireSupabaseAdmin().storage
          .from('imessage-gallery')
          .upload(storagePath, imageBytes, {
            contentType: content.mimeType,
            upsert: true,
          });
        if (uploadError) throw uploadError;

        await saveGalleryItem({
          sender,
          storagePath,
          timestamp: message.timestamp.toISOString(),
          messageId: message.id,
          source: 'imessage',
        });
        await message.reply(
          profile.userId
            ? 'Saved to your Stray City gallery.'
            : 'Saved. Register Stray City with this phone number to link the photo to your account.',
        );
      } catch (error) {
        console.error('Spectrum gallery message failed', error);
        await message.reply('I could not save that photo right now. Please try again in a moment.');
      }
    });
  }
}

export function startSpectrumAgent(): void {
  if (!hasSpectrumAgent) {
    console.log('Spectrum agent disabled: add SPECTRUM_PROJECT_ID and SPECTRUM_PROJECT_SECRET.');
    return;
  }
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('Spectrum agent disabled: Supabase admin credentials are missing.');
    return;
  }
  void consumeSpectrumMessages().catch((error) => {
    console.error('Spectrum agent stopped unexpectedly', error);
  });
}
