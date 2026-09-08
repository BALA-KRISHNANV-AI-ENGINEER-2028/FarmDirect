import { api } from "./apiClient";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  orderUpdates?: boolean;
  priceDrops?: boolean;
  newHarvests?: boolean;
  promotions?: boolean;
  newOrderAlerts?: boolean;
  lowStockAlerts?: boolean;
  aiInsightUpdates?: boolean;
  customerReviews?: boolean;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await api.get<{ data: NotificationItem[] }>("/notifications");
  return res.data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.put("/notifications/read-all");
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await api.get<{ preferences: NotificationPreferences }>("/notifications/preferences");
  return res.preferences;
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferences
): Promise<NotificationPreferences> {
  const res = await api.put<{ preferences: NotificationPreferences }>(
    "/notifications/preferences",
    preferences
  );
  return res.preferences;
}
