import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  Flag,
  Heart,
  LockKeyhole,
  MapPin,
  MessageCircleHeart,
  Navigation,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import type { Place } from '@stray-city/shared';

import { getBrowserLocation } from '../lib/geo';
import { categoryMeta, placePhoto, placeSummary, timeAgo } from '../lib/format';
import { useStrayCity } from '../lib/stray-city-context';
import { SampleBadge } from './SampleBadge';
import { StrayCardDialog } from './StrayCardDialog';

export function PlacePanel({ place, onClose }: { place: Place; onClose: () => void }) {
  const {
    echoes,
    scrapbook,
    crew,
    favorites,
    unlockedPlaces,
    isDemoMode,
    currentProfile,
    toggleFavorite,
    checkIn,
    previewEchoes,
    createEcho,
    deleteEcho,
    addScrapbookItem,
    reactToEcho,
    reportContent,
    sendStray,
  } = useStrayCity();
  const [tab, setTab] = useState<'about' | 'echoes' | 'scrapbook'>('about');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const placeEchoes = useMemo(
    () => echoes.filter((echo) => echo.placeId === place.id),
    [echoes, place.id],
  );
  const placeScrapbook = useMemo(
    () => scrapbook.filter((item) => item.placeId === place.id),
    [scrapbook, place.id],
  );
  const unlocked = unlockedPlaces.has(place.id);
  const meta = categoryMeta[place.category];

  const handleCheckIn = async () => {
    setBusy(true);
    setError('');
    try {
      await checkIn(place, await getBrowserLocation());
      setTab('echoes');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Check-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const submitEcho = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = (data.get('photo') as File | null) ?? null;
    setBusy(true);
    setError('');
    try {
      await createEcho(place.id, String(data.get('text')), file?.size ? file : null);
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not leave Echo.');
    } finally {
      setBusy(false);
    }
  };

  const submitScrapbook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = (data.get('photo') as File | null) ?? null;
    setBusy(true);
    try {
      await addScrapbookItem(place.id, String(data.get('tip')), file?.size ? file : null);
      form.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add scrapbook item.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="place-panel" aria-label={`${place.name} details`}>
      <div className="relative h-64 bg-ink/5">
        <img src={placePhoto(place)} alt={place.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-ink/10" />
        <div className="absolute inset-x-0 top-0 flex justify-between p-4">
          <button className="glass-button" onClick={onClose}>
            <ChevronLeft size={18} />
            Back
          </button>
          <button className="glass-button !px-3" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {place.isSample && <SampleBadge className="absolute bottom-4 left-4" />}
      </div>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="category-label" style={{ color: meta.color }}>
              <span>{meta.icon}</span>
              {meta.label}
            </span>
            <h2 className="mt-2 font-display text-3xl leading-tight">{place.name}</h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink/55">
              <MapPin size={15} />
              {place.address ?? `${place.neighborhood}, ${place.borough}`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="micro-chip">{meta.icon} {meta.label}</span>
              <span className="micro-chip">{place.borough}</span>
              {place.cuisine && <span className="micro-chip">{place.cuisine}</span>}
            </div>
          </div>
          <button
            className={`icon-button shrink-0 ${favorites.has(place.id) ? '!bg-coral !text-white' : ''}`}
            onClick={() => void toggleFavorite(place.id)}
            aria-label="Favorite"
          >
            <Heart size={19} fill={favorites.has(place.id) ? 'currentColor' : 'none'} />
          </button>
        </div>

        <p className="mt-4 line-clamp-3 rounded-2xl border border-blue/10 bg-blue/5 p-4 text-sm leading-relaxed text-ink/75">
          {placeSummary(place)}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button className="action-tile" onClick={() => void handleCheckIn()} disabled={busy}>
            <Navigation size={18} />
            <span>{busy ? 'Checking…' : "I'm here"}</span>
          </button>
          <button className="action-tile" onClick={() => setInviteOpen(true)}>
            <Send size={18} />
            <span>Send a Stray</span>
          </button>
          <button className="action-tile" onClick={() => setShareOpen(true)}>
            <Share2 size={18} />
            <span>Stray Card</span>
          </button>
        </div>
        {error && <div className="mt-3 rounded-xl bg-coral/10 p-3 text-sm text-coral">{error}</div>}

        <div className="mt-6 flex border-b border-ink/10">
          {(['about', 'echoes', 'scrapbook'] as const).map((value) => (
            <button
              key={value}
              className={`panel-tab ${tab === value ? 'panel-tab-active' : ''}`}
              onClick={() => setTab(value)}
            >
              {value === 'about'
                ? 'About'
                : value === 'echoes'
                  ? `Echoes · ${placeEchoes.length}`
                  : `Scrapbook · ${placeScrapbook.length}`}
            </button>
          ))}
        </div>

        {tab === 'about' && (
          <div className="space-y-6 pt-5">
            <p className="leading-relaxed text-ink/75">{placeSummary(place)}</p>
            {place.sidequestObjective && (
              <div className="rounded-2xl bg-mint/20 p-4">
                <p className="flex items-center gap-2 font-bold">
                  <Sparkles size={17} />
                  Sidequest objective
                </p>
                <p className="mt-2 text-sm leading-relaxed">{place.sidequestObjective}</p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {place.costVerified && (
                <div className="info-card">
                  <CircleDollarSign size={19} className="text-gold" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink/45">
                      Verified cost
                    </p>
                    <p className="mt-1 font-semibold">{place.costInfo}</p>
                  </div>
                </div>
              )}
              {place.inspectionGrade && (
                <div className="info-card">
                  <ShieldCheck size={19} className="text-blue" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-ink/45">
                      NYC inspection
                    </p>
                    <p className="mt-1 font-semibold">
                      Grade {place.inspectionGrade}
                      {place.inspectionDate ? ` · ${place.inspectionDate}` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
            {place.inspectionGrade && (
              <p className="text-xs leading-relaxed text-ink/45">
                Inspection data is informational only. It does not determine price or hidden-gem
                status.
              </p>
            )}
            {place.localTips.length > 0 && (
              <div>
                <h3 className="font-display text-xl">Local tips</h3>
                <ul className="mt-3 space-y-2">
                  {place.localTips.map((tip) => (
                    <li key={tip} className="flex gap-2 text-sm text-ink/70">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-mint" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {place.tags.map((tag) => (
                <span className="tag" key={tag}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {tab === 'echoes' && (
          <div className="pt-5">
            {!unlocked ? (
              <div className="rounded-3xl bg-violet/10 p-7 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-violet text-white">
                  <LockKeyhole size={22} />
                </span>
                <h3 className="mt-4 font-display text-2xl">Echoes are place-bound.</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink/60">
                  Check in within 150 meters to read notes left by people who stood here before you.
                </p>
                <button className="button-primary mt-5" onClick={() => void handleCheckIn()}>
                  <Navigation size={17} />
                  I’m here
                </button>
                {isDemoMode && (
                  <button
                    className="mt-3 block w-full text-sm font-semibold underline"
                    onClick={() => previewEchoes(place.id)}
                  >
                    Preview sample Echoes
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <form
                  className="rounded-2xl border border-ink/10 bg-white p-4"
                  onSubmit={(event) => void submitEcho(event)}
                >
                  <p className="font-bold">Leave an Echo</p>
                  <textarea
                    name="text"
                    required
                    maxLength={1000}
                    placeholder="A note for someone who makes it here…"
                    className="mt-3"
                  />
                  <label className="upload-field mt-3">
                    <Camera size={17} />
                    <span>Add a photo</span>
                    <input
                      type="file"
                      name="photo"
                      accept="image/*"
                      capture="environment"
                      required
                    />
                  </label>
                  <button className="button-primary mt-3 w-full" disabled={busy}>
                    <MessageCircleHeart size={17} />
                    Pin this Echo
                  </button>
                </form>
                {placeEchoes.map((echo) => (
                  <article
                    key={echo.id}
                    className="overflow-hidden rounded-2xl border border-ink/10 bg-white"
                  >
                    {echo.photoPath && (
                      <img src={echo.photoPath} alt="" className="h-48 w-full object-cover" />
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold">
                          @{echo.username} {echo.isSample && <SampleBadge />}
                        </p>
                        <span className="text-xs text-ink/45">{timeAgo(echo.createdAt)}</span>
                      </div>
                      <p className="mt-3 leading-relaxed">{echo.text}</p>
                      <div className="mt-4 flex items-center justify-between">
                        <button className="micro-action" onClick={() => void reactToEcho(echo.id)}>
                          <Heart size={15} />
                          {echo.reactionCount}
                        </button>
                        <div className="flex gap-2">
                          {echo.userId === currentProfile.id && (
                            <button
                              className="micro-action text-coral"
                              onClick={() => void deleteEcho(echo.id)}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          )}
                          <button
                            className="micro-action text-ink/45"
                            onClick={() =>
                              void reportContent(
                                'echo',
                                echo.id,
                                'Community report from place detail',
                              )
                            }
                          >
                            <Flag size={14} />
                            Report
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
                {!placeEchoes.length && (
                  <p className="py-8 text-center text-sm text-ink/50">
                    No Echoes yet. You could leave the first.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'scrapbook' && (
          <div className="space-y-4 pt-5">
            <form
              className="rounded-2xl border border-ink/10 bg-white p-4"
              onSubmit={(event) => void submitScrapbook(event)}
            >
              <p className="font-bold">Add to the scrapbook</p>
              <textarea
                name="tip"
                maxLength={500}
                placeholder="A quick tip for everyone…"
                className="mt-3"
              />
              <label className="upload-field mt-3">
                <Upload size={17} />
                <span>Optional photo</span>
                <input type="file" name="photo" accept="image/*" capture="environment" />
              </label>
              <button className="button-secondary mt-3 w-full" disabled={busy}>
                Add to scrapbook
              </button>
            </form>
            {placeScrapbook.map((item) => (
              <article key={item.id} className="rounded-2xl border border-ink/10 bg-white p-4">
                {item.photoPath && (
                  <img
                    src={item.photoPath}
                    alt=""
                    className="mb-3 h-44 w-full rounded-xl object-cover"
                  />
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold">
                    @{item.username} {item.isSample && <SampleBadge />}
                  </p>
                  <button
                    className="micro-action text-ink/45"
                    onClick={() =>
                      void reportContent(
                        'scrapbook_item',
                        item.id,
                        'Community report from place scrapbook',
                      )
                    }
                  >
                    <Flag size={14} />
                    Report
                  </button>
                </div>
                {item.tip && <p className="mt-2 text-sm leading-relaxed text-ink/70">{item.tip}</p>}
              </article>
            ))}
            {!placeScrapbook.length && (
              <p className="py-8 text-center text-sm text-ink/50">
                The scrapbook is waiting for its first page.
              </p>
            )}
          </div>
        )}
      </div>

      {shareOpen && <StrayCardDialog place={place} onClose={() => setShareOpen(false)} />}
      {inviteOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setInviteOpen(false)}
        >
          <section
            className="modal-card max-w-md"
            role="dialog"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="icon-button absolute right-4 top-4"
              onClick={() => setInviteOpen(false)}
            >
              <X size={18} />
            </button>
            <p className="eyebrow">Send a Stray</p>
            <h2 className="mt-2 font-display text-3xl">Who should meet you here?</h2>
            <div className="mt-5 space-y-2">
              {crew.map((member) => (
                <button
                  key={member.id}
                  className="flex w-full items-center gap-3 rounded-2xl border border-ink/10 bg-white p-3 text-left hover:border-coral"
                  onClick={() => {
                    void sendStray(member.id, place.id, "Let's hang out");
                    setInviteOpen(false);
                  }}
                >
                  <img
                    src={member.avatarPath ?? ''}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <span className="flex-1">
                    <b>{member.displayName}</b>
                    <small className="block text-ink/50">@{member.username}</small>
                  </span>
                  <Send size={17} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}
