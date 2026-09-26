import { normalizedPlaceInputSchema, type NormalizedPlaceInput } from '@stray-city/shared';

import { requireSupabaseAdmin } from '../lib/supabase.js';
import { fetchParks, fetchRestaurants, fetchTicketmasterEvents } from './sources.js';

export type EtlSource = 'nyc_parks' | 'nyc_restaurant_inspection' | 'ticketmaster';

const sourceFetchers: Record<EtlSource, (limit: number) => Promise<NormalizedPlaceInput[]>> = {
  nyc_parks: fetchParks,
  nyc_restaurant_inspection: fetchRestaurants,
  ticketmaster: fetchTicketmasterEvents,
};

export interface EtlResult {
  runId: string;
  source: EtlSource;
  seen: number;
  upserted: number;
  rejected: number;
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
      else {
        rejected.push({
          run_id: run.id,
          external_id: place.external_id ?? null,
          reason: parsed.error.issues.map((issue) => issue.message).join('; '),
          payload: place,
        });
      }
    }

    for (let index = 0; index < valid.length; index += 250) {
      const batch = valid.slice(index, index + 250);
      const { error } = await supabase.from('places').upsert(batch, {
        onConflict: 'source,external_id',
        ignoreDuplicates: false,
      });
      if (error) throw error;
    }

    if (rejected.length) {
      const { error } = await supabase.from('etl_rejections').insert(rejected);
      if (error) throw error;
    }

    await supabase
      .from('etl_runs')
      .update({
        status: 'succeeded',
        rows_seen: fetched.length,
        rows_upserted: valid.length,
        rows_rejected: rejected.length,
        finished_at: new Date().toISOString(),
      })
      .eq('id', run.id);

    return {
      runId: run.id,
      source,
      seen: fetched.length,
      upserted: valid.length,
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
    results.push(await runEtl(source, limit));
  }
  return results;
}
