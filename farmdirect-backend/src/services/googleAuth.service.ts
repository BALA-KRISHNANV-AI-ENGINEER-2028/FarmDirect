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
    console.error(`[GoogleOAuth] Token exchange failed (HTTP ${res.status}):`, errBody);
    throw HttpError.badRequest(`Failed to exchange code with Google: ${errBody}`);
  }

  const data = (await res.json()) as { id_token?: string; access_token?: string };
  if (!data.id_token || !data.access_token) {
    throw HttpError.badRequest("Google token response missing id_token or access_token.");
  }

  return { id_token: data.id_token, access_token: data.access_token };
}

export async function verifyGoogleToken(idToken: string, accessToken?: string): Promise<GooglePayload> {
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
      throw HttpError.unauthorized("Google ID token audience mismatch.");
    }

    const emailVerified = info.email_verified === "true" || info.email_verified === true;
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
      return {
        sub: userinfo.sub,
        email: userinfo.email,
        name: userinfo.name,
        picture: userinfo.picture,
        emailVerified: userinfo.email_verified ?? true,
      };
    }
  }

  throw HttpError.unauthorized("Invalid Google credentials.");
}

export async function resolveGoogleUser(
  googleUser: GooglePayload,
  rolePreference?: string
): Promise<{ user: { id: string; email: string; role: UserRole }; accessToken: string; refreshToken: string }> {
  if (googleUser.emailVerified === false) {
    throw HttpError.badRequest("Your Google email is not verified.");
  }

  try {
    return await withTransaction(async (client) => {
      // Case 3 & 4: Search for existing Google OAuth link
      const existingOAuth = await findOAuthAccount("google", googleUser.sub, client);
      let userId: string;
      let role: UserRole;

      if (existingOAuth) {
        const existingUser = await findUserById(existingOAuth.user_id, client);
        if (!existingUser || !existingUser.is_active) {
          throw HttpError.unauthorized("User account is inactive or disabled.");
        }
        userId = existingUser.id;
        role = existingUser.role;
      } else {
        // Case 2: Check if user exists by email
        const existingUserByEmail = await findUserByEmail(googleUser.email, client);
        if (existingUserByEmail) {
          if (!existingUserByEmail.is_active) {
            throw HttpError.unauthorized("User account is inactive or disabled.");
          }
          userId = existingUserByEmail.id;
          role = existingUserByEmail.role;
          await insertOAuthAccount({ userId, provider: "google", providerAccountId: googleUser.sub }, client);
        } else {
          // Case 1: Create new user
          const assignedRole: UserRole = rolePreference === "farmer" ? "farmer" : "customer";
          const newUser = await insertUser(
            { email: googleUser.email, passwordHash: "", role: assignedRole },
            client
          );
          userId = newUser.id;
          role = newUser.role;

          const displayName = googleUser.name ?? (assignedRole === "farmer" ? "Farmer" : "Customer");
          if (assignedRole === "customer") {
            await insertCustomerProfile({ userId, fullName: displayName }, client);
          } else {
            await insertFarmerProfile({ userId, fullName: displayName }, client);
          }

          await insertDefaultNotificationPreferences(userId, client);
          await insertOAuthAccount({ userId, provider: "google", providerAccountId: googleUser.sub }, client);
        }
      }

      const accessToken = signAccessToken({ sub: userId, role });
      const refreshToken = await issueRefreshToken(userId, client);

      return {
        user: { id: userId, email: googleUser.email, role },
        accessToken,
        refreshToken,
      };
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error("[GoogleOAuth DB Error]:", {
      message: err instanceof Error ? err.message : String(err),
      code: (err as Record<string, unknown>)?.code,
      detail: (err as Record<string, unknown>)?.detail,
    });
    throw err;
  }
}
