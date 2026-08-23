import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { Field, Input } from "../../components/ui/Input";
import GoogleButton from "../../components/auth/GoogleButton";
import { useAuth } from "../../hooks/useAuth";
import { ApiError } from "../../services/apiClient";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "google_cancelled") {
      return "Google sign in was cancelled.";
    }
    return null;
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "customer" ? "/customer/dashboard" : "/farmer/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-headline-lg text-on-surface mb-2">Welcome Back</h1>
      <p className="text-body-md text-on-surface-variant mb-6">Sign in to continue to FarmDirect.</p>

      <div className="mb-6">
        <GoogleButton />
      </div>

      <div className="relative flex items-center justify-center my-6">
        <div className="border-t border-outline-variant w-full" />
        <span className="bg-background px-3 text-label-sm text-on-surface-variant uppercase tracking-wider absolute">
          Or sign in with email
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" required>
          <Input type="email" placeholder="you@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" required>
          <Input
            type="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="text-label-sm text-error">{error}</p>}
        <div className="flex justify-end">
          <Link to="/auth/forgot-password" className="text-label-sm font-semibold text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth size="lg" disabled={submitting}>
          {submitting ? "Signing In..." : "Sign In"}
        </Button>
      </form>

      <p className="text-body-md text-on-surface-variant text-center mt-6">
        Don't have an account?{" "}
        <Link to="/auth/register" className="text-primary font-semibold hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
