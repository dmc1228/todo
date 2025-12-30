import { useState, FormEvent } from "react";
import { useAuth } from "../../hooks/useAuth";
import "./AuthForm.css";

export function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: authError } =
        mode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password);

      if (authError) {
        setError(authError.message);
      } else if (mode === "signup") {
        setError("Check your email to confirm your account");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Todo App</h1>
        <p className="auth-subtitle">
          {mode === "signin"
            ? "Sign in to your account"
            : "Create a new account"}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {error && (
            <div
              className={`auth-message ${error.includes("Check your email") ? "success" : "error"}`}
            >
              {error}
            </div>
          )}

          <button type="submit" disabled={isLoading} className="auth-button">
            {isLoading
              ? "Loading..."
              : mode === "signin"
                ? "Sign In"
                : "Sign Up"}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === "signin" ? (
            <>
              Don't have an account?{" "}
              <button onClick={() => setMode("signup")} className="toggle-link">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("signin")} className="toggle-link">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
