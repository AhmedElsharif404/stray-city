import { normalizedPlaceInputSchema, type NormalizedPlaceInput } from '@stray-city/shared';

import { requireSupabaseAdmin } from '../lib/supabase.js';
import { fetchCatalog } from './catalog.js';
import { fetchParks, fetchRestaurants, fetchTicketmasterEvents } from './sources.js';

export type EtlSource = 'nyc_parks' | 'nyc_restaurant_inspection' | 'ticketmaster' | 'osm_catalog';

const sourceFetchers: Record<EtlSource, (limit: number) => Promise<NormalizedPlaceInput[]>> = {
  nyc_parks: fetchParks,
  nyc_restaurant_inspection: fetchRestaurants,
  ticketmaster: fetchTicketmasterEvents,
  osm_catalog: fetchCatalog,
};

export interface EtlResult {
  runId: string;
  source: EtlSource;
  read: number;
  created: number;
  updated: number;
  skipped: number;
  rejected: number;
}

interface Counts {
  created: number;
  updated: number;
  skipped: number;
}

async function upsertCatalogPlaces(
  source: EtlSource,
  places: NormalizedPlaceInput[],
): Promise<Counts> {
  const supabase = requireSupabaseAdmin();
  const externalIds = places.map((place) => place.external_id);
  const { data: existing, error: existingError } = await supabase
    .from('places')
    .select('external_id')
    .eq('source', source)
    .in('external_id', externalIds);
  if (existingError) throw existingError;
  const existingIds = new Set((existing ?? []).map((row) => String(row.external_id)));
  let updated = 0;
  let created = 0;

  for (let index = 0; index < places.length; index += 250) {
    const batch = places.slice(index, index + 250);
    const { data, error } = await supabase
      .from('places')
      .upsert(batch, { onConflict: 'source,external_id', ignoreDuplicates: false })
      .select('id, external_id');
    if (error) throw error;
    for (const row of data ?? []) {
      if (existingIds.has(String(row.external_id))) updated += 1;
      else created += 1;
    }
    const byExternalId = new Map(batch.map((place) => [place.external_id, place]));
    const sourceRows = (data ?? []).map((row) => {
      const place = byExternalId.get(String(row.external_id))!;
      return {
        place_id: row.id,
        provider: source,
        external_id: place.external_id,
        source_url: place.source_url,
        raw_payload: place.source_payload,
        last_synced_at: new Date().toISOString(),
      };
    });
    if (sourceRows.length) {
      const { error: sourceError } = await supabase
        .from('place_sources')
        .upsert(sourceRows, { onConflict: 'provider,external_id' });
      if (sourceError) throw sourceError;
    }
  }
  return { created, updated, skipped: 0 };
}

async function archiveExpiredEvents(): Promise<void> {
  const { error } = await requireSupabaseAdmin()
    .from('places')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('source', 'ticketmaster')
    .lt('event_ends_at', new Date().toISOString())
    .eq('is_active', true);
  if (error) throw error;
}

export async function runEtl(source: EtlSource, limit = 500): Promise<EtlResult> {
  const supabase = requireSupabaseAdmin();
  const { data: run, error: runError } = await supabase
    .from('etl_runs')
    .insert({ source, status: 'running' })
    .select('id')
    .single();
  if (runError) throw runError;

  try {
    const fetched = await sourceFetchers[source](limit);
    const valid: NormalizedPlaceInput[] = [];
    const rejected: Array<{
      run_id: string;
      external_id: string | null;
      reason: string;
      payload: unknown;
    }> = [];

    for (const place of fetched) {
      const parsed = normalizedPlaceInputSchema.safeParse(place);
      if (parsed.success) valid.push(parsed.data);
      else
        rejected.push({
          run_id: run.id,
          external_id: place.external_id ?? null,
          reason: parsed.error.issues.map((issue) => issue.message).join('; '),
          payload: place,
        });
    }

    const counts = await upsertCatalogPlaces(source, valid);
    if (source === 'ticketmaster') await archiveExpiredEvents();

    if (rejected.length) {
      const { error } = await supabase.from('etl_rejections').insert(rejected);
      if (error) throw error;
    }

    await supabase
      .from('etl_runs')
      .update({
        status: 'succeeded',
        rows_seen: fetched.length,
        rows_upserted: counts.created + counts.updated,
        rows_rejected: rejected.length,
        records_read: fetched.length,
        records_created: counts.created,
        records_updated: counts.updated,
        records_skipped: counts.skipped + rejected.length,
        finished_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    return {
      runId: run.id,
      source,
      read: fetched.length,
      created: counts.created,
      updated: counts.updated,
      skipped: counts.skipped,
      rejected: rejected.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown ETL failure';
    await supabase
      .from('etl_runs')
      .update({ status: 'failed', error_message: message, finished_at: new Date().toISOString() })
      .eq('id', run.id);
    throw error;
  }
}

export async function runAllEtl(limit = 500): Promise<EtlResult[]> {
  const results: EtlResult[] = [];
  for (const source of Object.keys(sourceFetchers) as EtlSource[]) {
    if (source === 'ticketmaster' && !process.env.TICKETMASTER_API_KEY) continue;
    if (source === 'osm_catalog' && !process.env.CATALOG_DATA_PATH) continue;
    results.push(await runEtl(source, limit));
  }
  return results;
}
