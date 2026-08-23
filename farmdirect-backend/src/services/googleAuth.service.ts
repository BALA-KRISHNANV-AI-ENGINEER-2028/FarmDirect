import { env } from "../config/env";
import { withTransaction } from "../config/database";
import { findOAuthAccount, insertOAuthAccount } from "../models/oauthAccount.model";
import { findUserByEmail, findUserById, insertUser, type UserRole } from "../models/user.model";
import { insertCustomerProfile } from "../models/customerProfile.model";
import { insertFarmerProfile } from "../models/farmerProfile.model";
import { insertDefaultNotificationPreferences } from "../models/notificationPreferences.model";
import { issueRefreshToken } from "./token.service";
import { signAccessToken } from "../utils/jwt";
import { HttpError } from "../utils/httpError";

export interface GooglePayload {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
}

export function getGoogleAuthUrl(rolePreference?: string): string {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CALLBACK_URL) {
    throw HttpError.serviceUnavailable("Google OAuth is not configured on this server.");
  }

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  if (rolePreference === "farmer" || rolePreference === "customer") {
    params.set("state", rolePreference);
  }

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{ id_token: string; access_token: string }> {
  // eslint-disable-next-line no-console
  console.log("[GoogleOAuth] token exchange started", {
    redirectUri: env.GOOGLE_CALLBACK_URL,
    hasClientId: Boolean(env.GOOGLE_CLIENT_ID),
    hasClientSecret: Boolean(env.GOOGLE_CLIENT_SECRET),
  });

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    throw HttpError.serviceUnavailable("Google OAuth is not configured on this server.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    // eslint-disable-next-line no-console
    console.error(`[GoogleOAuth] token exchange failed (HTTP ${res.status}):`, errBody);
    const err = HttpError.badRequest(`Failed to exchange code with Google: ${errBody}`);
    (err as unknown as Record<string, unknown>).stage = "token_exchange";
    throw err;
  }

  const data = (await res.json()) as { id_token?: string; access_token?: string };
  if (!data.id_token || !data.access_token) {
    const err = HttpError.badRequest("Google token response missing id_token or access_token.");
    (err as unknown as Record<string, unknown>).stage = "token_exchange";
    throw err;
  }

  // eslint-disable-next-line no-console
  console.log("[GoogleOAuth] token exchange successful");
  return { id_token: data.id_token, access_token: data.access_token };
}

export async function verifyGoogleToken(idToken: string, accessToken?: string): Promise<GooglePayload> {
  // eslint-disable-next-line no-console
  console.log("[GoogleOAuth] verifying Google ID token");

  // First try tokeninfo endpoint
  const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
  if (infoRes.ok) {
    const info = (await infoRes.json()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      email_verified?: string | boolean;
      aud?: string;
    };

    if (env.GOOGLE_CLIENT_ID && info.aud && info.aud !== env.GOOGLE_CLIENT_ID) {
      const err = HttpError.unauthorized("Google ID token audience mismatch.");
      (err as unknown as Record<string, unknown>).stage = "token_verification";
      throw err;
    }

    const emailVerified = info.email_verified === "true" || info.email_verified === true;
    // eslint-disable-next-line no-console
    console.log("[GoogleOAuth] Google identity verified via tokeninfo", {
      emailDomain: info.email ? info.email.split("@")[1] : "unknown",
      subLength: info.sub ? info.sub.length : 0,
      emailVerified,
    });
    return {
      sub: info.sub,
      email: info.email,
      name: info.name,
      picture: info.picture,
      emailVerified,
    };
  }

  // Fallback to userinfo endpoint if access token is available
  if (accessToken) {
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (userinfoRes.ok) {
      const userinfo = (await userinfoRes.json()) as {
        sub: string;
        email: string;
        name?: string;
        picture?: string;
        email_verified?: boolean;
      };
      // eslint-disable-next-line no-console
      console.log("[GoogleOAuth] Google identity verified via userinfo fallback", {
        emailDomain: userinfo.email ? userinfo.email.split("@")[1] : "unknown",
        subLength: userinfo.sub ? userinfo.sub.length : 0,
      });
      return {
        sub: userinfo.sub,
        email: userinfo.email,
        name: userinfo.name,
        picture: userinfo.picture,
        emailVerified: userinfo.email_verified ?? true,
      };
    }
  }

  const err = HttpError.unauthorized("Invalid Google credentials.");
  (err as unknown as Record<string, unknown>).stage = "token_verification";
  throw err;
}

