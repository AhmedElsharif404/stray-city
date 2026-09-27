import { timingSafeEqual } from 'node:crypto';

import { Router } from 'express';

import { config } from '../config.js';
import { HttpError } from '../lib/http.js';
import { galleryRequestSchema, saveGalleryItem } from '../services/user-gallery.js';

export const userGalleryRouter = Router();

function secretMatches(received: string | undefined, expected: string): boolean {
  if (!received) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

userGalleryRouter.post('/gallery/add', async (request, response, next) => {
  try {
    if (!config.SPECTRUM_WEBHOOK_SECRET) {
      throw new HttpError(503, 'GALLERY_API_NOT_CONFIGURED', 'Gallery API is not configured.');
    }
    if (
      !secretMatches(request.header('x-spectrum-webhook-secret'), config.SPECTRUM_WEBHOOK_SECRET)
    ) {
      throw new HttpError(401, 'UNAUTHORIZED', 'A valid gallery webhook secret is required.');
    }

    const payload = galleryRequestSchema.parse(request.body);
    const result = await saveGalleryItem({
      sender: payload.sender,
      imageUrl: payload.imageUrl,
      caption: payload.caption,
      timestamp: payload.timestamp,
      messageId: payload.messageId,
      source: 'api',
    });

    response.status(result.duplicate ? 200 : 201).json({
      data: {
        profileId: result.profile.id,
        linkedUserId: result.profile.userId,
        createdProfile: result.profile.created,
        duplicate: result.duplicate,
        galleryItem: result.item,
      },
    });
  } catch (error) {
    next(error);
  }
});
