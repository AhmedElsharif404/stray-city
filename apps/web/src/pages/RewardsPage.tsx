import {
  Award,
  Crown,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { SampleBadge } from '../components/SampleBadge';
import { useStrayCity } from '../lib/stray-city-context';

export function RewardsPage() {
  const { badges, crew, publicLeaderboard, currentProfile, streetCred, setPublicLeaderboardOptIn } =
    useStrayCity();
  const [boardMode, setBoardMode] = useState<'crew' | 'public'>('crew');
  const crewBoard = [
    ...crew,
    {
      id: currentProfile.id,
      username: currentProfile.username,
      displayName: currentProfile.displayName,
      avatarPath: null,
      weeklyPoints: streetCred,
      isSample: currentProfile.isDemo,
    },
  ].sort((a, b) => b.weeklyPoints - a.weeklyPoints);
  const board = boardMode === 'crew' ? crewBoard : publicLeaderboard;

  return (
    <div className="page-shell">
      <section className="page-hero bg-gold text-ink">
        <div>
          <p className="eyebrow">Earned by actually going</p>
          <h1>Street Cred, not screen time.</h1>
          <p>
            Points come from spaced-out, verified visits and real contributions. Rankings reset
            every week; City Stamps stay yours.
          </p>
        </div>
        <Award className="hero-icon opacity-25" />
      </section>

      <div className="mt-7 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <section className="rounded-[28px] bg-ink p-6 text-cream shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow !text-mint">Weekly leaderboard</p>
              <h2 className="mt-1 font-display text-3xl">
                {boardMode === 'crew' ? 'Crew Board' : 'Public Board'}
              </h2>
            </div>
            {boardMode === 'crew' ? (
              <UsersRound className="text-mint" />
            ) : (
              <Globe2 className="text-mint" />
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 rounded-full bg-white/7 p-1">
            <button
              className={`rounded-full px-3 py-2 text-sm font-bold ${boardMode === 'crew' ? 'bg-mint text-ink' : 'text-cream/60'}`}
              onClick={() => setBoardMode('crew')}
            >
              My Crew
            </button>
            <button
              className={`rounded-full px-3 py-2 text-sm font-bold ${boardMode === 'public' ? 'bg-mint text-ink' : 'text-cream/60'}`}
              onClick={() => setBoardMode('public')}
            >
              Opt-in public
            </button>
          </div>
          <div className="mt-5 space-y-2">
            {board.map((member, index) => (
              <div
                key={member.id}
                className={`flex items-center gap-3 rounded-2xl p-3 ${member.id === currentProfile.id ? 'bg-mint text-ink' : 'bg-white/7'}`}
              >
                <span className="w-7 text-center font-display text-2xl font-bold">{index + 1}</span>
                {member.avatarPath ? (
                  <img
                    src={member.avatarPath}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-coral font-bold text-white">
                    {member.displayName[0]}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {member.displayName} {member.isSample && <SampleBadge />}
                  </p>
                  <p
                    className={`text-xs ${member.id === currentProfile.id ? 'text-ink/60' : 'text-cream/50'}`}
                  >
                    @{member.username}
                  </p>
                </div>
                <b>{member.weeklyPoints}</b>
              </div>
            ))}
            {!board.length && (
              <p className="rounded-2xl bg-white/7 p-4 text-center text-sm text-cream/55">
                No one has opted in yet.
              </p>
            )}
          </div>
          <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-white/7 p-4 text-sm">
            <span>
              <b className="block">Include me publicly</b>
              <small className="text-cream/50">
                Crew ranking is always private to accepted friends.
              </small>
            </span>
            <input
              type="checkbox"
              checked={currentProfile.publicLeaderboard}
              onChange={(event) => void setPublicLeaderboardOptIn(event.target.checked)}
            className="h-5 w-5 accent-[#4B73F2]"
            />
          </label>
          <div className="mt-3 flex items-start gap-2 rounded-2xl bg-white/7 p-4 text-xs leading-relaxed text-cream/55">
            <ShieldCheck size={17} className="shrink-0 text-mint" />
            Anti-abuse checks dedupe visits and require time between check-ins. Public ranking is
            opt-in only.
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Permanent achievements</p>
              <h2 className="mt-1 font-display text-3xl">City Stamps</h2>
            </div>
            <div className="text-right">
              <p className="font-display text-4xl">
                {badges.filter((badge) => badge.earned).length}
              </p>
              <p className="text-xs font-semibold text-ink/45">of {badges.length} earned</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {badges.map((badge) => (
              <article
                key={badge.slug}
                className={`relative overflow-hidden rounded-2xl border p-4 ${badge.earned ? 'border-gold/60 bg-white' : 'border-ink/10 bg-ink/[.035]'}`}
              >
                <div className="flex gap-3">
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl ${badge.earned ? 'bg-gold/20' : 'grayscale bg-ink/5 opacity-45'}`}
                  >
                    {badge.earned ? badge.icon : <LockKeyhole size={18} />}
                  </span>
                  <div>
                    <h3 className="font-bold">{badge.name}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink/55">{badge.description}</p>
                  </div>
                </div>
                {badge.earned && (
                  <span className="absolute right-2 top-2 text-gold">
                    <Crown size={15} />
                  </span>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8 flex flex-col items-start justify-between gap-4 rounded-[28px] border border-ink/10 bg-white p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-blue/10 text-blue">
            <TrendingUp />
          </span>
          <div>
            <h3 className="font-display text-2xl">{streetCred} total Street Cred</h3>
            <p className="text-sm text-ink/55">
              You’re {Math.max(0, 1000 - streetCred)} points from City Legend.
            </p>
          </div>
        </div>
        {currentProfile.role !== 'member' && (
          <Link to="/admin" className="button-secondary">
            Open admin tools
          </Link>
        )}
      </section>
    </div>
  );
}
