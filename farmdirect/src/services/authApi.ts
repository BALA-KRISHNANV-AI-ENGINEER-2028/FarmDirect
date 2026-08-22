import { api, setAccessToken } from "./apiClient";

export type UserRole = "customer" | "farmer";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  farmName?: string;
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const res = await api.post<AuthResponse>("/auth/register", input);
  setAccessToken(res.accessToken);
  return res.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api.post<AuthResponse>("/auth/login", { email, password });
  setAccessToken(res.accessToken);
  return res.user;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout").catch(() => undefined);
  setAccessToken(null);
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post("/auth/forgot-password", { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post("/auth/reset-password", { token, newPassword });
}

interface ApiCurrentUser {
  id: string;
  email: string;
  role: UserRole;
  phone: string | null;
  createdAt: string;
  profile: {
    fullName: string;
    avatarUrl: string | null;
    dateOfBirth?: string | null;
    experienceYears?: number | null;
    verified?: boolean;
    story?: string | null;
  } | null;
}

export async function fetchMe(): Promise<ApiCurrentUser> {
  const res = await api.get<{ user: ApiCurrentUser }>("/users/me");
  return res.user;
}

export async function updateMe(input: {
  fullName?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  experienceYears?: number;
  story?: string;
}): Promise<ApiCurrentUser> {
  const res = await api.put<{ user: ApiCurrentUser }>("/users/me", input);
  return res.user;
}

export type { ApiCurrentUser };