export async function resolveGoogleUser(
  googleUser: GooglePayload,
  rolePreference?: string
): Promise<{ user: { id: string; email: string; role: UserRole }; accessToken: string; refreshToken: string }> {
  // eslint-disable-next-line no-console
  console.log("[GoogleOAuth] resolving FarmDirect user");

  if (googleUser.emailVerified === false) {
    const err = HttpError.badRequest("Your Google email is not verified.");
    (err as unknown as Record<string, unknown>).stage = "email_verification_check";
    throw err;
  }

  let currentStage = "transaction_start";
  try {
    return await withTransaction(async (client) => {
      currentStage = "oauth_account_lookup";
      // eslint-disable-next-line no-console
      console.log("[GoogleOAuth] OAuth account lookup started");
      const existingOAuth = await findOAuthAccount("google", googleUser.sub, client);
      let userId: string;
      let role: UserRole;

      if (existingOAuth) {
        // eslint-disable-next-line no-console
        console.log("[GoogleOAuth] OAuth account lookup successful: found linked identity");
        currentStage = "existing_user_lookup";
        const existingUser = await findUserById(existingOAuth.user_id, client);
        if (!existingUser || !existingUser.is_active) {
          throw HttpError.unauthorized("User account is inactive or disabled.");
        }
        userId = existingUser.id;
        role = existingUser.role;
      } else {
        // eslint-disable-next-line no-console
        console.log("[GoogleOAuth] OAuth account lookup: no existing identity link found");
        currentStage = "user_email_lookup";
        // eslint-disable-next-line no-console
        console.log("[GoogleOAuth] user lookup started by email");
        const existingUserByEmail = await findUserByEmail(googleUser.email, client);
        if (existingUserByEmail) {
          // eslint-disable-next-line no-console
          console.log("[GoogleOAuth] user found by email, linking identity");
          if (!existingUserByEmail.is_active) {
            throw HttpError.unauthorized("User account is inactive or disabled.");
          }
          userId = existingUserByEmail.id;
          role = existingUserByEmail.role;
          currentStage = "oauth_account_creation";
          // eslint-disable-next-line no-console
          console.log("[GoogleOAuth] OAuth account creation started");
          await insertOAuthAccount({ userId, provider: "google", providerAccountId: googleUser.sub }, client);
        } else {
          // Case 1: Create new user
          currentStage = "user_creation";
          // eslint-disable-next-line no-console
          console.log("[GoogleOAuth] user creation started");
          const assignedRole: UserRole = rolePreference === "farmer" ? "farmer" : "customer";
          const newUser = await insertUser(
            { email: googleUser.email, passwordHash: "", role: assignedRole },
            client
          );
          userId = newUser.id;
          role = newUser.role;

          currentStage = "profile_creation";
          // eslint-disable-next-line no-console
          console.log("[GoogleOAuth] profile creation started", { role: assignedRole });
          const displayName = googleUser.name ?? (assignedRole === "farmer" ? "Farmer" : "Customer");
          if (assignedRole === "customer") {
            await insertCustomerProfile({ userId, fullName: displayName }, client);
          } else {
            await insertFarmerProfile({ userId, fullName: displayName }, client);
          }

          currentStage = "notification_preferences_creation";
          await insertDefaultNotificationPreferences(userId, client);

          currentStage = "oauth_account_creation";
          // eslint-disable-next-line no-console
          console.log("[GoogleOAuth] OAuth account creation started");
          await insertOAuthAccount({ userId, provider: "google", providerAccountId: googleUser.sub }, client);
        }
      }

      currentStage = "jwt_signing";
      const accessToken = signAccessToken({ sub: userId, role });
      currentStage = "refresh_token_issue";
      const refreshToken = await issueRefreshToken(userId, client);

      return {
        user: { id: userId, email: googleUser.email, role },
        accessToken,
        refreshToken,
      };
    });
  } catch (err: unknown) {
    (err as unknown as Record<string, unknown>).stage = (err as unknown as Record<string, unknown>).stage ?? currentStage;
    // eslint-disable-next-line no-console
    console.error(`[GoogleOAuth] failure at stage '${currentStage}':`, {
      message: err instanceof Error ? err.message : String(err),
      code: (err as unknown as Record<string, unknown>)?.code,
      detail: (err as unknown as Record<string, unknown>)?.detail,
    });
    throw err;
  }
}
