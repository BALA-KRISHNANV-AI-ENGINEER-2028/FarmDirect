import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import GoogleButton from "../../components/auth/GoogleButton";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../services/apiClient";
import { cn } from "../../utils/cn";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [role, setRole] = useState<"customer" | "farmer">("customer");
  const [fullName, setFullName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await register({ email, password, role, fullName, phone: phone || undefined, farmName: role === "farmer" ? farmName : undefined });
      navigate(user.role === "customer" ? "/customer/dashboard" : "/farmer/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-headline-lg text-on-surface mb-2">Join FarmDirect</h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        {role === "customer" ? "Create an account to start shopping fresh." : "Register your farm and start selling direct."}
      </p>

      <div className="flex bg-surface-container-low rounded-lg p-1 mb-6">
        {(["customer", "farmer"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cn(
              "flex-1 py-2 rounded-md text-label-md font-semibold capitalize transition-colors",
              role === r ? "bg-surface-bright shadow-sm text-primary" : "text-on-surface-variant"
            )}
          >
            {r === "customer" ? "I'm a Customer" : "I'm a Farmer"}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <GoogleButton role={role} label={`Sign up with Google as ${role === "farmer" ? "Farmer" : "Customer"}`} />
      </div>

      <div className="relative flex items-center justify-center my-6">
        <div className="border-t border-outline-variant w-full" />
        <span className="bg-background px-3 text-label-sm text-on-surface-variant uppercase tracking-wider absolute">
          Or register with email
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name" required>
          <Input placeholder="Your full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        {role === "farmer" && (
          <Field label="Farm Name" required>
            <Input placeholder="e.g. Sunrise Valley Farm" required value={farmName} onChange={(e) => setFarmName(e.target.value)} />
          </Field>
        )}
        <Field label="Email" required>
          <Input type="email" placeholder="you@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input placeholder="+91 00000 00000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Password" required>
          <Input
            type="password"
            placeholder="At least 8 characters"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="text-label-sm text-error">{error}</p>}
        <Button type="submit" fullWidth size="lg" disabled={submitting}>
          {submitting ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <p className="text-body-md text-on-surface-variant text-center mt-6">
        Already have an account?{" "}
        <Link to="/auth/login" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
