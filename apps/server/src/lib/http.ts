export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchJson<T>(url: URL, headers: HeadersInit = {}, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'StrayCityETL/1.0 (+https://github.com/AhmedElsharif404/stray-city)',
        ...headers,
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (response.ok) return (await response.json()) as T;
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === retries) {
      throw new HttpError(
        response.status,
        'UPSTREAM_ERROR',
        `${url.hostname} returned ${response.status}`,
      );
    }
    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : Math.min(8000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  throw new Error('Unreachable retry state');
}
