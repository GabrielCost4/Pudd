// URL pública da API. Ajuste para o endereço HTTPS da implantação.
export const API_BASE_URL = '/api';

export function isApiUrl(url: string): boolean {
  return url === API_BASE_URL || url.startsWith(API_BASE_URL + '/');
}
