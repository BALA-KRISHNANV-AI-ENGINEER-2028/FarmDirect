import { findCustomerProfileByUserId, updateCustomerProfile, type CustomerProfileRow } from "../models/customerProfile.model";
import { findFarmerProfileByUserId, updateFarmerProfile, type FarmerProfileRow } from "../models/farmerProfile.model";
import { findUserById, type UserRow } from "../models/user.model";
import { HttpError } from "../utils/httpError";

/**
 * Shapes a profile row into camelCase for the API response. Two real bugs
 * were caught and fixed here during Phase H frontend integration:
 *   1. The raw snake_case model row was being returned directly (user_id,
 *      full_name, avatar_url, ...) — the frontend expected camelCase and
 *      every field silently came through as undefined.
 *   2. updateCurrentUser previously returned `{ ...user, profile }`, which
 *      spread the *entire* raw users row — including password_hash — into
 *      the API response. Never caught in earlier phases because no test
 *      inspected the full response body for that endpoint; caught here by
 *      actually reading through what a live PUT /users/me returned.
 */
function toProfileDto(profile: CustomerProfileRow | FarmerProfileRow | null) {
  if (!profile) return null;
  const isFarmer = "experience_years" in profile;
  return {
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    ...(isFarmer
      ? {
          experienceYears: (profile as FarmerProfileRow).experience_years,
          verified: (profile as FarmerProfileRow).verified,
          story: (profile as FarmerProfileRow).story,
        }
      : {
          dateOfBirth: (profile as CustomerProfileRow).date_of_birth,
        }),
  };
}

function toUserDto(user: UserRow, profile: CustomerProfileRow | FarmerProfileRow | null) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    phone: user.phone,
    createdAt: user.created_at,
    profile: toProfileDto(profile),
  };
}

export async function getCurrentUser(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw HttpError.notFound("User not found");

  const profile =
    user.role === "customer"
      ? await findCustomerProfileByUserId(user.id)
      : await findFarmerProfileByUserId(user.id);

  return toUserDto(user, profile);
}

export interface UpdateProfileInput {
  fullName?: string;
  avatarUrl?: string;
  // customer-only
  dateOfBirth?: string;
  // farmer-only
  experienceYears?: number;
  story?: string;
}

export async function updateCurrentUser(userId: string, input: UpdateProfileInput) {
  const user = await findUserById(userId);
  if (!user) throw HttpError.notFound("User not found");

  const profile =
    user.role === "customer"
      ? await updateCustomerProfile(userId, {
          fullName: input.fullName,
          avatarUrl: input.avatarUrl,
          dateOfBirth: input.dateOfBirth,
        })
      : await updateFarmerProfile(userId, {
          fullName: input.fullName,
          avatarUrl: input.avatarUrl,
          experienceYears: input.experienceYears,
          story: input.story,
        });

  return toUserDto(user, profile);
}
