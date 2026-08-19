export type Role = 'organizer' | 'customer' | 'gate';

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
}
