import { Camera, Clock3, Flag, MapPin, Save, Shield, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import type { LocationVisibility } from '@stray-city/shared';

import { SampleBadge } from '../components/SampleBadge';
import { timeAgo } from '../lib/format';
import { useStrayCity } from '../lib/stray-city-context';

export function StoriesPage() {
  const { stories, places, createStory, saveStoryAsEcho, reportContent, currentProfile } =
    useStrayCity();
  const [selected, setSelected] = useState(stories[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = stories.find((story) => story.id === selected) ?? stories[0];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get('media') as File;
    if (!file?.size) {
      setError('Choose a photo or short video first.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await createStory(
        String(data.get('placeId')),
        String(data.get('caption')),
        data.get('visibility') as LocationVisibility,
        file,
      );
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not share Story.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell">
      <section className="page-hero bg-coral text-white">
        <div>
          <p className="eyebrow !text-white/65">24 hours, unless you keep it</p>
          <h1>City moments, still warm.</h1>
          <p>
            Share a quick place-bound photo or video with your Crew. You choose how precise the
            location appears.
          </p>
        </div>
        <Camera className="hero-icon" />
      </section>

      <div className="mt-7 flex gap-3 overflow-x-auto pb-3">
        {stories.map((story) => (
          <button
            key={story.id}
            className="shrink-0 text-center"
            onClick={() => setSelected(story.id)}
          >
            <span
              className={`block rounded-full p-1 ${active?.id === story.id ? 'bg-coral' : 'bg-gradient-to-br from-mint to-violet'}`}
            >
              <img
                src={story.avatarPath ?? story.mediaPath}
                alt=""
                className="h-16 w-16 rounded-full border-2 border-cream object-cover"
              />
            </span>
            <span className="mt-1 block max-w-[72px] truncate text-xs font-semibold">
              {story.userId === currentProfile.id ? 'You' : story.displayName}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_.78fr]">
        <section className="min-h-[600px] overflow-hidden rounded-[32px] bg-ink text-white shadow-card">
          {active ? (
            <div className="grid min-h-[600px] md:grid-cols-[1.2fr_.8fr]">
              <div className="relative min-h-[420px] bg-black">
                {active.mediaKind === 'video' ? (
                  <video src={active.mediaPath} controls className="h-full w-full object-cover" />
                ) : (
                  <img src={active.mediaPath} alt="" className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
                <div className="absolute left-5 top-5 flex items-center gap-3">
                  <img
                    src={active.avatarPath ?? active.mediaPath}
                    alt=""
                    className="h-10 w-10 rounded-full border-2 border-white object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold">
                      {active.displayName} {active.isSample && <SampleBadge />}
                    </p>
                    <p className="text-xs text-white/65">{timeAgo(active.createdAt)}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-between p-7">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="eyebrow !text-mint">From the city</p>
                    <button
                      className="flex items-center gap-1 text-xs font-bold text-white/50 hover:text-white"
                      onClick={() =>
                        void reportContent('story', active.id, 'Community report from Stories')
                      }
                    >
                      <Flag size={13} />
                      Report
                    </button>
                  </div>
                  <p className="mt-4 font-display text-3xl leading-tight">
                    “{active.caption || 'A small moment worth sharing.'}”
                  </p>
                  <div className="mt-5 flex items-start gap-2 text-sm text-white/60">
                    <MapPin size={16} className="mt-0.5" />
                    <span>
                      {active.placeName ??
                        active.neighborhood ??
                        active.borough ??
                        'Location hidden by poster'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-white/60">
                    <Clock3 size={16} />
                    <span>
                      Expires{' '}
                      {timeAgo(
                        new Date(new Date(active.expiresAt).getTime() - 86_400_000).toISOString(),
                      ).replace('ago', 'after posting')}
                    </span>
                  </div>
                </div>
                {active.userId === currentProfile.id &&
                  active.placeId &&
                  active.mediaKind === 'photo' && (
                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 font-bold text-ink"
                      onClick={() => void saveStoryAsEcho(active)}
                    >
                      <Save size={17} />
                      Save permanently as Echo
                    </button>
                  )}
              </div>
            </div>
          ) : (
            <div className="grid min-h-[600px] place-items-center text-white/50">
              Your Crew hasn’t posted a Story yet.
            </div>
          )}
        </section>

        <form
          className="h-fit rounded-[28px] border border-ink/10 bg-white p-6 shadow-card"
          onSubmit={(event) => void submit(event)}
        >
          <div className="flex items-center gap-2 text-coral">
            <Sparkles size={18} />
            <p className="eyebrow !text-coral">New Story</p>
          </div>
          <h2 className="mt-2 font-display text-3xl">What did you find?</h2>
          <div className="mt-5 space-y-4">
            <label className="upload-drop">
              <Camera size={24} />
              <b>Add photo or short video</b>
              <span>Camera capture works on supported phones</span>
              <input
                name="media"
                type="file"
                accept="image/*,video/mp4,video/webm"
                capture="environment"
              />
            </label>
            <label className="field-label">
              Place
              <select name="placeId" required>
                {places.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Caption
              <textarea name="caption" maxLength={500} placeholder="The city did a thing…" />
            </label>
            <label className="field-label">
              Location detail
              <select name="visibility" defaultValue="neighborhood">
                <option value="exact">Exact place</option>
                <option value="neighborhood">Neighborhood only</option>
                <option value="borough">Borough only</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
            <p className="flex items-start gap-2 rounded-xl bg-blue/10 p-3 text-xs leading-relaxed text-blue">
              <Shield size={15} className="mt-0.5 shrink-0" />
              Visible only to accepted Crew for 24 hours. Your setting controls how much place
              information they see.
            </p>
            {error && <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{error}</p>}
            <button className="button-primary w-full" disabled={busy}>
              {busy ? 'Sharing…' : 'Share with Crew'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
