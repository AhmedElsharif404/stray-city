import 'dotenv/config';

import { z } from 'zod';

const optionalSecret = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: optionalSecret,
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
  TICKETMASTER_API_KEY: optionalSecret,
  NYC_OPEN_DATA_APP_TOKEN: optionalSecret,
  ETL_ADMIN_TOKEN: optionalSecret,
  ETL_CRON_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  ETL_CRON_SCHEDULE: z.string().default('0 */6 * * *'),
});

export const config = envSchema.parse(process.env);

export const hasSupabaseAdmin = Boolean(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY);
