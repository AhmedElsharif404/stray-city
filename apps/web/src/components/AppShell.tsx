import {
  Award,
  Map,
  Menu,
  MessageCircleHeart,
  Route,
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
  const { currentProfile, isDemoMode, notice, dismissNotice, streetCred } = useStrayCity();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

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
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-mint">
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
            <button
              className="avatar-button"
              onClick={() => setAuthOpen(true)}
              aria-label="Open account"
            >
              <UserRound size={18} />
              <span className="hidden sm:inline">{currentProfile.displayName}</span>
            </button>
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
