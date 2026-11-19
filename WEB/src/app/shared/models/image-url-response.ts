export interface ImageUrlResponse {
  url: string;
  expiresInSeconds: number;
  expiresAt?: string | null;
}

export function imageRefreshDelay(response: ImageUrlResponse): number {
  const lifetime = response.expiresInSeconds * 1000;
  const remaining = response.expiresAt ? Date.parse(response.expiresAt) - Date.now() : lifetime;
  return Math.max(1000, Math.min(lifetime, remaining) - 15_000);
}
