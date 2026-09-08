import { useEffect, useState } from "react";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import { cn } from "../../utils/cn";
import * as authApi from "../../services/authApi";
import * as farmsApi from "../../services/farmsApi";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationItem,
  type NotificationPreferences,
} from "../../services/notificationsApi";
import type { Farm } from "../../types";
import LocationPicker from "../../components/maps/LocationPicker";
import { useToast } from "../../components/ui/Toast";

const tabs = [
  { id: "personal", label: "Personal Info", icon: "person" },
  { id: "farm", label: "Farm Information", icon: "storefront" },
  { id: "location", label: "Location", icon: "location_on" },
  { id: "notifications", label: "Notifications", icon: "notifications" },
  { id: "security", label: "Security", icon: "lock" },
];

export default function FarmerProfile() {
  const [tab, setTab] = useState("farm");
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [me, setMe] = useState<authApi.ApiCurrentUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [story, setStory] = useState("");
  const [savingPersonal, setSavingPersonal] = useState(false);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmName, setFarmName] = useState("");
  const [farmSize, setFarmSize] = useState("");
  const [farmMethod, setFarmMethod] = useState("");
  const [farmCategory, setFarmCategory] = useState("");
  const [farmDescription, setFarmDescription] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [savingFarm, setSavingFarm] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Notifications state
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);

  const primaryFarm = farms[0];

  useEffect(() => {
    Promise.all([
      authApi.fetchMe(),
      farmsApi.fetchMyFarms(),
      fetchNotificationPreferences().catch(() => null),
      fetchNotifications().catch(() => []),
    ]).then(([user, myFarms, pref, notifs]) => {
      setMe(user);
      setFullName(user.profile?.fullName ?? "");
      setPhone(user.phone ?? "");
      setExperienceYears(user.profile?.experienceYears != null ? String(user.profile.experienceYears) : "");
      setStory(user.profile?.story ?? "");
      setFarms(myFarms);
      if (pref) setPreferences(pref);
      setNotificationsList(notifs);

      const f = myFarms[0];
      if (f) {
        setFarmName(f.name);
        setFarmSize(String(f.sizeAcres || ""));
        setFarmMethod(f.farmingMethod);
        setFarmCategory(f.category);
        setFarmDescription(f.description);
        setAddressLine(f.location);
        setLatitude(f.lat ? String(f.lat) : "");
        setLongitude(f.lng ? String(f.lng) : "");
      }
      setLoading(false);
    });
  }, []);

  const savePersonal = async () => {
    setSavingPersonal(true);
    try {
      await authApi.updateMe({
        fullName,
        phone: phone || undefined,
        experienceYears: experienceYears ? Number(experienceYears) : undefined,
        story: story || undefined,
      });
      showToast("Personal details updated successfully", "success");
    } catch {
      showToast("Failed to update personal details", "error");
    } finally {
      setSavingPersonal(false);
    }
  };

  const saveFarm = async () => {
    if (!primaryFarm) return;
    setSavingFarm(true);
    try {
      const updated = await farmsApi.updateFarm(primaryFarm.id, {
        name: farmName,
        sizeAcres: farmSize ? Number(farmSize) : undefined,
        farmingMethod: farmMethod || undefined,
        category: farmCategory || undefined,
        description: farmDescription || undefined,
      });
      setFarms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      showToast("Farm information updated successfully", "success");
    } catch {
      showToast("Failed to update farm information", "error");
    } finally {
      setSavingFarm(false);
    }
  };

  const saveLocation = async () => {
    if (!primaryFarm) return;
    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      showToast("Latitude must be a valid number between -90 and 90", "error");
      return;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      showToast("Longitude must be a valid number between -180 and 180", "error");
      return;
    }
    setSavingLocation(true);
    try {
      const updated = await farmsApi.updateFarm(primaryFarm.id, {
        addressLine: addressLine || undefined,
        latitude: latNum,
        longitude: lngNum,
      });
      setFarms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      showToast("Farm location and address updated successfully", "success");
    } catch {
      showToast("Failed to update farm location", "error");
    } finally {
      setSavingLocation(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters long", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }

    setSavingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      showToast("Password updated successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to change password", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const togglePreference = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    try {
      await updateNotificationPreferences({ [key]: next[key] });
      showToast("Notification preferences updated", "success");
    } catch {
      setPreferences(preferences);
      showToast("Failed to update preferences", "error");
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotificationsList((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      showToast("Failed to mark notification read", "error");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true })));
      showToast("All notifications marked as read", "success");
    } catch {
      showToast("Failed to mark all as read", "error");
    }
  };

  if (loading) {
    return (
      <Container className="py-stack-lg">
        <Skeleton className="h-8 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </Container>
    );
  }

  return (
    <Container className="py-stack-lg">
      <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">Farm Profile</h1>
      {farms.length > 1 && (
        <p className="text-label-sm text-on-surface-variant mb-6">
          You own {farms.length} farms. This page edits <strong>{primaryFarm?.name}</strong>. Manage all farms from Product
          Management.
        </p>
      )}
      <div className="grid md:grid-cols-[220px_1fr] gap-gutter items-start mt-6">
        <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-label-md font-semibold whitespace-nowrap transition-colors",
                tab === t.id ? "bg-primary/10 text-primary font-bold" : "text-on-surface-variant hover:bg-surface-container-low"
              )}
            >
              <Icon name={t.icon} size={18} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6 md:p-8">
          {tab === "personal" && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full Name">
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </Field>
                <Field label="Email">
                  <Input value={me?.email ?? ""} disabled />
                </Field>
                <Field label="Phone Number">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </Field>
                <Field label="Years Farming">
                  <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
                </Field>
              </div>
              <Field label="Farm Story">
                <Textarea rows={4} value={story} onChange={(e) => setStory(e.target.value)} />
              </Field>
              <Button onClick={savePersonal} disabled={savingPersonal}>
                {savingPersonal ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}

          {tab === "farm" && (
            primaryFarm ? (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Farm Name"><Input value={farmName} onChange={(e) => setFarmName(e.target.value)} /></Field>
                  <Field label="Farm Size (acres)">
                    <Input type="number" value={farmSize} onChange={(e) => setFarmSize(e.target.value)} />
                  </Field>
                  <Field label="Farming Method">
                    <Select value={farmMethod} onChange={(e) => setFarmMethod(e.target.value)}>
                      <option>Organic</option>
                      <option>Natural Farming</option>
                      <option>Pesticide-Free</option>
                      <option>Conventional</option>
                    </Select>
                  </Field>
                  <Field label="Category">
                    <Select value={farmCategory} onChange={(e) => setFarmCategory(e.target.value)}>
                      <option>Vegetables</option>
                      <option>Fruits</option>
                      <option>Grains</option>
                      <option>Spices</option>
                      <option>Dairy</option>
                      <option>Nuts & Oils</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Farm Description">
                  <Textarea rows={3} value={farmDescription} onChange={(e) => setFarmDescription(e.target.value)} />
                </Field>
                <Button onClick={saveFarm} disabled={savingFarm}>{savingFarm ? "Saving..." : "Save Changes"}</Button>
              </div>
            ) : (
              <p className="text-body-md text-on-surface-variant">You don't have a farm yet.</p>
            )
          )}

          {tab === "location" && primaryFarm && (
            <div className="space-y-5">
              <Field label="Address">
                <Textarea rows={2} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Latitude">
                  <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="19.9975" />
                </Field>
                <Field label="Longitude">
                  <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="73.7898" />
                </Field>
              </div>
              <p className="text-label-sm text-on-surface-variant">
                Setting coordinates lets customers find your farm through nearby-farm search. Use the interactive map below to drag/pinpoint your location.
              </p>
              
              <LocationPicker
                initialLat={latitude ? Number(latitude) : null}
                initialLng={longitude ? Number(longitude) : null}
                onChange={(lat, lng) => {
                  setLatitude(String(lat));
                  setLongitude(String(lng));
                }}
              />

              <Button onClick={saveLocation} disabled={savingLocation || !latitude || !longitude}>
                {savingLocation ? "Updating..." : "Update Location"}
              </Button>
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-8">
              <div>
                <h3 className="text-headline-sm font-semibold text-on-surface mb-2">Notification Preferences</h3>
                <p className="text-body-sm text-on-surface-variant mb-4">
                  Select which real-time alerts you want to receive on your dashboard.
                </p>
                <div className="space-y-3">
                  {preferences ? (
                    (
                      [
                        ["newOrderAlerts", "New order alerts", "Get alerted as soon as a customer completes checkout"],
                        ["lowStockAlerts", "Low stock alerts", "Warnings when inventory reaches critical levels (<10)"],
                        ["aiInsightUpdates", "AI insight updates", "Fresh harvest and demand recommendations"],
                        ["customerReviews", "Customer reviews", "Notifications when buyers rate your harvest"],
                      ] as [keyof NotificationPreferences, string, string][]
                    ).map(([key, label, desc]) => (
                      <label key={key} className="flex items-center justify-between p-3.5 rounded-xl border border-surface-variant hover:bg-surface-container-low/50 cursor-pointer transition-colors">
                        <div>
                          <p className="text-body-md font-semibold text-on-surface">{label}</p>
                          <p className="text-label-xs text-on-surface-variant">{desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(preferences[key])}
                          onChange={() => togglePreference(key)}
                          className="accent-primary w-5 h-5 cursor-pointer"
                        />
                      </label>
                    ))
                  ) : (
                    <p className="text-body-md text-on-surface-variant">Loading preferences...</p>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-surface-variant">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-headline-sm font-semibold text-on-surface">Recent Notifications</h3>
                    <p className="text-label-sm text-on-surface-variant">Your activity log and alerts.</p>
                  </div>
                  {notificationsList.some((n) => !n.read) && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-label-sm font-semibold text-primary hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {notificationsList.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant py-4">No notifications yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {notificationsList.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                          notif.read
                            ? "bg-surface-bright border-surface-variant text-on-surface-variant"
                            : "bg-primary/5 border-primary/30 text-on-surface"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon
                            name={
                              notif.type === "new_order"
                                ? "receipt_long"
                                : notif.type === "low_stock"
                                ? "warning"
                                : notif.type === "ai_insight"
                                ? "auto_awesome"
                                : "notifications"
                            }
                            size={20}
                            className={notif.read ? "text-on-surface-variant mt-0.5" : "text-primary mt-0.5"}
                          />
                          <div>
                            <p className="text-body-sm font-semibold">{notif.title}</p>
                            <p className="text-body-xs opacity-90">{notif.message}</p>
                            <p className="text-label-xs opacity-60 mt-1">
                              {new Date(notif.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        {!notif.read && (
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            className="text-label-xs font-semibold text-primary hover:underline shrink-0"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="max-w-md">
              <h3 className="text-headline-sm font-semibold text-on-surface mb-2">Change Password</h3>
              <p className="text-body-sm text-on-surface-variant mb-6">
                Ensure your account is using a long, random password to stay secure.
              </p>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Field label="Current Password">
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </Field>

                <Field label="New Password (min 8 characters)">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={8}
                    required
                  />
                </Field>

                <Field label="Confirm New Password">
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    minLength={8}
                    required
                  />
                </Field>

                <div className="pt-2">
                  <Button type="submit" disabled={savingPassword}>
                    {savingPassword ? "Updating Password..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
