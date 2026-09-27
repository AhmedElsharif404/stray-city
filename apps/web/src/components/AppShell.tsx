import {
  Award,
  ChevronDown,
  Heart,
  Images,
  LogOut,
  Map,
  Menu,
  MessageCircleHeart,
  Route,
  Settings,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { useState, type PropsWithChildren } from 'react';
import { NavLink } from 'react-router-dom';

import { useStrayCity } from '../lib/stray-city-context';
import { AuthDialog } from './AuthDialog';

const navItems = [
  { to: '/', label: 'Explore', icon: Map },
  { to: '/trails', label: 'Trails', icon: Route },
  { to: '/crew', label: 'Crew', icon: UsersRound },
  { to: '/stories', label: 'Stories', icon: MessageCircleHeart },
  { to: '/rewards', label: 'Street Cred', icon: Award },
];

export function AppShell({ children }: PropsWithChildren) {
  const { authUser, currentProfile, isDemoMode, notice, dismissNotice, signOut, streetCred } =
    useStrayCity();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="sticky top-0 z-[1000] border-b border-ink/10 bg-cream/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-[1600px] items-center gap-6 px-4 sm:px-6">
          <NavLink
            to="/"
            className="group flex shrink-0 items-center gap-3"
            aria-label="Stray City home"
          >
            <span className="brand-logo-crop transition-transform group-hover:-rotate-3">
              <img src="/city-stray-logo.png" alt="" className="brand-logo-image" />
            </span>
            <span className="hidden sm:block">
              <span className="block font-display text-[1.55rem] font-bold leading-none tracking-[-0.04em]">
                Stray City
              </span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-blue">
                Find your own way
              </span>
            </span>
          </NavLink>

          <nav
            className="hidden flex-1 items-center justify-center gap-1 lg:flex"
            aria-label="Primary navigation"
          >
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden rounded-full bg-ink px-3 py-2 text-xs font-bold text-cream sm:block">
              {streetCred} cred
            </div>
            {isDemoMode && (
              <span className="hidden text-xs font-semibold text-ink/55 md:block">Demo mode</span>
            )}
            <div className="relative">
              <button
                className="avatar-button pl-1.5"
                onClick={() => setAccountOpen((value) => !value)}
                aria-label="Open account menu"
                aria-expanded={accountOpen}
              >
                {currentProfile.avatarPath ? (
                  <img
                    src={currentProfile.avatarPath}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-blue/15"
                  />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-blue text-xs text-white">
                    {currentProfile.displayName.slice(0, 1).toUpperCase() || <UserRound size={16} />}
                  </span>
                )}
                <span className="hidden sm:inline">{currentProfile.displayName}</span>
                <ChevronDown size={15} className="text-ink/45" />
              </button>
              {accountOpen && (
                <div className="account-menu">
                  <div className="border-b border-ink/10 px-4 py-3">
                    <p className="font-bold">{currentProfile.displayName}</p>
                    <p className="text-xs text-ink/50">@{currentProfile.username}</p>
                  </div>
                  <NavLink to="/profile" onClick={() => setAccountOpen(false)}>
                    <UserRound size={17} /> Profile
                  </NavLink>
                  <NavLink to="/gallery" onClick={() => setAccountOpen(false)}>
                    <Images size={17} /> My gallery
                  </NavLink>
                  <NavLink to="/preferences" onClick={() => setAccountOpen(false)}>
                    <SlidersHorizontal size={17} /> Preferences
                  </NavLink>
                  <NavLink to="/settings" onClick={() => setAccountOpen(false)}>
                    <Settings size={17} /> Settings
                  </NavLink>
                  <NavLink to="/rewards" onClick={() => setAccountOpen(false)}>
                    <Heart size={17} /> Saved & rewards
                  </NavLink>
                  <div className="border-t border-ink/10 p-2">
                    {authUser ? (
                      <button
                        onClick={() => {
                          setAccountOpen(false);
                          void signOut();
                        }}
                      >
                        <LogOut size={17} /> Sign out
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setAccountOpen(false);
                          setAuthOpen(true);
                        }}
                      >
                        <UserRound size={17} /> Sign in or register
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              className="icon-button lg:hidden"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="grid grid-cols-2 gap-2 border-t border-ink/10 p-3 lg:hidden">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `nav-link justify-start ${isActive ? 'nav-link-active' : ''}`
                }
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main>{children}</main>

      {notice && (
        <button
          onClick={dismissNotice}
          className={`notice notice-${notice.tone}`}
          aria-label="Dismiss notification"
        >
          {notice.message}
          <X size={16} />
        </button>
      )}
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
