// DA Services' user id for a staff IAM user, so an Admin can assign a role to someone by their Keycloak ID.
export const DELEGATED_USER_DOMAIN = "iam.internal";

export const isDelegatedUserId = (value: string) => value.trim().toLowerCase().endsWith(`@${DELEGATED_USER_DOMAIN}`);

/**
 * `sha256("<login option>:<sub>")[:32]@iam.internal`, where `sub` is the user's ID in the Keycloak console. Mirrors
 * oan_auth_service `iam_users.user_name_for_sub`. A value that already is such an id is returned as typed.
 */
export async function delegatedUserId(sub: string, loginOption: string): Promise<string> {
  const value = sub.trim();
  if (isDelegatedUserId(value)) return value.toLowerCase();
  const bytes = new TextEncoder().encode(`${loginOption}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 32)}@${DELEGATED_USER_DOMAIN}`;
}
