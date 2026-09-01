import type { CookieOptions, Request, Response } from "express";
import { env } from "../config/env";
import * as authService from "../services/auth.service";
import * as googleAuthService from "../services/googleAuth.service";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/httpError";

const REFRESH_COOKIE_NAME = "farmdirect_refresh_token";

/**
 * Scoped to /api/auth so the cookie isn't sent on every request — only the
 * refresh/logout endpoints need it. httpOnly + sameSite=lax + secure (in
 * production) per decision #5; never exposed to frontend JS.
 */
function refreshCookieOptions(maxAgeMs?: number): CookieOptions {
  // sameSite: "none" is required in production because the frontend (Vercel)
  // and backend (Render) are on different origins. "lax" prevents the browser
  // from sending the cookie in cross-origin fetch() requests, which breaks
  // session refresh. "none" requires secure:true (HTTPS) which is guaranteed
  // in production by COOKIE_SECURE=true.
  const sameSite = env.COOKIE_SECURE ? "none" : "lax";
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite,
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

export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const role = typeof req.query.role === "string" ? req.query.role : undefined;
  const url = googleAuthService.getGoogleAuthUrl(role);
  res.redirect(url);
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const roleFromState = typeof req.query.state === "string" ? req.query.state : undefined;
  const iss = typeof req.query.iss === "string" ? req.query.iss : undefined;

  // eslint-disable-next-line no-console
  console.log("[GoogleOAuth] callback started", {
    hasCode: Boolean(code),
    iss: iss ?? "none",
    hasState: Boolean(roleFromState),
    configuredRedirectUri: env.GOOGLE_CALLBACK_URL ?? "NOT_SET",
  });

  if (!code) {
    // eslint-disable-next-line no-console
    console.warn("[GoogleOAuth] authorization code missing in callback query");
    const targetOrigin = Array.isArray(env.CORS_ORIGIN) ? env.CORS_ORIGIN[0] : env.CORS_ORIGIN;
    res.redirect(`${targetOrigin}/auth/login?error=google_cancelled`);
    return;
  }

  // eslint-disable-next-line no-console
  console.log("[GoogleOAuth] authorization code received");

  const targetOrigin = Array.isArray(env.CORS_ORIGIN) ? env.CORS_ORIGIN[0] : env.CORS_ORIGIN;

  try {
    const tokens = await googleAuthService.exchangeCodeForTokens(code);
    const googleUser = await googleAuthService.verifyGoogleToken(tokens.id_token, tokens.access_token);
    const result = await googleAuthService.resolveGoogleUser(googleUser, roleFromState);

    // eslint-disable-next-line no-console
    console.log("[GoogleOAuth] session creation started");
    setRefreshCookie(res, result.refreshToken);

    // eslint-disable-next-line no-console
    console.log("[GoogleOAuth] callback completed successfully, redirecting to frontend");
    res.redirect(`${targetOrigin}/?auth=google_success`);
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[GoogleOAuth] callback stage failed:", {
      stage: (error as Record<string, unknown>)?.stage ?? "callback_execution",
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
      pgErrorCode: (error as Record<string, unknown>)?.code,
      pgDetail: (error as Record<string, unknown>)?.detail,
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Always redirect back to frontend with an error code — never let the
    // error propagate to errorHandler which would return JSON on the Render
    // domain (the user would see a raw JSON error page, not the FarmDirect UI).
    res.redirect(`${targetOrigin}/auth/login?error=google_failed`);
  }
});

export const googleTokenAuth = asyncHandler(async (req: Request, res: Response) => {
  const { credential, code, role } = req.body;
  let googleUser;

  if (credential) {
    googleUser = await googleAuthService.verifyGoogleToken(credential);
  } else if (code) {
    const tokens = await googleAuthService.exchangeCodeForTokens(code);
    googleUser = await googleAuthService.verifyGoogleToken(tokens.id_token, tokens.access_token);
  } else {
    throw HttpError.badRequest("Either credential (ID token) or code is required.");
  }

  const result = await googleAuthService.resolveGoogleUser(googleUser, role);
  res.status(200).json({ user: result.user, accessToken: result.accessToken });
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


