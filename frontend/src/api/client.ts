// Thin fetch wrapper for the Flask API. In development Vite proxies /api to the backend.

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function apiUrl(path: string, anonymous = false): string {
  return anonymous ? `/api${path}?anonymous=1` : `/api${path}`
}

export async function getJSON<T>(path: string, options: { anonymous?: boolean; signal?: AbortSignal } = {}): Promise<T> {
  const response = await fetch(apiUrl(path, options.anonymous), { cache: 'no-store', signal: options.signal })
  if (!response.ok) {
    throw new ApiError(response.status, `GET ${path} failed with HTTP ${response.status}`)
  }
  return (await response.json()) as T
}
