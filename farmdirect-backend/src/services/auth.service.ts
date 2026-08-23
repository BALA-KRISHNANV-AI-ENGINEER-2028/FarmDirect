import { withTransaction } from "../config/database";
import { insertCustomerProfile } from "../models/customerProfile.model";
import { insertFarmerProfile } from "../models/farmerProfile.model";
import { insertDefaultNotificationPreferences } from "../models/notificationPreferences.model";
import {
  consumePasswordResetToken,
  findActivePasswordResetTokenByHash,
  insertPasswordResetToken,
} from "../models/passwordResetToken.model";
import { revokeAllRefreshTokensForUser } from "../models/refreshToken.model";
import { findUserByEmail, findUserById, insertUser, updateUserPasswordHash, type UserRole } from "../models/user.model";
import { signAccessToken } from "../utils/jwt";
import { hashPassword, verifyPassword } from "../utils/password";
import { HttpError } from "../utils/httpError";
import { generateOpaqueToken, hashToken, issueRefreshToken, refreshTokenExpiry, rotateRefreshToken, revokeRefreshTokenIfValid } from "./token.service";

export interface RegisterInput {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  // farmer-only
  farmName?: string; // reserved for Phase D once POST /api/farms exists; not persisted here
}

export interface AuthResult {
  user: { id: string; email: string; role: UserRole };
  accessToken: string;
  refreshToken: string;
}

function toPublicUser(row: { id: string; email: string; role: UserRole }) {
  return { id: row.id, email: row.email, role: row.role };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw HttpError.conflict("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);

  return withTransaction(async (client) => {
    const user = await insertUser(
      { email: input.email, passwordHash, role: input.role, phone: input.phone ?? null },
      client
    );

    if (input.role === "customer") {
      await insertCustomerProfile({ userId: user.id, fullName: input.fullName }, client);
    } else {
      await insertFarmerProfile({ userId: user.id, fullName: input.fullName }, client);
    }
    await insertDefaultNotificationPreferences(user.id, client);

    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    const refreshToken = await issueRefreshToken(user.id, client);

    return { user: toPublicUser(user), accessToken, refreshToken };
  });
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await findUserByEmail(email);
  // Generic message either way — don't leak whether the email exists.
  if (!user || !user.is_active) {
    throw HttpError.unauthorized("Invalid email or password.");
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw HttpError.unauthorized("Invalid email or password.");
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = await issueRefreshToken(user.id);

  return { user: toPublicUser(user), accessToken, refreshToken };
}

export async function refresh(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const rotated = await rotateRefreshToken(rawRefreshToken);
  if (!rotated) {
    throw HttpError.unauthorized("Session expired. Please sign in again.");
  }

  const userRow = await findUserById(rotated.userId);
  if (!userRow) {
    throw HttpError.unauthorized("Session expired. Please sign in again.");
  }

  const accessToken = signAccessToken({ sub: userRow.id, role: userRow.role });
  return { accessToken, refreshToken: rotated.newRawToken };
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;
  await revokeRefreshTokenIfValid(rawRefreshToken);
}

const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export async function forgotPassword(email: string): Promise<void> {
  const user = await findUserByEmail(email);
  // Always return success-shaped (void) regardless of whether the email
  // exists — the controller responds the same way either way, so this
  // endpoint can't be used to enumerate registered emails.
  if (!user) return;

  const rawToken = generateOpaqueToken();
  await insertPasswordResetToken({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
  });

  // No real email provider this phase (per architecture doc §7 — nothing
  // beyond what's requested gets built ahead of schedule). Logged here so
  // the flow is testable end-to-end in development.
  // eslint-disable-next-line no-console
  console.log(`[dev-only] Password reset link for ${user.email}: /reset-password?token=${rawToken}`);
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenRow = await findActivePasswordResetTokenByHash(hashToken(rawToken));
  if (!tokenRow) {
    throw HttpError.badRequest("This reset link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(newPassword);

  await withTransaction(async (client) => {
    await updateUserPasswordHash(tokenRow.user_id, passwordHash, client);
    await consumePasswordResetToken(tokenRow.id, client);
    // Force re-login everywhere — a leaked password shouldn't leave old
    // sessions valid after the owner resets it.
    await revokeAllRefreshTokensForUser(tokenRow.user_id, client);
  });
}

export const refreshTokenCookieMaxAgeMs = () => {
  return refreshTokenExpiry().getTime() - Date.now();
};
