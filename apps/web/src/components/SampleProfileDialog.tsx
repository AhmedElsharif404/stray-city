import { CalendarDays, Camera, MapPin, MessageCircleHeart, X } from 'lucide-react';
import { useState } from 'react';

import { sampleProfileDetails, type SampleProfilePhoto } from '../lib/sample-reviews';
import { SampleBadge } from './SampleBadge';

export function SampleProfileDialog({ username, onClose }: { username: string; onClose: () => void }) {
  const profile = sampleProfileDetails(username);
  const [selectedPhoto, setSelectedPhoto] = useState<SampleProfilePhoto | null>(null);
  if (!profile) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-card max-w-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-profile-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="icon-button absolute right-4 top-4" onClick={onClose} aria-label="Close profile">
          <X size={18} />
        </button>

        <div className="flex items-center gap-4 pr-12">
          <span
            className="grid h-20 w-20 shrink-0 place-items-center rounded-[24px] text-xl font-bold text-white shadow-card"
            style={{ background: `linear-gradient(135deg, ${profile.accent}, #18275C)` }}
            aria-hidden="true"
          >
            {profile.initials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="sample-profile-title" className="font-display text-3xl leading-tight">
                {profile.displayName}
              </h2>
              <SampleBadge />
            </div>
            <p className="mt-1 text-sm font-semibold text-blue">@{profile.username}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink/50">
              <MapPin size={13} /> {profile.homeBorough} · Joined {profile.joined}
            </p>
          </div>
        </div>

        <p className="mt-5 rounded-2xl border border-blue/10 bg-blue/5 p-4 text-sm leading-relaxed text-ink/75">
          {profile.bio}
        </p>
        <p className="mt-3 text-xs leading-relaxed text-ink/45">
          This is a fictional profile with sample activity created for the Stray City preview.
        </p>

        <div className="mt-7 flex items-center gap-2">
          <MessageCircleHeart size={18} className="text-blue" />
          <h3 className="font-display text-xl">Recent comments</h3>
        </div>
        <div className="mt-3 space-y-3">
          {profile.recentComments.map((comment) => (
            <article key={`${comment.place}-${comment.when}`} className="rounded-2xl border border-ink/10 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold">{comment.place}</p>
                <span className="shrink-0 text-[11px] text-ink/40">{comment.when}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">{comment.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-7 flex items-center gap-2">
          <Camera size={18} className="text-coral" />
          <h3 className="font-display text-xl">Recent photos</h3>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {profile.photos.map((photo) => (
            <button
              key={photo.url}
              className="group relative overflow-hidden rounded-2xl focus-visible:ring-2 focus-visible:ring-blue"
              onClick={() => setSelectedPhoto(photo)}
              aria-label={`Open ${photo.alt}`}
            >
              <img
                src={photo.url}
                alt={photo.alt}
                className="aspect-square w-full object-cover transition duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent px-2 pb-2 pt-7 text-left text-[10px] font-bold text-white">
                View details
              </span>
            </button>
          ))}
        </div>

        {selectedPhoto && (
          <div
            className="fixed inset-0 z-[2100] grid place-items-center bg-ink/75 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={() => setSelectedPhoto(null)}
          >
            <section
              className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-cream shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Photo details"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="relative">
                <img src={selectedPhoto.url} alt={selectedPhoto.alt} className="max-h-[56vh] w-full object-cover" />
                <button
                  className="glass-button absolute right-4 top-4 !px-3"
                  onClick={() => setSelectedPhoto(null)}
                  aria-label="Close photo details"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <SampleBadge />
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink/55">
                    <CalendarDays size={14} /> {selectedPhoto.takenAt}
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-sm font-bold">
                  <MapPin size={15} className="text-blue" /> {selectedPhoto.location}
                </p>
                <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Photo comment</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink/75">
                    {selectedPhoto.comment ?? 'No comment was left with this photo.'}
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
