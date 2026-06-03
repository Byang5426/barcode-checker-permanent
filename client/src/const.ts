export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL. If Manus OAuth env vars are not configured (e.g. local
// Docker / standalone deploy), fall back to the local /login page so the app
// still works with the built-in username/password authentication.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // Fallback: no Manus OAuth configured → use local /login route
  if (!oauthPortalUrl || !appId) {
    return "/login";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
