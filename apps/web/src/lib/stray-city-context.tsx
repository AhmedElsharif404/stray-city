import type {
  CrewMember,
  Echo,
  LocationVisibility,
  OpenPlan,
  Place,
  ScrapbookItem,
  Story,
  Trail,
} from '@stray-city/shared';
import type { User } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DEMO_USER_ID,
  demoBadges,
  demoCrew,
  demoEchoes,
  demoPlaces,
  demoPlans,
  demoScrapbook,
  demoStories,
  demoTrails,
} from '../data/demo';
import { distanceInMeters, type Coordinates } from './geo';
import { authorizedMediaUrl, isSupabaseConfigured, publicMediaUrl, supabase } from './supabase';

interface Notice {
  id: number;
  message: string;
  tone: 'success' | 'warning' | 'neutral';
}

interface CurrentProfile {
  id: string;
  displayName: string;
  username: string;
  email: string | null;
  role: 'member' | 'moderator' | 'admin';
  publicLeaderboard: boolean;
  isDemo: boolean;
  avatarPath: string | null;
}

interface StrayCityContextValue {
  places: Place[];
  trails: Trail[];
  echoes: Echo[];
  scrapbook: ScrapbookItem[];
  crew: CrewMember[];
  publicLeaderboard: CrewMember[];
  plans: OpenPlan[];
  stories: Story[];
  badges: typeof demoBadges;
  favorites: Set<string>;
  unlockedPlaces: Set<string>;
  trailProgress: Record<string, number>;
  streetCred: number;
  currentProfile: CurrentProfile;
  authUser: User | null;
  isDemoMode: boolean;
  loading: boolean;
  notice: Notice | null;
  dismissNotice: () => void;
  createTrail: (input: {
    title: string;
    description: string;
    kind: Trail['kind'];
    visibility: Trail['visibility'];
    estimatedMinutes: number;
    placeIds: string[];
  }) => Promise<void>;
  toggleFavorite: (placeId: string) => Promise<void>;
  checkIn: (place: Place, coordinates: Coordinates) => Promise<void>;
  previewEchoes: (placeId: string) => void;
  createEcho: (placeId: string, body: string, file: File | null) => Promise<void>;
  deleteEcho: (echoId: string) => Promise<void>;
  addScrapbookItem: (placeId: string, tip: string, file: File | null) => Promise<void>;
  reactToEcho: (echoId: string) => Promise<void>;
  reportContent: (targetType: string, targetId: string, reason: string) => Promise<void>;
  addPlan: (input: {
    place: Place;
    title: string;
    note: string;
    startsAt: string;
    endsAt: string;
    visibility: OpenPlan['visibility'];
    locationVisibility: LocationVisibility;
  }) => Promise<void>;
  rsvp: (planId: string) => Promise<void>;
  sendStray: (recipientId: string, placeId: string, message: string) => Promise<void>;
  requestFriend: (username: string) => Promise<void>;
  setPublicLeaderboardOptIn: (enabled: boolean) => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
  checkNearbyCrew: (coordinates: Coordinates) => Promise<void>;
  createStory: (
    placeId: string,
    caption: string,
    visibility: LocationVisibility,
    file: File,
  ) => Promise<void>;
  saveStoryAsEcho: (story: Story) => Promise<void>;
  completeTrailStop: (trail: Trail, place: Place, coordinates?: Coordinates) => Promise<void>;
  verifyCost: (placeId: string, costInfo: string) => Promise<void>;
  curatePlace: (input: {
    placeId: string;
    costVerified: boolean;
    costInfo: string;
    priceLevel: number | null;
    hiddenGemVerified: boolean;
    category: Place['category'];
    sidequestObjective: string;
  }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    username: string,
    phone: string,
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const StrayCityContext = createContext<StrayCityContextValue | null>(null);

function mapPlace(row: Record<string, unknown>): Place {
  return {
    id: String(row.id),
    name: String(row.name),
    category: row.category as Place['category'],
    lat: Number(row.lat),
    lng: Number(row.lng),
    address: (row.address as string | null) ?? null,
    borough: String(row.borough),
    neighborhood: (row.neighborhood as string | null) ?? null,
    description: String(row.description ?? ''),
    photos: ((row.photos as string[]) ?? []).map((path) => publicMediaUrl('place-media', path)),
    localTips: (row.local_tips as string[]) ?? [],
    tags: (row.tags as string[]) ?? [],
    cuisine: (row.cuisine as string | null) ?? null,
    sidequestObjective: (row.sidequest_objective as string | null) ?? null,
    costVerified: Boolean(row.cost_verified),
    costInfo: (row.cost_info as string | null) ?? null,
    priceLevel: row.price_level == null ? null : Number(row.price_level),
    hiddenGemVerified: Boolean(row.hidden_gem_verified),
    inspectionGrade: (row.inspection_grade as string | null) ?? null,
    inspectionScore: row.inspection_score == null ? null : Number(row.inspection_score),
    inspectionDate: (row.inspection_date as string | null) ?? null,
    eventStartsAt: (row.event_starts_at as string | null) ?? null,
    eventEndsAt: (row.event_ends_at as string | null) ?? null,
    source: row.source as Place['source'],
    sourceUrl: (row.source_url as string | null) ?? null,
    isSample: Boolean(row.is_sample),
  };
}

function mapTrail(row: Record<string, unknown>): Trail {
  const rawStops = ((row.trail_places as Record<string, unknown>[] | null) ?? []).sort(
    (left, right) => Number(left.position) - Number(right.position),
  );
  return {
    id: String(row.id),
    creatorId: String(row.creator_id),
    title: String(row.title),
    description: String(row.description ?? ''),
    kind: row.kind as Trail['kind'],
    visibility: row.visibility as Trail['visibility'],
    tags: (row.tags as string[]) ?? [],
    estimatedMinutes: Number(row.estimated_minutes ?? 120),
    coverPath: row.cover_path ? publicMediaUrl('place-media', String(row.cover_path)) : null,
    stops: rawStops.map((stop) => ({
      placeId: String(stop.place_id),
      position: Number(stop.position),
      clue: (stop.clue as string | null) ?? null,
      objective: (stop.objective as string | null) ?? null,
    })),
    isSample: Boolean(row.is_sample),
  };
}

function readFavoriteIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem('stray-city-favorites') ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function StrayCityProvider({ children }: PropsWithChildren) {
  const [places, setPlaces] = useState(demoPlaces);
  const [trails, setTrails] = useState(demoTrails);
  const [echoes, setEchoes] = useState(demoEchoes);
  const [scrapbook, setScrapbook] = useState(demoScrapbook);
  const [plans, setPlans] = useState(demoPlans);
  const [crewMembers, setCrewMembers] = useState(demoCrew);
  const [publicLeaderboard, setPublicLeaderboard] = useState(demoCrew);
  const [stories, setStories] = useState(demoStories);
  const [favorites, setFavorites] = useState<Set<string>>(readFavoriteIds);
  const [unlockedPlaces, setUnlockedPlaces] = useState<Set<string>>(new Set([demoPlaces[0]!.id]));
  const [trailProgress, setTrailProgress] = useState<Record<string, number>>({});
  const [streetCred, setStreetCred] = useState(238);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CurrentProfile>({
    id: DEMO_USER_ID,
    displayName: 'Alex',
    username: 'alexstrays',
    email: 'sample@stray.city',
    role: 'admin',
    publicLeaderboard: false,
    isDemo: true,
    avatarPath: 'https://i.pravatar.cc/160?img=68',
  });
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [notice, setNotice] = useState<Notice | null>(null);

  const notify = useCallback((message: string, tone: Notice['tone'] = 'success') => {
    setNotice({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    const load = async () => {
      const loadAllPlaces = async () => {
        const pageSize = 1000;
        const rows: Record<string, unknown>[] = [];
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await client
            .from('places')
            .select('*')
            .eq('is_active', true)
            .order('name')
            .range(from, from + pageSize - 1);
          if (error) return { data: null, error };
          rows.push(...((data ?? []) as Record<string, unknown>[]));
          if (!data || data.length < pageSize) break;
        }
        return { data: rows, error: null };
      };

      const [{ data: authData }, { data: placeRows, error }, { data: trailRows }] =
        await Promise.all([
          client.auth.getUser(),
          loadAllPlaces(),
          client
            .from('trails')
            .select('*, trail_places(place_id, position, clue, objective)')
            .eq('status', 'published')
            .is('deleted_at', null)
            .order('created_at', { ascending: false }),
        ]);
      if (!active) return;
      if (!error && placeRows?.length) setPlaces(placeRows.map(mapPlace));
      if (trailRows?.length)
        setTrails(trailRows.map((row) => mapTrail(row as Record<string, unknown>)));
      const user = authData.user;
      setAuthUser(user);
      setLoading(false);
    };
    void load();
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    if (!authUser) {
      setProfile({
        id: DEMO_USER_ID,
        displayName: 'Guest',
        username: 'guest',
        email: null,
        role: 'member',
        publicLeaderboard: false,
        isDemo: false,
        avatarPath: null,
      });
      setFavorites(new Set());
      return;
    }
    let active = true;
    const loadAccount = async () => {
      const [
        { data: userProfile },
        { data: favoriteRows },
        { data: crewRows },
        { data: publicRows },
        { data: storyRows },
        { data: planRows },
        { data: trailRows },
        { data: credRows },
      ] = await Promise.all([
        client.from('users').select('*').eq('id', authUser.id).single(),
        client.from('favorites').select('place_id').eq('user_id', authUser.id),
        client.rpc('crew_board'),
        client.rpc('public_leaderboard'),
        client.rpc('visible_stories'),
        client.rpc('visible_open_plans'),
        client
          .from('trails')
          .select('*, trail_places(place_id, position, clue, objective)')
          .eq('status', 'published')
          .is('deleted_at', null)
          .order('created_at', { ascending: false }),
        client.from('street_cred_events').select('points').eq('user_id', authUser.id),
      ]);
      if (!active) return;
      if (userProfile) {
        const avatarPath = userProfile.avatar_path
          ? await authorizedMediaUrl(String(userProfile.avatar_path))
          : null;
        setProfile({
          id: authUser.id,
          email: authUser.email ?? null,
          displayName: String(userProfile.display_name),
          username: String(userProfile.username),
          role: userProfile.role as CurrentProfile['role'],
          publicLeaderboard: Boolean(userProfile.public_leaderboard),
          isDemo: false,
          avatarPath,
        });
      }
      setFavorites(new Set((favoriteRows ?? []).map((row) => String(row.place_id))));
      setCrewMembers(
        (crewRows ?? [])
          .filter((row: Record<string, unknown>) => String(row.user_id) !== authUser.id)
          .map((row: Record<string, unknown>) => ({
            id: String(row.user_id),
            username: String(row.username),
            displayName: String(row.display_name),
            avatarPath: (row.avatar_path as string | null) ?? null,
            weeklyPoints: Number(row.weekly_points),
            isSample: false,
          })),
      );
      setPublicLeaderboard(
        (publicRows ?? []).map((row: Record<string, unknown>) => ({
          id: String(row.user_id),
          username: String(row.username),
          displayName: String(row.display_name),
          avatarPath: (row.avatar_path as string | null) ?? null,
          weeklyPoints: Number(row.weekly_points),
          isSample: false,
        })),
      );
      setStories(
        await Promise.all(
          (storyRows ?? []).map(async (row: Record<string, unknown>) => ({
            id: String(row.id),
            userId: String(row.user_id),
            username: String(row.username),
            displayName: String(row.display_name),
            avatarPath: (row.avatar_path as string | null) ?? null,
            mediaPath: await authorizedMediaUrl(String(row.media_path)),
            mediaKind: row.media_kind as Story['mediaKind'],
            caption: (row.caption as string | null) ?? null,
            createdAt: String(row.created_at),
            expiresAt: String(row.expires_at),
            placeId: (row.place_id as string | null) ?? null,
            placeName: (row.place_name as string | null) ?? null,
            borough: (row.borough as string | null) ?? null,
            neighborhood: (row.neighborhood as string | null) ?? null,
            isSample: false,
          })),
        ),
      );
      setPlans(
        (planRows ?? []).map((row: Record<string, unknown>) => {
          const placeId = (row.place_id as string | null) ?? null;
          const neighborhood = (row.neighborhood as string | null) ?? null;
          const borough = (row.borough as string | null) ?? null;
          return {
            id: String(row.id),
            creatorId: String(row.creator_id),
            creatorName: 'Crew member',
            title: String(row.title),
            note: (row.note as string | null) ?? null,
            startsAt: String(row.starts_at),
            endsAt: String(row.ends_at),
            visibility: row.visibility as OpenPlan['visibility'],
            locationVisibility: placeId
              ? 'exact'
              : neighborhood
                ? 'neighborhood'
                : borough
                  ? 'borough'
                  : 'hidden',
            placeId,
            placeName: (row.place_name as string | null) ?? null,
            borough,
            neighborhood,
            goingCount: 1,
            isSample: false,
          } satisfies OpenPlan;
        }),
      );
      if (trailRows?.length)
        setTrails(trailRows.map((row) => mapTrail(row as Record<string, unknown>)));
      setStreetCred((credRows ?? []).reduce((total, row) => total + Number(row.points), 0));
    };
    void loadAccount().catch((error: unknown) => {
      if (active)
        notify(error instanceof Error ? error.message : 'Could not load account data.', 'warning');
    });
    return () => {
      active = false;
    };
  }, [authUser, notify]);

  useEffect(() => {
    if (!supabase || !authUser) return;
    const channel = supabase
      .channel(`stray-city-live-${authUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'strays',
          filter: `recipient_id=eq.${authUser.id}`,
        },
        () => notify('A Crew member sent you a new Stray.', 'neutral'),
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plan_messages' }, () =>
        notify('A Crew plan has a new reply.', 'neutral'),
      )
      .subscribe();
    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [authUser, notify]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      localStorage.setItem('stray-city-favorites', JSON.stringify([...favorites]));
    }
  }, [favorites]);

  const requireAccount = () => {
    if (isSupabaseConfigured && !authUser) throw new Error('Sign in to use this feature.');
  };

  const createTrail: StrayCityContextValue['createTrail'] = async (input) => {
    const distinctPlaceIds = [...new Set(input.placeIds)].filter(Boolean);
    if (distinctPlaceIds.length < 2) throw new Error('Choose at least two different stops.');
    if (isSupabaseConfigured && !authUser) throw new Error('Sign in to publish a community trail.');
    const id = crypto.randomUUID();
    if (supabase && authUser) {
      const { error } = await supabase.from('trails').insert({
        id,
        creator_id: authUser.id,
        title: input.title,
        description: input.description,
        kind: input.kind,
        visibility: input.visibility,
        status: 'published',
        estimated_minutes: input.estimatedMinutes,
      });
      if (error) throw error;
      const { error: stopError } = await supabase.from('trail_places').insert(
        distinctPlaceIds.map((placeId, index) => ({
          trail_id: id,
          place_id: placeId,
          position: index + 1,
          clue:
            input.kind === 'mystery'
              ? `Clue ${index + 1}: follow the route and look for the place that fits this stop.`
              : null,
        })),
      );
      if (stopError) {
        await supabase.from('trails').delete().eq('id', id).eq('creator_id', authUser.id);
        throw stopError;
      }
    }
    const trail: Trail = {
      id,
      creatorId: profile.id,
      title: input.title,
      description: input.description,
      kind: input.kind,
      visibility: input.visibility,
      tags: [],
      estimatedMinutes: input.estimatedMinutes,
      coverPath: places.find((place) => place.id === distinctPlaceIds[0])?.photos[0] ?? null,
      stops: distinctPlaceIds.map((placeId, index) => ({
        placeId,
        position: index + 1,
        clue:
          input.kind === 'mystery'
            ? `Clue ${index + 1}: follow the route and look for the place that fits this stop.`
            : null,
        objective: null,
      })),
      isSample: !supabase,
    };
    setTrails((current) => [trail, ...current]);
    notify('Trail published for the city to follow.');
  };

  const toggleFavorite = async (placeId: string) => {
    requireAccount();
    const removing = favorites.has(placeId);
    setFavorites((current) => {
      const next = new Set(current);
      if (removing) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
    if (supabase && authUser) {
      const query = removing
        ? supabase.from('favorites').delete().eq('user_id', authUser.id).eq('place_id', placeId)
        : supabase.from('favorites').insert({ user_id: authUser.id, place_id: placeId });
      const { error } = await query;
      if (error) throw error;
    }
    notify(removing ? 'Removed from your saved places.' : 'Saved for later.');
  };

  const checkIn = async (place: Place, coordinates: Coordinates) => {
    requireAccount();
    if (supabase && authUser) {
      const { error } = await supabase.rpc('complete_check_in', {
        requested_place_id: place.id,
        current_lat: coordinates.lat,
        current_lng: coordinates.lng,
        current_accuracy_m: coordinates.accuracy ?? 100,
      });
      if (error) throw error;
      const { data: echoRows, error: echoError } = await supabase
        .from('echoes')
        .select(
          'id, place_id, user_id, photo_path, text, created_at, moderation_status, users(username)',
        )
        .eq('place_id', place.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (echoError) throw echoError;
      const hydrated = await Promise.all(
        (echoRows ?? []).map(async (row: Record<string, unknown>) => {
          const owner = row.users as { username?: string } | null;
          return {
            id: String(row.id),
            placeId: String(row.place_id),
            userId: String(row.user_id),
            username: owner?.username ?? 'wanderer',
            photoPath: await authorizedMediaUrl(String(row.photo_path)),
            text: String(row.text),
            reactionCount: 0,
            createdAt: String(row.created_at),
            unlocked: true,
            moderationStatus: row.moderation_status as Echo['moderationStatus'],
            isSample: false,
          } satisfies Echo;
        }),
      );
      setEchoes((current) => [...hydrated, ...current.filter((echo) => echo.placeId !== place.id)]);
    } else {
      const distance = distanceInMeters(coordinates, place);
      if (distance > Math.max(150, coordinates.accuracy ?? 0)) {
        throw new Error(`You are ${Math.round(distance)} m away. Check-ins unlock within 150 m.`);
      }
    }
    setUnlockedPlaces((current) => new Set(current).add(place.id));
    setStreetCred((current) => current + 10);
    notify('You’re here — Echoes unlocked. +10 Street Cred');
  };

  const upload = async (folder: string, file: File): Promise<string> => {
    if (!supabase || !authUser) return URL.createObjectURL(file);
    const extension = file.name.split('.').pop() || 'jpg';
    const path = `${authUser.id}/${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from('user-media')
      .upload(path, file, { contentType: file.type });
    if (error) throw error;
    return path;
  };

  const createEcho = async (placeId: string, body: string, file: File | null) => {
    requireAccount();
    if (!file) throw new Error('An Echo needs a photo.');
    const photoPath = await upload('echoes', file);
    const echo: Echo = {
      id: crypto.randomUUID(),
      placeId,
      userId: profile.id,
      username: profile.username,
      photoPath: URL.createObjectURL(file),
      text: body,
      reactionCount: 0,
      createdAt: new Date().toISOString(),
      unlocked: true,
      moderationStatus: 'clean',
      isSample: !supabase,
    };
    if (supabase && authUser) {
      const { error } = await supabase.from('echoes').insert({
        id: echo.id,
        place_id: placeId,
        user_id: authUser.id,
        photo_path: photoPath,
        text: body,
      });
      if (error) throw error;
    }
    setEchoes((current) => [echo, ...current]);
    setStreetCred((current) => current + 5);
    notify('Echo left for the next wanderer. +5 Street Cred');
  };

  const deleteEcho = async (echoId: string) => {
    requireAccount();
    if (supabase && authUser) {
      const { error } = await supabase
        .from('echoes')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', echoId)
        .eq('user_id', authUser.id);
      if (error) throw error;
    }
    setEchoes((current) => current.filter((echo) => echo.id !== echoId));
    notify('Your Echo was removed.', 'neutral');
  };

  const addScrapbookItem = async (placeId: string, tip: string, file: File | null) => {
    requireAccount();
    const photoPath = file ? await upload('scrapbook', file) : null;
    const item: ScrapbookItem = {
      id: crypto.randomUUID(),
      placeId,
      userId: profile.id,
      username: profile.username,
      photoPath: file ? URL.createObjectURL(file) : null,
      tip: tip || null,
      createdAt: new Date().toISOString(),
      isSample: !supabase,
    };
    if (supabase && authUser) {
      const { error } = await supabase.from('scrapbook_items').insert({
        id: item.id,
        place_id: placeId,
        user_id: authUser.id,
        photo_path: photoPath,
        tip: tip || null,
      });
      if (error) throw error;
    }
    setScrapbook((current) => [item, ...current]);
    setStreetCred((current) => current + 2);
    notify('Added to the community scrapbook. +2 Street Cred');
  };

  const reactToEcho = async (echoId: string) => {
    requireAccount();
    if (supabase && authUser) {
      const { error } = await supabase.from('echo_reactions').upsert({
        echo_id: echoId,
        user_id: authUser.id,
        reaction: 'heart',
      });
      if (error) throw error;
    }
    setEchoes((current) =>
      current.map((echo) =>
        echo.id === echoId ? { ...echo, reactionCount: echo.reactionCount + 1 } : echo,
      ),
    );
  };

  const reportContent = async (targetType: string, targetId: string, reason: string) => {
    requireAccount();
    if (supabase && authUser) {
      const { error } = await supabase.from('content_reports').insert({
        reporter_id: authUser.id,
        target_type: targetType,
        target_id: targetId,
        reason,
      });
      if (error) throw error;
    }
    notify('Report received. Thank you for looking out for the community.', 'neutral');
  };

  const addPlan: StrayCityContextValue['addPlan'] = async (input) => {
    requireAccount();
    const id = crypto.randomUUID();
    if (supabase && authUser) {
      const { error } = await supabase.from('open_plans').insert({
        id,
        creator_id: authUser.id,
        title: input.title,
        note: input.note || null,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        visibility: input.visibility,
        location_visibility: input.locationVisibility,
      });
      if (error) throw error;
      const { error: locationError } = await supabase
        .from('open_plan_locations')
        .insert({ plan_id: id, place_id: input.place.id });
      if (locationError) throw locationError;
    }
    setPlans((current) => [
      {
        id,
        creatorId: profile.id,
        creatorName: profile.displayName,
        title: input.title,
        note: input.note || null,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        visibility: input.visibility,
        locationVisibility: input.locationVisibility,
        placeId: input.locationVisibility === 'exact' ? input.place.id : null,
        placeName: input.locationVisibility === 'exact' ? input.place.name : null,
        borough: input.locationVisibility !== 'hidden' ? input.place.borough : null,
        neighborhood:
          input.locationVisibility === 'neighborhood' || input.locationVisibility === 'exact'
            ? input.place.neighborhood
            : null,
        goingCount: 1,
        isSample: !supabase,
      },
      ...current,
    ]);
    notify('Open Plan posted to your Crew.');
  };

  const rsvp = async (planId: string) => {
    requireAccount();
    if (supabase && authUser) {
      const { error } = await supabase.from('plan_rsvps').upsert({
        plan_id: planId,
        user_id: authUser.id,
        status: 'going',
      });
      if (error) throw error;
    }
    setPlans((current) =>
      current.map((plan) =>
        plan.id === planId ? { ...plan, goingCount: plan.goingCount + 1 } : plan,
      ),
    );
    notify('You’re in. The plan is now on your radar.');
  };

  const sendStray = async (recipientId: string, placeId: string, message: string) => {
    requireAccount();
    if (supabase && authUser) {
      const { error } = await supabase.from('strays').insert({
        sender_id: authUser.id,
        recipient_id: recipientId,
        place_id: placeId,
        message,
      });
      if (error) throw error;
    }
    notify('Stray sent. Adventure pending.');
  };

  const requestFriend = async (username: string) => {
    requireAccount();
    if (supabase && authUser) {
      const { error } = await supabase.rpc('request_friend_by_username', {
        requested_username: username.replace(/^@/, ''),
      });
      if (error) throw error;
    }
    notify(`Crew request sent to @${username.replace(/^@/, '')}.`);
  };

  const setPublicLeaderboardOptIn = async (enabled: boolean) => {
    requireAccount();
    if (supabase && authUser) {
      const { error } = await supabase
        .from('users')
        .update({ public_leaderboard: enabled })
        .eq('id', authUser.id);
      if (error) throw error;
    }
    setProfile((current) => ({ ...current, publicLeaderboard: enabled }));
    notify(
      enabled ? 'You joined the public leaderboard.' : 'You left the public leaderboard.',
      'neutral',
    );
  };

  const checkNearbyCrew = async (coordinates: Coordinates) => {
    requireAccount();
    if (supabase && authUser) {
      const { data: sessionId, error } = await supabase.rpc('begin_signal_session', {
        current_lat: coordinates.lat,
        current_lng: coordinates.lng,
        current_accuracy_m: coordinates.accuracy ?? 100,
        requested_radius_m: 1500,
      });
      if (error) throw error;
      const { data, error: nearbyError } = await supabase.rpc('nearby_crew', {
        active_session_id: sessionId,
      });
      if (nearbyError) throw nearbyError;
      const distances = new Map<string, number>(
        (data ?? []).map((row: Record<string, unknown>) => [
          String(row.user_id),
          Number(row.distance_band_m),
        ]),
      );
      setCrewMembers((current) =>
        current.map((member) => ({ ...member, nearbyDistanceM: distances.get(member.id) })),
      );
    } else {
      setCrewMembers((current) =>
        current.map((member, index) => ({
          ...member,
          nearbyDistanceM: index < 2 ? 400 + index * 500 : undefined,
        })),
      );
    }
    notify('Active Signal check complete. Only mutually opted-in Crew can appear.');
  };

  const createStory: StrayCityContextValue['createStory'] = async (
    placeId,
    caption,
    visibility,
    file,
  ) => {
    requireAccount();
    const place = places.find((item) => item.id === placeId);
    if (!place) throw new Error('Place not found.');
    const mediaPath = await upload('stories', file);
    const id = crypto.randomUUID();
    if (supabase && authUser) {
      const { error } = await supabase.from('stories').insert({
        id,
        user_id: authUser.id,
        media_path: mediaPath,
        media_kind: file.type.startsWith('video/') ? 'video' : 'photo',
        caption: caption || null,
        location_visibility: visibility,
      });
      if (error) throw error;
      const { error: locationError } = await supabase
        .from('story_locations')
        .insert({ story_id: id, place_id: placeId });
      if (locationError) throw locationError;
    }
    setStories((current) => [
      {
        id,
        userId: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarPath: null,
        mediaPath: URL.createObjectURL(file),
        mediaKind: file.type.startsWith('video/') ? 'video' : 'photo',
        caption: caption || null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        placeId: visibility === 'exact' ? place.id : null,
        placeName: visibility === 'exact' ? place.name : null,
        borough: visibility === 'hidden' ? null : place.borough,
        neighborhood: ['neighborhood', 'exact'].includes(visibility) ? place.neighborhood : null,
        isSample: !supabase,
      },
      ...current,
    ]);
    setStreetCred((current) => current + 2);
    notify('Story shared with your Crew for 24 hours.');
  };

  const saveStoryAsEcho = async (story: Story) => {
    requireAccount();
    if (!story.placeId) throw new Error('Only Stories with an exact place can become Echoes.');
    let id: string = crypto.randomUUID();
    if (supabase && authUser) {
      const { data, error } = await supabase.rpc('save_story_as_echo', {
        requested_story_id: story.id,
      });
      if (error) throw error;
      id = String(data);
    }
    setEchoes((current) => [
      {
        id,
        placeId: story.placeId!,
        userId: profile.id,
        username: profile.username,
        photoPath: story.mediaPath,
        text: story.caption || 'A moment saved from my Stray Story.',
        reactionCount: 0,
        createdAt: new Date().toISOString(),
        unlocked: true,
        moderationStatus: 'clean',
        isSample: !supabase,
      },
      ...current,
    ]);
    notify('Story saved permanently as an Echo.');
  };

  const completeTrailStop: StrayCityContextValue['completeTrailStop'] = async (
    trail,
    place,
    coordinates,
  ) => {
    requireAccount();
    if (supabase && authUser) {
      if (!coordinates) throw new Error('Location is required to complete a trail stop.');
      const { data, error } = await supabase.rpc('complete_trail_stop', {
        requested_trail_id: trail.id,
        requested_place_id: place.id,
        current_lat: coordinates.lat,
        current_lng: coordinates.lng,
        current_accuracy_m: coordinates.accuracy ?? 100,
      });
      if (error) throw error;
      setTrailProgress((current) => ({ ...current, [trail.id]: Number(data) }));
    } else {
      const next = Math.min((trailProgress[trail.id] ?? 0) + 1, trail.stops.length);
      setTrailProgress((current) => ({ ...current, [trail.id]: next }));
      if (next === trail.stops.length) setStreetCred((current) => current + 30);
    }
    notify('Trail step complete. The next clue is ready.');
  };

  const verifyCost = async (placeId: string, costInfo: string) => {
    requireAccount();
    if (supabase) {
      const { error } = await supabase.rpc('verify_place_cost', {
        requested_place_id: placeId,
        verified: true,
        cost_description: costInfo,
        audit_note: 'Verified in Stray City admin.',
      });
      if (error) throw error;
    }
    setPlaces((current) =>
      current.map((place) =>
        place.id === placeId ? { ...place, costVerified: true, costInfo } : place,
      ),
    );
    notify('Pricing verified and added to budget filters.');
  };

  const curatePlace: StrayCityContextValue['curatePlace'] = async (input) => {
    requireAccount();
    if (supabase) {
      const { error } = await supabase.rpc('curate_place', {
        requested_place_id: input.placeId,
        requested_cost_verified: input.costVerified,
        requested_cost_info: input.costInfo,
        requested_price_level: input.priceLevel,
        requested_hidden_gem_verified: input.hiddenGemVerified,
        requested_category: input.category,
        requested_sidequest_objective: input.sidequestObjective,
      });
      if (error) throw error;
    }
    setPlaces((current) =>
      current.map((place) =>
        place.id === input.placeId
          ? {
              ...place,
              costVerified: input.costVerified,
              costInfo: input.costVerified ? input.costInfo : null,
              priceLevel: input.costVerified ? input.priceLevel : null,
              hiddenGemVerified: input.hiddenGemVerified,
              category: input.category,
              sidequestObjective: input.sidequestObjective || null,
            }
          : place,
      ),
    );
    notify('Place curation saved and added to the audit log.');
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      notify('Demo mode: connect Supabase to use real accounts.', 'neutral');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    notify('Welcome back.');
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    username: string,
    phone: string,
  ) => {
    if (!supabase) {
      notify('Demo mode: connect Supabase to create a real account.', 'neutral');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    const phoneE164 = phone.trim().startsWith('+')
      ? `+${digits}`
      : digits.length === 10
        ? `+1${digits}`
        : digits.length === 11 && digits.startsWith('1')
          ? `+${digits}`
          : '';
    if (!/^\+[1-9][0-9]{7,14}$/.test(phoneE164)) {
      throw new Error('Enter a valid phone number with country code.');
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, username, phone_e164: phoneE164 } },
    });
    if (error) throw error;
    notify('Account created. Check your email if confirmation is enabled.');
  };

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setAuthUser(null);
    notify('Signed out.');
  };

  const updateAvatar = async (file: File) => {
    if (!supabase || !authUser) {
      notify('Sign in to add a profile photo.', 'neutral');
      return;
    }
    if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
    if (file.size > 5 * 1024 * 1024) throw new Error('Profile photos must be 5 MB or smaller.');
    const extension = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    const avatarPath = `${authUser.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('user-media')
      .upload(avatarPath, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { error: profileError } = await supabase
      .from('users')
      .update({ avatar_path: avatarPath })
      .eq('id', authUser.id);
    if (profileError) throw profileError;
    const signedUrl = await authorizedMediaUrl(avatarPath);
    setProfile((current) => ({ ...current, avatarPath: signedUrl }));
    notify('Profile photo updated.');
  };

  const value = useMemo<StrayCityContextValue>(
    () => ({
      places,
      trails,
      echoes,
      scrapbook,
      crew: crewMembers,
      publicLeaderboard,
      plans,
      stories,
      badges: demoBadges,
      favorites,
      unlockedPlaces,
      trailProgress,
      streetCred,
      currentProfile: profile,
      authUser,
      isDemoMode: !isSupabaseConfigured,
      loading,
      notice,
      dismissNotice: () => setNotice(null),
      createTrail,
      toggleFavorite,
      checkIn,
      previewEchoes: (placeId) => {
        setUnlockedPlaces((current) => new Set(current).add(placeId));
        notify('Sample preview unlocked — no Street Cred awarded.', 'neutral');
      },
      createEcho,
      deleteEcho,
      addScrapbookItem,
      reactToEcho,
      reportContent,
      addPlan,
      rsvp,
      sendStray,
      requestFriend,
      setPublicLeaderboardOptIn,
      updateAvatar,
      checkNearbyCrew,
      createStory,
      saveStoryAsEcho,
      completeTrailStop,
      verifyCost,
      curatePlace,
      signIn,
      signUp,
      signOut,
    }),
    [
      places,
      trails,
      echoes,
      scrapbook,
      plans,
      crewMembers,
      publicLeaderboard,
      stories,
      favorites,
      unlockedPlaces,
      trailProgress,
      streetCred,
      profile,
      authUser,
      loading,
      notice,
    ],
  );

  return <StrayCityContext.Provider value={value}>{children}</StrayCityContext.Provider>;
}

export function useStrayCity(): StrayCityContextValue {
  const value = useContext(StrayCityContext);
  if (!value) throw new Error('useStrayCity must be used within StrayCityProvider.');
  return value;
}
