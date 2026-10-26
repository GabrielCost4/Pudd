import type { UserPresence } from '../../../core/notifications/user-presence';

export interface Profile {
  id: string;
  name: string;
  bio: string | null;
  hasAvatar: boolean;
  presence: UserPresence;
  presenceRevision: number;
}
export interface UpdateProfile {
  name: string;
  bio: string | null;
}
