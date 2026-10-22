export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isBlocked: boolean;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  isActive: boolean;
}
