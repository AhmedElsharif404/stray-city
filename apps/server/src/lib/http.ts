export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function fetchJson<T>(url: URL, headers: HeadersInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'StrayCityETL/0.1',
      ...headers,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new HttpError(
      response.status,
      'UPSTREAM_ERROR',
      `${url.hostname} returned ${response.status}`,
    );
  }

  return (await response.json()) as T;
}
