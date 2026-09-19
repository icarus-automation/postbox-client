/** The signed-in person, as `GET /auth/get-session` reports them. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The session record behind the cookie. Every org-scoped route reads the
 * organization from `activeOrganizationId`, never from the URL.
 */
export interface AuthSession {
  id: string;
  token: string;
  userId: string;
  activeOrganizationId: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  ipAddress: string;
  userAgent: string;
}

/** `GET /auth/get-session` returns this, or a literal `null` when signed out. */
export interface SessionResponse {
  session: AuthSession;
  user: AuthUser;
}
