/**
 * The signed-in user as the app sees it: just enough to scope data by `id`
 * and show who is signed in. Kept apart from Better Auth's own user type so
 * nothing else from the session row reaches components.
 */
export type AuthUser = {
  /** UUID of the `users` row; every repository call is scoped by it. */
  id: string;
  /** Sign-in email address. */
  email: string;
  /** Display name, shown in the app header. */
  name: string;
};
