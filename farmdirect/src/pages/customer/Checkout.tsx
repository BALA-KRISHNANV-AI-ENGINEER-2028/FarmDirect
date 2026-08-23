import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container } from "../../components/ui/Card";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { Field, Input, Textarea } from "../../components/ui/Input";
import { useCart } from "../../hooks/useCart";
import { formatINR } from "../../utils/format";
import { cn } from "../../utils/cn";
import * as addressesApi from "../../services/addressesApi";
import * as ordersApi from "../../services/ordersApi";
import { ApiError } from "../../services/apiClient";

const deliveryOptions = [
  { id: "standard", label: "Standard Delivery", desc: "Delivered within 24 hours", price: 25 },
  { id: "express", label: "Express Delivery", desc: "Delivered within 4 hours", price: 60 },
];

const paymentOptions = [
  { id: "upi", label: "UPI", icon: "smartphone" },
  { id: "card", label: "Credit / Debit Card", icon: "credit_card" },
  { id: "cod", label: "Cash on Delivery", icon: "payments" },
];

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<"standard" | "express">("standard");
  const [payment, setPayment] = useState<"upi" | "card" | "cod">("upi");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<addressesApi.ApiAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [inline, setInline] = useState({ fullName: "", phone: "", addressLine: "", city: "", state: "" });

  useEffect(() => {
    addressesApi
      .fetchAddresses()
      .then((list) => {
        setAddresses(list);
        const def = list.find((a) => a.isDefault) ?? list[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => setAddresses([]));
  }, []);

  const deliveryFee = deliveryOptions.find((d) => d.id === delivery)?.price ?? 0;
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    setError(null);
    setPlacing(true);
    try {
      const order = await ordersApi.createOrder({
        addressId: selectedAddressId ?? undefined,
        address: selectedAddressId ? undefined : { ...inline },
        deliveryMethod: delivery,
        paymentMethod: payment,
      });
      await clearCart();
      navigate(`/orders/${order.id}`, { state: { justPlaced: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong placing your order. Please try again.");
      setPlacing(false);
    }
  };

  if (items.length === 0 && !placing) {
    navigate("/cart");
    return null;
  }

  return (
    <Container className="py-stack-lg">
      <h1 className="font-display text-headline-lg-mobile md:text-headline-lg text-on-surface mb-8">Checkout</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-gutter items-start">
        <div className="space-y-8">
          <section>
            <h2 className="font-display text-headline-sm text-on-surface mb-4 flex items-center gap-2">
              <Icon name="location_on" size={20} className="text-primary" />
              Delivery Address
            </h2>
            <div className="space-y-3">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl border cursor-pointer bg-surface-bright",
                    selectedAddressId === a.id ? "border-primary ring-1 ring-primary" : "border-surface-variant"
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === a.id}
                    onChange={() => setSelectedAddressId(a.id)}
                    className="accent-primary w-4 h-4 mt-1"
                  />
                  <div>
                    <p className="font-semibold text-on-surface">
                      {a.label ?? "Address"} {a.isDefault && <span className="text-label-sm text-primary">(Default)</span>}
                    </p>
                    <p className="text-body-md text-on-surface-variant">
                      {a.addressLine}
                      {a.city ? `, ${a.city}` : ""} {a.state ?? ""} {a.postalCode ?? ""}
                    </p>
                  </div>
                </label>
              ))}
              <label
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border cursor-pointer bg-surface-bright",
                  selectedAddressId === null ? "border-primary ring-1 ring-primary" : "border-surface-variant"
                )}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddressId === null}
                  onChange={() => setSelectedAddressId(null)}
                  className="accent-primary w-4 h-4 mt-1"
                />
                <span className="font-semibold text-on-surface">Use a different address</span>
              </label>
              {selectedAddressId === null && (
                <div className="bg-surface-bright rounded-xl border border-surface-variant p-5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Full Name" required>
                      <Input value={inline.fullName} onChange={(e) => setInline((s) => ({ ...s, fullName: e.target.value }))} />
                    </Field>
                    <Field label="Phone Number" required>
                      <Input value={inline.phone} onChange={(e) => setInline((s) => ({ ...s, phone: e.target.value }))} />
                    </Field>
                  </div>
                  <Field label="Address" required>
                    <Textarea
                      rows={2}
                      value={inline.addressLine}
                      onChange={(e) => setInline((s) => ({ ...s, addressLine: e.target.value }))}
                    />
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="City">
                      <Input value={inline.city} onChange={(e) => setInline((s) => ({ ...s, city: e.target.value }))} />
                    </Field>
                    <Field label="State">
                      <Input value={inline.state} onChange={(e) => setInline((s) => ({ ...s, state: e.target.value }))} />
                    </Field>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="font-display text-headline-sm text-on-surface mb-4 flex items-center gap-2">
              <Icon name="local_shipping" size={20} className="text-primary" />
              Delivery Method
            </h2>
            <div className="space-y-3">
              {deliveryOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border cursor-pointer bg-surface-bright",
                    delivery === opt.id ? "border-primary ring-1 ring-primary" : "border-surface-variant"
                  )}
                >
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === opt.id}
                    onChange={() => setDelivery(opt.id as "standard" | "express")}
                    className="accent-primary w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface">{opt.label}</p>
                    <p className="text-label-sm text-on-surface-variant">{opt.desc}</p>
                  </div>
                  <span className="font-semibold text-on-surface">{formatINR(opt.price)}</span>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-headline-sm text-on-surface mb-4 flex items-center gap-2">
              <Icon name="payments" size={20} className="text-primary" />
              Payment Method
            </h2>
            <div className="space-y-3">
              {paymentOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border cursor-pointer bg-surface-bright",
                    payment === opt.id ? "border-primary ring-1 ring-primary" : "border-surface-variant"
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === opt.id}
                    onChange={() => setPayment(opt.id as "upi" | "card" | "cod")}
                    className="accent-primary w-4 h-4"
                  />
                  <Icon name={opt.icon} size={20} className="text-on-surface-variant" />
                  <span className="font-semibold text-on-surface">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="text-label-sm text-on-surface-variant mt-2">
              This is a mock checkout — no real payment will be processed.
            </p>
          </section>

          <section>
            <h2 className="font-display text-headline-sm text-on-surface mb-4">Order Items</h2>
            <div className="bg-surface-bright rounded-xl border border-surface-variant divide-y divide-surface-variant">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center gap-4 p-4">
                  <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="font-semibold text-on-surface">{item.name}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {item.quantity} {item.unit} · {item.farmName}
                    </p>
                  </div>
                  <span className="font-semibold text-on-surface">{formatINR(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="bg-surface-bright rounded-xl border border-surface-variant p-6 sticky top-24">
          <h2 className="font-display text-headline-sm text-on-surface mb-4">Order Summary</h2>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Delivery Fee</span>
              <span>{formatINR(deliveryFee)}</span>
            </div>
          </div>
          <div className="flex justify-between font-semibold text-on-surface text-headline-sm pt-4 border-t border-surface-variant mb-6">
            <span>Total</span>
            <span>{formatINR(total)}</span>
          </div>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error-container/40 border border-error/20 text-label-sm text-on-error-container">
              {error}
            </div>
          )}
          <Button fullWidth size="lg" onClick={handlePlaceOrder} disabled={placing}>
            {placing ? "Placing Order..." : "Place Order"}
          </Button>
        </div>
      </div>
    </Container>
  );
}
