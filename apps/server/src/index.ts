import cron from 'node-cron';

import { app } from './app.js';
import { config, hasSupabaseAdmin } from './config.js';
import { runAllEtl } from './etl/runner.js';
import { startSpectrumAgent } from './spectrum-agent.js';

app.listen(config.PORT, () => {
  console.log(`Stray City server listening on http://localhost:${config.PORT}`);
  startSpectrumAgent();
});

if (config.ETL_CRON_ENABLED && hasSupabaseAdmin) {
  cron.schedule(config.ETL_CRON_SCHEDULE, () => {
    void runAllEtl().catch((error) => console.error('Scheduled ETL failed', error));
  });
  console.log(`ETL schedule enabled: ${config.ETL_CRON_SCHEDULE}`);
}
