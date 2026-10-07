export interface Profile { id: string; name: string; bio: string | null; hasAvatar: boolean; }
export interface UpdateProfile { name: string; bio: string | null; }
