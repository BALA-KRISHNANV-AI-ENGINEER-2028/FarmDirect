import type { CookieOptions, Request, Response } from "express";
import { env } from "../config/env";
import * as authService from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler";

const REFRESH_COOKIE_NAME = "farmdirect_refresh_token";

/**
 * Scoped to /api/auth so the cookie isn't sent on every request — only the
 * refresh/logout endpoints need it. httpOnly + sameSite=lax + secure (in
 * production) per decision #5; never exposed to frontend JS.
 */
function refreshCookieOptions(maxAgeMs?: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/api/auth",
    ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
  };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions(authService.refreshTokenCookieMaxAgeMs()));
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions());
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  setRefreshCookie(res, result.refreshToken);
  res.status(201).json({ user: result.user, accessToken: result.accessToken });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json({ user: result.user, accessToken: result.accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!rawToken) {
    res.status(401).json({ error: { message: "No active session." } });
    return;
  }
  const result = await authService.refresh(rawToken);
  setRefreshCookie(res, result.refreshToken);
  res.status(200).json({ accessToken: result.accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(rawToken);
  clearRefreshCookie(res);
  res.status(204).send();
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  // Same response whether or not the email exists — see auth.service.ts.
  res.status(200).json({ message: "If that email is registered, a reset link has been sent." });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  res.status(200).json({ message: "Password updated. Please sign in again." });
});
