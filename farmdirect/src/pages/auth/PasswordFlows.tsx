import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import Icon from "../../components/ui/Icon";
import { Field, Input } from "../../components/ui/Input";
import * as authApi from "../../services/authApi";
import { ApiError } from "../../services/apiClient";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container/15 flex items-center justify-center mx-auto mb-4">
          <Icon name="mark_email_read" size={30} className="text-primary" />
        </div>
        <h1 className="font-display text-headline-lg text-on-surface mb-2">Check Your Email</h1>
        <p className="text-body-md text-on-surface-variant mb-6">
          If that email is registered, we've sent a password reset link to it.
        </p>
        <Link to="/auth/login" className="text-primary font-semibold hover:underline">
          Back to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-headline-lg text-on-surface mb-2">Forgot Password</h1>
      <p className="text-body-md text-on-surface-variant mb-6">
        Enter your email and we'll send you a link to reset your password.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);
          try {
            await authApi.forgotPassword(email);
            setSent(true);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
            setSubmitting(false);
          }
        }}
        className="space-y-4"
      >
        <Field label="Email" required>
          <Input type="email" placeholder="you@email.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {error && <p className="text-label-sm text-error">{error}</p>}
        <Button type="submit" fullWidth size="lg" disabled={submitting}>
          {submitting ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>
      <p className="text-body-md text-on-surface-variant text-center mt-6">
        <Link to="/auth/login" className="text-primary font-semibold hover:underline">
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (done) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary-container/15 flex items-center justify-center mx-auto mb-4">
          <Icon name="check_circle" size={30} className="text-primary" />
        </div>
        <h1 className="font-display text-headline-lg text-on-surface mb-2">Password Updated</h1>
        <p className="text-body-md text-on-surface-variant mb-6">You can now sign in with your new password.</p>
        <Link to="/auth/login" className="text-primary font-semibold hover:underline">
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-headline-lg text-on-surface mb-2">Reset Password</h1>
      <p className="text-body-md text-on-surface-variant mb-6">Choose a new password for your account.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (newPassword !== confirmPassword) {
            setError("Passwords don't match.");
            return;
          }
          setSubmitting(true);
          try {
            await authApi.resetPassword(token, newPassword);
            setDone(true);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
            setSubmitting(false);
          }
        }}
        className="space-y-4"
      >
        <Field label="New Password" required>
          <Input type="password" placeholder="••••••••" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </Field>
        <Field label="Confirm New Password" required>
          <Input type="password" placeholder="••••••••" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </Field>
        {error && <p className="text-label-sm text-error">{error}</p>}
        <Button type="submit" fullWidth size="lg" disabled={submitting}>
          {submitting ? "Resetting..." : "Reset Password"}
        </Button>
      </form>
    </div>
  );
}
