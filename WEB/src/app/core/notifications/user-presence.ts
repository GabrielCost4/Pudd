export type UserPresence = 'Online' | 'Offline';

export interface PresenceUpdate {
  userID: string;
  presence: UserPresence;
  revision: number;
}
