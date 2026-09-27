import { Camera, MapPin, MessageCircleHeart, X } from 'lucide-react';

import { sampleProfileDetails } from '../lib/sample-reviews';
import { SampleBadge } from './SampleBadge';

export function SampleProfileDialog({ username, onClose }: { username: string; onClose: () => void }) {
  const profile = sampleProfileDetails(username);
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
            <img
              key={photo.url}
              src={photo.url}
              alt={photo.alt}
              className="aspect-square w-full rounded-2xl object-cover"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
