import {
  CalendarPlus,
  Check,
  Coffee,
  MapPin,
  MessageCircle,
  Navigation,
  Radio,
  Send,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { formatDateTime } from '../lib/format';
import { formatDistance, getBrowserLocation } from '../lib/geo';
import { useStrayCity } from '../lib/stray-city-context';
import { SampleBadge } from '../components/SampleBadge';

export function CrewPage() {
  const {
    crew,
    places,
    plans,
    addPlan,
    rsvp,
    sendStray,
    requestFriend,
    checkNearbyCrew,
    isDemoMode,
  } = useStrayCity();
  const [tab, setTab] = useState<'crew' | 'plans'>('crew');
  const [signalBusy, setSignalBusy] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [replyPlanId, setReplyPlanId] = useState<string | null>(null);
  const [pollVote, setPollVote] = useState('');

  const signal = async () => {
    setSignalBusy(true);
    setError('');
    try {
      await checkNearbyCrew(
        isDemoMode ? { lat: 40.75, lng: -73.93, accuracy: 30 } : await getBrowserLocation(),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Signal check failed.');
    } finally {
      setSignalBusy(false);
    }
  };

  const submitPlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const place = places.find((item) => item.id === data.get('placeId'));
    if (!place) return;
    await addPlan({
      place,
      title: String(data.get('title')),
      note: String(data.get('note')),
      startsAt: new Date(String(data.get('startsAt'))).toISOString(),
      endsAt: new Date(String(data.get('endsAt'))).toISOString(),
      visibility: 'crew',
      locationVisibility: data.get('locationVisibility') as
        'hidden' | 'borough' | 'neighborhood' | 'exact',
    });
    form.reset();
  };

  return (
    <div className="page-shell">
      <section className="page-hero bg-blue text-white">
        <div>
          <p className="eyebrow !text-white/60">Mutual by design</p>
          <h1>Your people, outside.</h1>
          <p>
            Send a place, make a loose plan, or actively check whether an opted-in friend is nearby.
          </p>
        </div>
        <UsersRound className="hero-icon" />
      </section>

      <div className="mt-7 flex gap-2">
        <button
          className={`segment ${tab === 'crew' ? 'segment-active' : ''}`}
          onClick={() => setTab('crew')}
        >
          Crew
        </button>
        <button
          className={`segment ${tab === 'plans' ? 'segment-active' : ''}`}
          onClick={() => setTab('plans')}
        >
          Open Plans
        </button>
      </div>

      {tab === 'crew' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <section>
            <div className="flex items-end justify-between">
              <div>
                <p className="eyebrow">Accepted friends</p>
                <h2 className="mt-1 font-display text-3xl">Your Crew</h2>
              </div>
              <button className="button-secondary" onClick={() => setAddOpen(true)}>
                <UserPlus size={17} />
                Add friends
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {crew.map((member) => (
                <article
                  key={member.id}
                  className="flex items-center gap-4 rounded-3xl border border-ink/10 bg-white p-4"
                >
                  <div className="relative">
                    <img
                      src={member.avatarPath ?? ''}
                      alt=""
                      className="h-14 w-14 rounded-full object-cover"
                    />
                    {member.nearbyDistanceM && (
                      <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-mint" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {member.displayName} {member.isSample && <SampleBadge />}
                    </p>
                    <p className="text-sm text-ink/50">
                      @{member.username} · {member.weeklyPoints} this week
                    </p>
                    {member.nearbyDistanceM && (
                      <p className="mt-1 text-xs font-bold text-blue">
                        Active nearby · about {formatDistance(member.nearbyDistanceM)}
                      </p>
                    )}
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => void sendStray(member.id, places[0]!.id, "Let's grab coffee")}
                    title="Send a Stray"
                  >
                    <Send size={18} />
                  </button>
                </article>
              ))}
            </div>
          </section>
          <aside className="rounded-[28px] bg-ink p-6 text-cream">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-mint text-ink">
              <Radio size={22} />
            </span>
            <h2 className="mt-5 font-display text-3xl">Signals</h2>
            <p className="mt-3 text-sm leading-relaxed text-cream/65">
              This is an active check—not background tracking. While this tab is open, Stray City
              shares only a rounded distance with accepted friends who also enabled Signals and
              checked in recently.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-cream/70">
              <li className="flex gap-2">
                <Check size={16} className="text-mint" />
                Mutual consent required
              </li>
              <li className="flex gap-2">
                <Check size={16} className="text-mint" />
                Expires after 20 minutes
              </li>
              <li className="flex gap-2">
                <Check size={16} className="text-mint" />
                No background geofencing
              </li>
            </ul>
            <button
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-mint px-5 py-3 font-bold text-ink"
              onClick={() => void signal()}
              disabled={signalBusy}
            >
              <Navigation size={17} />
              {signalBusy ? 'Checking…' : 'Check nearby Crew'}
            </button>
            {error && <p className="mt-3 text-sm text-coral">{error}</p>}
          </aside>
        </div>
      )}

      {tab === 'plans' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_.82fr]">
          <section>
            <p className="eyebrow">Loose enough to be fun</p>
            <h2 className="mt-1 font-display text-3xl">Open Plans</h2>
            <div className="mt-4 space-y-4">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className="rounded-[26px] border border-ink/10 bg-white p-5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-blue">
                        {formatDateTime(plan.startsAt)}
                      </p>
                      <h3 className="mt-2 font-display text-2xl">{plan.title}</h3>
                      <p className="mt-2 text-sm text-ink/60">{plan.note}</p>
                    </div>
                    {plan.isSample && <SampleBadge />}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink/55">
                    <span className="flex items-center gap-1">
                      <MapPin size={15} />
                      {plan.placeName ??
                        plan.neighborhood ??
                        plan.borough ??
                        'Location shared after RSVP'}
                    </span>
                    <span className="flex items-center gap-1">
                      <UsersRound size={15} />
                      {plan.goingCount} going
                    </span>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button className="button-primary !py-2.5" onClick={() => void rsvp(plan.id)}>
                      I’m in
                    </button>
                    <button
                      className="button-secondary !py-2.5"
                      onClick={() => setReplyPlanId(replyPlanId === plan.id ? null : plan.id)}
                    >
                      <MessageCircle size={16} />
                      Quick reply
                    </button>
                  </div>
                  {replyPlanId === plan.id && (
                    <div className="mt-4 rounded-2xl bg-ink/5 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-ink/45">
                        Quick replies
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {['On my way', '15 min late', 'Where exactly?'].map((reply) => (
                          <button
                            key={reply}
                            className="vibe-chip"
                            onClick={() => setReplyPlanId(null)}
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink/45">
                        Plan poll · meet time?
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {['6:00 PM', '6:30 PM'].map((option) => (
                          <button
                            key={option}
                            className={`rounded-xl border p-2 text-sm font-bold ${pollVote === option ? 'border-blue bg-blue/10 text-blue' : 'border-ink/10 bg-white'}`}
                            onClick={() => setPollVote(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
          <form
            className="h-fit rounded-[28px] border border-ink/10 bg-white p-6 shadow-card"
            onSubmit={(event) => void submitPlan(event)}
          >
            <div className="flex items-center gap-2 text-coral">
              <CalendarPlus size={19} />
              <p className="eyebrow !text-coral">Post a plan</p>
            </div>
            <h2 className="mt-2 font-display text-3xl">Put something out there.</h2>
            <div className="mt-5 space-y-4">
              <label className="field-label">
                Title
                <input name="title" required placeholder="Coffee after work?" />
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
                Note
                <textarea name="note" maxLength={1000} placeholder="Keep it easy…" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="field-label">
                  Starts
                  <input type="datetime-local" name="startsAt" required />
                </label>
                <label className="field-label">
                  Ends
                  <input type="datetime-local" name="endsAt" required />
                </label>
              </div>
              <label className="field-label">
                Location shown
                <select name="locationVisibility" defaultValue="exact">
                  <option value="exact">Exact place</option>
                  <option value="neighborhood">Neighborhood</option>
                  <option value="borough">Borough only</option>
                  <option value="hidden">After RSVP</option>
                </select>
              </label>
              <button className="button-primary w-full">
                <Coffee size={17} />
                Post to Crew
              </button>
            </div>
          </form>
        </div>
      )}
      {addOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setAddOpen(false)}>
          <form
            className="modal-card max-w-sm"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              const username = String(new FormData(event.currentTarget).get('username'));
              void requestFriend(username).then(() => setAddOpen(false));
            }}
          >
            <button
              type="button"
              className="icon-button absolute right-4 top-4"
              onClick={() => setAddOpen(false)}
            >
              <X size={18} />
            </button>
            <p className="eyebrow">Mutual connection</p>
            <h2 className="mt-2 font-display text-3xl">Add to your Crew</h2>
            <p className="mt-2 text-sm text-ink/55">
              They’ll need to accept before either of you can share Crew-only plans or Signals.
            </p>
            <label className="field-label mt-5">
              Username
              <input name="username" required placeholder="@cityfriend" />
            </label>
            <button className="button-primary mt-4 w-full">
              <UserPlus size={17} />
              Send request
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
