import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { ZodError } from 'zod';

import { config, hasSupabaseAdmin } from './config.js';
import { HttpError } from './lib/http.js';
import { etlRouter } from './routes/etl.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.WEB_ORIGIN.split(',').map((origin) => origin.trim()) }));
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp());

app.get('/health', (_request, response) => {
  response.json({
    data: {
      status: 'ok',
      service: 'stray-city-server',
      supabaseConfigured: hasSupabaseAdmin,
      timestamp: new Date().toISOString(),
    },
  });
});

app.use('/api/etl', etlRouter);

app.use((_request, _response, next) => {
  next(new HttpError(404, 'NOT_FOUND', 'Route not found.'));
});

const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  request.log.error(error);
  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: 'INVALID_REQUEST',
        message: error.issues.map((issue) => issue.message).join('; '),
      },
    });
    return;
  }
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unexpected server error.',
    },
  });
};

app.use(errorHandler);
