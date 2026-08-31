import { useEffect, useState } from "react";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";
import Skeleton from "../../components/ui/Skeleton";
import { cn } from "../../utils/cn";
import * as authApi from "../../services/authApi";
import * as farmsApi from "../../services/farmsApi";
import { api } from "../../services/apiClient";
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

interface Preferences {
  newOrderAlerts: boolean;
  lowStockAlerts: boolean;
  aiInsightUpdates: boolean;
  customerReviews: boolean;
}

export default function FarmerProfile() {
  const [tab, setTab] = useState("farm");
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [me, setMe] = useState<authApi.ApiCurrentUser | null>(null);
  const [fullName, setFullName] = useState("");
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

  const [preferences, setPreferences] = useState<Preferences | null>(null);

  const primaryFarm = farms[0];

  useEffect(() => {
    Promise.all([authApi.fetchMe(), farmsApi.fetchMyFarms()]).then(([user, myFarms]) => {
      setMe(user);
      setFullName(user.profile?.fullName ?? "");
      setExperienceYears(user.profile?.experienceYears != null ? String(user.profile.experienceYears) : "");
      setStory(user.profile?.story ?? "");
      setFarms(myFarms);
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
    api.get<{ preferences: Preferences }>("/notifications/preferences").catch(() => null).then((res) => {
      if (res) setPreferences(res.preferences);
    });
  }, []);

  const savePersonal = async () => {
    setSavingPersonal(true);
    try {
      await authApi.updateMe({
        fullName,
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

  const togglePreference = async (key: keyof Preferences) => {
    if (!preferences) return;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    await api.put("/notifications/preferences", { [key]: next[key] }).catch(() => setPreferences(preferences));
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
                tab === t.id ? "bg-primary-container/15 text-primary" : "text-on-surface-variant hover:bg-surface-container-low"
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
                <Field label="Full Name"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
                <Field label="Email"><Input value={me?.email ?? ""} disabled /></Field>
                <Field label="Phone"><Input value={me?.phone ?? ""} disabled /></Field>
                <Field label="Years Farming">
                  <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
                </Field>
              </div>
              <Field label="Farm Story"><Textarea rows={4} value={story} onChange={(e) => setStory(e.target.value)} /></Field>
              <Button onClick={savePersonal} disabled={savingPersonal}>{savingPersonal ? "Saving..." : "Save Changes"}</Button>
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
            <div className="space-y-4">
              {preferences ? (
                (
                  [
                    ["newOrderAlerts", "New order alerts"],
                    ["lowStockAlerts", "Low stock alerts"],
                    ["aiInsightUpdates", "AI insight updates"],
                    ["customerReviews", "Customer reviews"],
                  ] as [keyof Preferences, string][]
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between p-3 rounded-lg border border-surface-variant">
                    <span className="text-body-md text-on-surface">{label}</span>
                    <input
                      type="checkbox"
                      checked={preferences[key]}
                      onChange={() => togglePreference(key)}
                      className="accent-primary w-5 h-5"
                    />
                  </label>
                ))
              ) : (
                <p className="text-body-md text-on-surface-variant">Loading preferences...</p>
              )}
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-5 max-w-sm">
              <p className="text-body-md text-on-surface-variant">
                To change your password, use the{" "}
                <a href="/auth/forgot-password" className="text-primary font-semibold hover:underline">
                  forgot password
                </a>{" "}
                flow.
              </p>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
