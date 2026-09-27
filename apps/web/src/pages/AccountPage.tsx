import { Bell, Images, LockKeyhole, MapPin, MessageCircle, RefreshCw, Settings, SlidersHorizontal, UserRound } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useStrayCity } from '../lib/stray-city-context';
import { supabase } from '../lib/supabase';

interface GalleryItem {
  id: string;
  image_url: string | null;
  storage_path: string | null;
  caption: string | null;
  captured_at: string;
  signedUrl?: string;
}

const sections = [
  { to: '/profile', label: 'Profile', icon: UserRound },
  { to: '/gallery', label: 'My gallery', icon: Images },
  { to: '/preferences', label: 'Preferences', icon: SlidersHorizontal },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const imessageAgentPhone = import.meta.env.VITE_IMESSAGE_AGENT_PHONE?.trim() || '+14156055508';
const imessageAgentPhoneDisplay = '(415) 605-5508';

export function AccountPage() {
  const location = useLocation();
  const { authUser, currentProfile, updateAvatar } = useStrayCity();
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [avatarPending, setAvatarPending] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const section = location.pathname.slice(1);

  const loadGallery = useCallback(async () => {
    if (!supabase || !authUser) return;
    setGalleryLoading(true);
    try {
      const { data } = await supabase
        .from('user_gallery_items')
        .select('id, image_url, storage_path, caption, captured_at')
        .eq('user_id', authUser.id)
        .order('captured_at', { ascending: false });
      const rows = await Promise.all(
        ((data ?? []) as GalleryItem[]).map(async (item) => {
          if (!item.storage_path) return { ...item, signedUrl: item.image_url ?? undefined };
          const { data: signed } = await supabase!.storage
            .from('imessage-gallery')
            .createSignedUrl(item.storage_path, 60 * 60);
          return { ...item, signedUrl: signed?.signedUrl };
        }),
      );
      setGallery(rows);
    } finally {
      setGalleryLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    if (section !== 'gallery' || !authUser) return;
    void loadGallery();
    const timer = window.setInterval(() => void loadGallery(), 15_000);
    return () => window.clearInterval(timer);
  }, [authUser, loadGallery, section]);

  return (
    <div className="page-shell py-8">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-[28px] border border-ink/10 bg-white p-3 shadow-card">
          <div className="flex items-center gap-3 p-3">
            {currentProfile.avatarPath ? (
              <img src={currentProfile.avatarPath} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-full bg-blue font-bold text-white">
                {currentProfile.displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-bold">{currentProfile.displayName}</p>
              <p className="truncate text-xs text-ink/50">@{currentProfile.username}</p>
            </div>
          </div>
          <nav className="mt-2 space-y-1">
            {sections.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
                <Icon size={17} /> {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <section className="min-h-[420px] rounded-[32px] border border-ink/10 bg-white p-6 shadow-card sm:p-8">
          {section === 'profile' && (
            <>
              <p className="eyebrow">Your public identity</p>
              <h1 className="mt-2 font-display text-4xl">{currentProfile.displayName}</h1>
              <p className="mt-2 text-ink/55">@{currentProfile.username}</p>
              <div className="mt-6 flex items-center gap-4 rounded-2xl border border-ink/10 p-4">
                {currentProfile.avatarPath ? (
                  <img src={currentProfile.avatarPath} alt="Your profile" className="h-20 w-20 rounded-2xl object-cover" />
                ) : (
                  <span className="grid h-20 w-20 place-items-center rounded-2xl bg-blue text-2xl font-bold text-white">{currentProfile.displayName.slice(0, 1).toUpperCase()}</span>
                )}
                <div>
                  <p className="font-bold">Profile photo</p>
                  <p className="mt-1 text-sm text-ink/50">Shown in your account menu, comments, and crew profile.</p>
                  <input
                    ref={avatarInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setAvatarPending(true);
                      void updateAvatar(file).finally(() => setAvatarPending(false));
                    }}
                  />
                  <button className="button-secondary mt-3 py-2" disabled={avatarPending || !authUser} onClick={() => avatarInput.current?.click()}>
                    {avatarPending ? 'Uploading…' : authUser ? 'Choose photo' : 'Sign in to add photo'}
                  </button>
                </div>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-blue/5 p-5"><MapPin className="text-blue" /><p className="mt-3 font-bold">New York explorer</p><p className="mt-1 text-sm text-ink/55">Your discoveries, trails, and photos live here.</p></div>
                <div className="rounded-2xl bg-coral/5 p-5"><LockKeyhole className="text-coral" /><p className="mt-3 font-bold">Phone kept private</p><p className="mt-1 text-sm text-ink/55">Used only to connect iMessage photos to this account.</p></div>
              </div>
            </>
          )}
          {section === 'gallery' && (
            <>
              <p className="eyebrow">Sent from iMessage</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <h1 className="font-display text-4xl">My gallery</h1>
                {authUser && (
                  <button className="button-secondary py-2" disabled={galleryLoading} onClick={() => void loadGallery()}>
                    <RefreshCw size={16} className={galleryLoading ? 'animate-spin' : ''} /> Refresh
                  </button>
                )}
              </div>
              <div className="mt-6 rounded-[24px] bg-gradient-to-br from-ink to-violet p-5 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">Stray City iMessage</p>
                    <p className="mt-1 text-2xl font-bold">{imessageAgentPhoneDisplay}</p>
                    <p className="mt-1 text-sm text-white/65">Send an image from the same phone number used for your account.</p>
                  </div>
                  <a href={`sms:${imessageAgentPhone}`} className="inline-flex items-center gap-2 rounded-full bg-coral px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5">
                    <MessageCircle size={18} /> Text a photo
                  </a>
                </div>
              </div>
              {!authUser ? <p className="mt-6 text-ink/60">Sign in to see photos connected to your phone number.</p> : gallery.length === 0 ? <p className="mt-6 text-ink/60">Your private gallery is ready. Send a photo to the Stray City iMessage agent to begin.</p> : <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">{gallery.map((item) => item.signedUrl && <figure key={item.id} className="overflow-hidden rounded-2xl bg-ink/5"><img src={item.signedUrl} alt={item.caption ?? 'Gallery photo'} className="aspect-square w-full object-cover" /><figcaption className="p-3 text-xs text-ink/60">{item.caption ?? new Date(item.captured_at).toLocaleString()}</figcaption></figure>)}</div>}
            </>
          )}
          {section === 'preferences' && (
            <>
              <p className="eyebrow">Make Stray City yours</p><h1 className="mt-2 font-display text-4xl">Preferences</h1>
              <div className="mt-7 space-y-3">{['Hidden gems first', 'Low-cost places', 'Food and coffee', 'Art and culture'].map((label, index) => <label key={label} className="flex items-center justify-between rounded-2xl border border-ink/10 p-4 font-semibold"><span>{label}</span><input type="checkbox" defaultChecked={index < 2} className="h-5 w-5 accent-blue" /></label>)}</div>
            </>
          )}
          {section === 'settings' && (
            <>
              <p className="eyebrow">Account controls</p><h1 className="mt-2 font-display text-4xl">Settings</h1>
              <div className="mt-7 space-y-3"><div className="flex items-center gap-4 rounded-2xl border border-ink/10 p-4"><Bell className="text-blue" /><div><p className="font-bold">Notifications</p><p className="text-sm text-ink/55">Choose when Stray City gets your attention.</p></div></div><div className="flex items-center gap-4 rounded-2xl border border-ink/10 p-4"><LockKeyhole className="text-coral" /><div><p className="font-bold">Privacy & safety</p><p className="text-sm text-ink/55">Your phone and iMessage gallery stay private.</p></div></div></div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
