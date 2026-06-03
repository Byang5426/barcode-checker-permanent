import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";

/**
 * Register local authentication routes (no OAuth)
 * OAuth routes are no longer used since we switched to username/password authentication
 */
export function registerOAuthRoutes(app: Express) {
  // OAuth routes disabled - using local authentication instead
  // See server/routers.ts for auth.login and auth.register mutations
}
