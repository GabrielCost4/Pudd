import { API_BASE_URL } from '../../../environments/environment';

export function isApiUrl(url: string): boolean {
  return url === API_BASE_URL || url.startsWith(API_BASE_URL + '/');
}
