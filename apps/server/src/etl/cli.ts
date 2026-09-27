import { runAllEtl, runEtl, type EtlSource } from './runner.js';

const sourceAliases: Record<string, EtlSource> = {
  parks: 'nyc_parks',
  inspections: 'nyc_restaurant_inspection',
  events: 'ticketmaster',
  catalog: 'osm_catalog',
};

const requested = process.argv[2] ?? 'all';
const limit = Number(process.env.ETL_LIMIT ?? 500);
if (!Number.isInteger(limit) || limit <= 0 || limit > 5000) {
  throw new Error('ETL_LIMIT must be an integer between 1 and 5000.');
}

const result =
  requested === 'all'
    ? await runAllEtl(limit)
    : await runEtl(
        sourceAliases[requested] ??
          (() => {
            throw new Error(`Unknown ETL source: ${requested}`);
          })(),
        limit,
      );

console.log(JSON.stringify(result, null, 2));
