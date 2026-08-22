import { useEffect, useState } from "react";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { Field, Input, Textarea } from "../../components/ui/Input";
import { cn } from "../../utils/cn";
import * as authApi from "../../services/authApi";
import * as addressesApi from "../../services/addressesApi";
import { api } from "../../services/apiClient";

const tabs = [
  { id: "profile", label: "Profile", icon: "person" },
  { id: "addresses", label: "Addresses", icon: "location_on" },
  { id: "notifications", label: "Notifications", icon: "notifications" },
  { id: "security", label: "Security", icon: "lock" },
];

interface Preferences {
  orderUpdates: boolean;
  priceDrops: boolean;
  newHarvests: boolean;
  promotions: boolean;
}

export default function CustomerProfile() {
  const [tab, setTab] = useState("profile");

  const [me, setMe] = useState<authApi.ApiCurrentUser | null>(null);
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState<addressesApi.ApiAddress[]>([]);
  const [editingAddress, setEditingAddress] = useState<addressesApi.ApiAddress | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [preferences, setPreferences] = useState<Preferences | null>(null);

  useEffect(() => {
    authApi.fetchMe().then((u) => {
      setMe(u);
      setFullName(u.profile?.fullName ?? "");
      setDateOfBirth(u.profile?.dateOfBirth ?? "");
    });
    addressesApi.fetchAddresses().then(setAddresses);
    api.get<{ preferences: Preferences }>("/notifications/preferences").catch(() => null).then((res) => {
      if (res) setPreferences(res.preferences);
    });
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await authApi.updateMe({ fullName, dateOfBirth: dateOfBirth || undefined });
    } finally {
      setSavingProfile(false);
    }
  };

  const togglePreference = async (key: keyof Preferences) => {
    if (!preferences) return;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    await api.put("/notifications/preferences", { [key]: next[key] }).catch(() => setPreferences(preferences));
  };

  return (
    <Container className="py-stack-lg">
      <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-8">Account Settings</h1>
      <div className="grid md:grid-cols-[220px_1fr] gap-gutter items-start">
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
          {tab === "profile" && (
            <div className="space-y-5">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-20 h-20 rounded-full bg-surface-container overflow-hidden">
                  {me?.profile?.avatarUrl && <img src={me.profile.avatarUrl} alt={fullName} className="w-full h-full object-cover" />}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full Name">
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </Field>
                <Field label="Email">
                  <Input value={me?.email ?? ""} type="email" disabled />
                </Field>
                <Field label="Phone">
                  <Input value={me?.phone ?? ""} disabled />
                </Field>
                <Field label="Date of Birth">
                  <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                </Field>
              </div>
              <Button onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}

          {tab === "addresses" && (
            <div className="space-y-4">
              {addresses.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "p-4 rounded-lg border flex justify-between items-start",
                    a.isDefault ? "border-primary bg-primary-container/10" : "border-surface-variant"
                  )}
                >
                  <div>
                    <p className="font-semibold text-on-surface mb-1">
                      {a.label ?? "Address"} {a.isDefault && <span className="text-label-sm text-primary">(Default)</span>}
                    </p>
                    <p className="text-body-md text-on-surface-variant">
                      {a.addressLine}
                      {a.city ? `, ${a.city}` : ""} {a.state ?? ""} {a.postalCode ?? ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingAddress(a);
                        setShowAddressForm(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        addressesApi.deleteAddress(a.id).then(() => setAddresses((prev) => prev.filter((x) => x.id !== a.id)))
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

              {showAddressForm ? (
                <AddressForm
                  initial={editingAddress}
                  onCancel={() => {
                    setShowAddressForm(false);
                    setEditingAddress(null);
                  }}
                  onSaved={(saved) => {
                    setAddresses((prev) => {
                      const withoutDefaultClash = saved.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev;
                      const exists = withoutDefaultClash.some((a) => a.id === saved.id);
                      return exists
                        ? withoutDefaultClash.map((a) => (a.id === saved.id ? saved : a))
                        : [...withoutDefaultClash, saved];
                    });
                    setShowAddressForm(false);
                    setEditingAddress(null);
                  }}
                />
              ) : (
                <Button variant="outline" icon={<Icon name="add" size={18} />} onClick={() => setShowAddressForm(true)}>
                  Add New Address
                </Button>
              )}
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-4">
              {preferences ? (
                (
                  [
                    ["orderUpdates", "Order updates"],
                    ["priceDrops", "Price drops on favorites"],
                    ["newHarvests", "New harvests near you"],
                    ["promotions", "Promotions & offers"],
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

function AddressForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: addressesApi.ApiAddress | null;
  onCancel: () => void;
  onSaved: (address: addressesApi.ApiAddress) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [addressLine, setAddressLine] = useState(initial?.addressLine ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const input = { label: label || undefined, addressLine, city, state, postalCode, isDefault };
      const saved = initial
        ? await addressesApi.updateAddress(initial.id, input)
        : await addressesApi.createAddress(input);
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border border-surface-variant space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home, Work..." />
        </Field>
        <Field label="Postal Code">
          <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </Field>
      </div>
      <Field label="Address" required>
        <Textarea rows={2} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="City">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="State">
          <Input value={state} onChange={(e) => setState(e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-label-md text-on-surface">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="accent-primary w-4 h-4" />
        Set as default
      </label>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving || !addressLine}>
          {saving ? "Saving..." : "Save Address"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
