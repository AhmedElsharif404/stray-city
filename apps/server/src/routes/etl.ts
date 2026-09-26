import { Router } from 'express';

import { etlRequestSchema } from '@stray-city/shared';

import { config } from '../config.js';
import { runAllEtl, runEtl, type EtlSource } from '../etl/runner.js';
import { HttpError } from '../lib/http.js';

const validSources = new Set<EtlSource>(['nyc_parks', 'nyc_restaurant_inspection', 'ticketmaster']);

export const etlRouter = Router();

etlRouter.use((request, _response, next) => {
  if (!config.ETL_ADMIN_TOKEN) {
    next(new HttpError(503, 'ETL_NOT_CONFIGURED', 'ETL_ADMIN_TOKEN is not configured.'));
    return;
  }
  if (request.header('x-etl-token') !== config.ETL_ADMIN_TOKEN) {
    next(new HttpError(401, 'UNAUTHORIZED', 'A valid x-etl-token header is required.'));
    return;
  }
  next();
});

etlRouter.post('/all', async (request, response, next) => {
  try {
    const { limit } = etlRequestSchema.parse(request.query);
    response.json({ data: await runAllEtl(limit) });
  } catch (error) {
    next(error);
  }
});

etlRouter.post('/:source', async (request, response, next) => {
  try {
    const source = request.params.source as EtlSource;
    if (!validSources.has(source)) {
      throw new HttpError(404, 'UNKNOWN_SOURCE', 'Unknown ETL source.');
    }
    const { limit } = etlRequestSchema.parse(request.query);
    response.json({ data: await runEtl(source, limit) });
  } catch (error) {
    next(error);
  }
});
