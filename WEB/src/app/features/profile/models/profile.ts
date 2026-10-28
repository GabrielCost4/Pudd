import type { UserPresence } from '../../../core/notifications/user-presence';

export interface Profile {
  id: string;
  name: string;
  publicationCount?: number;
  bio: string | null;
  hasAvatar: boolean;
  presence: UserPresence;
  presenceRevision: number;
}
export interface UpdateProfile {
  name: string;
  bio: string | null;
}
