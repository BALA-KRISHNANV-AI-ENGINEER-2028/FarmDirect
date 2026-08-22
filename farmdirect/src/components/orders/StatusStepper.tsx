import Icon from "../ui/Icon";
import { cn } from "../../utils/cn";
import type { OrderStatus } from "../../types";

const steps: { key: OrderStatus; label: string; icon: string }[] = [
  { key: "PENDING", label: "Order Placed", icon: "check_circle" },
  { key: "CONFIRMED", label: "Order Confirmed", icon: "task_alt" },
  { key: "PREPARING", label: "Farmer Preparing", icon: "agriculture" },
  { key: "READY_FOR_PICKUP", label: "Ready for Pickup", icon: "inventory_2" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery", icon: "local_shipping" },
  { key: "DELIVERED", label: "Delivered", icon: "home" },
];

export default function StatusStepper({ status }: { status: OrderStatus }) {
  const currentIndex = steps.findIndex((s) => s.key === status);
  const cancelled = status === "CANCELLED";

  if (cancelled) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-error-container/40 border border-error/20">
        <Icon name="cancel" className="text-error" size={22} />
        <p className="text-label-md font-semibold text-on-error-container">This order was cancelled.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {steps.map((step, idx) => {
        const done = idx < currentIndex || (idx === currentIndex && status === "DELIVERED");
        const active = idx === currentIndex && status !== "DELIVERED";
        const upcoming = idx > currentIndex;
        return (
          <div key={step.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  done && "bg-primary text-on-primary",
                  active && "bg-primary-container text-on-primary-container ring-4 ring-primary-container/30",
                  upcoming && "bg-surface-container text-outline"
                )}
              >
                <Icon name={step.icon} size={20} filled={done} />
              </div>
              {idx < steps.length - 1 && (
                <div className={cn("w-0.5 flex-1 min-h-8", done ? "bg-primary" : "bg-surface-variant")} />
              )}
            </div>
            <div className="pb-8">
              <p
                className={cn(
                  "text-label-md font-semibold",
                  done || active ? "text-on-surface" : "text-outline"
                )}
              >
                {step.label}
              </p>
              {active && <p className="text-label-sm text-primary mt-0.5">In progress</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
