import { useState } from "react";
import { supabase } from "./lib/supabase";
import "./Auth.css";
export default function Auth({ onNotify = () => {} }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [loginPopup, setLoginPopup] = useState(false);
  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage("");
    setLoginPopup(false);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error?.message || "Could not start Google sign-in.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setLoginPopup(false);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        if (!name.trim()) {
          throw new Error("Please enter your name.");
        }
        if (!gender) throw new Error("Please select your gender.");
        const today = new Date().toISOString().slice(0, 10);
        if (!dateOfBirth || dateOfBirth > today || Number.isNaN(Date.parse(dateOfBirth))) {
          throw new Error("Please enter a valid date of birth that is not in the future.");
        }
        const cleanMobile = mobileNumber.replace(/[\s()-]/g, "");
        if (!/^\+[1-9]\d{7,14}$/.test(cleanMobile)) {
          throw new Error("Enter a valid mobile number with country code, e.g. +919876543210.");
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name.trim(),
              gender,
              date_of_birth: dateOfBirth,
              mobile_number: cleanMobile,
            },
          },
        });
        if (error) throw error;
        onNotify("Your account created successfully!" + (!data.session ? " Check your email to confirm your account." : ""));
        if (!data.session) {
          setMessage("Check your email to confirm your account before logging in.");
        }
      }
    } catch (error) {
      if (isLogin && (error?.message?.toLowerCase().includes("invalid login credentials") || error?.status === 400 && error?.code === "invalid_credentials")) {
        setLoginPopup(true);
      } else {
        setMessage(error?.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>TeamFlow<span>.</span></h1>
        <p className="auth-subtitle">
          Manage work together
        </p>
        <h2>{isLogin ? "Welcome Back!" : "Create Account"}</h2>
        <p className="auth-description">
          {isLogin
            ? "Sign in to continue to your workspace."
            : "Join TeamFlow and manage your team."}
        </p>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="auth-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          {!isLogin && (
            <>
              <div className="auth-field">
                <label htmlFor="signup-gender">Gender *</label>
                <select id="signup-gender" value={gender} onChange={(e) => setGender(e.target.value)} required
                  style={{ width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "white", fontSize: 14 }}>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer to self-describe">Prefer to self-describe</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div className="auth-field">
                <label htmlFor="signup-dob">Date of Birth *</label>
                <input id="signup-dob" type="date" value={dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDateOfBirth(e.target.value)} required />
              </div>
              <div className="auth-field">
                <label htmlFor="signup-mobile">Mobile Number *</label>
                <input id="signup-mobile" type="tel" value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="+919876543210" autoComplete="tel"
                  pattern="\+[1-9][0-9]{7,14}" title="Use international format, e.g. +919876543210" required />
                <small style={{ color: "#64748b", fontSize: 12 }}>Include country code, without spaces.</small>
              </div>
            </>
          )}
          <div className="auth-field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}
          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isLogin
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          <span style={{ fontSize: 12, color: "#64748b" }}>OR</span>
          <span style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        </div>
        <button type="button" onClick={handleGoogleLogin} disabled={loading}
          style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "center", gap: 12,
            padding: "12px 16px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 10,
            fontWeight: 600, fontSize: 14, color: "#1e293b", cursor: loading ? "not-allowed" : "pointer" }}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M21.35 12.25c0-.68-.06-1.36-.18-2H12v3.79h5.24a4.48 4.48 0 0 1-1.95 2.94v2.46h3.16c1.85-1.7 2.9-4.2 2.9-7.19Z" />
            <path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.16-2.46c-.88.59-2 .94-3.29.94-2.53 0-4.67-1.71-5.44-4.01H3.3v2.53A9.75 9.75 0 0 0 12 21.5Z" />
            <path fill="#FBBC05" d="M6.56 13.61a5.85 5.85 0 0 1 0-3.22V7.86H3.3a9.75 9.75 0 0 0 0 8.28l3.26-2.53Z" />
            <path fill="#EA4335" d="M12 6.38c1.43 0 2.72.49 3.73 1.46l2.8-2.8A9.37 9.37 0 0 0 12 2.5a9.75 9.75 0 0 0-8.7 5.36l3.26 2.53C7.33 8.09 9.47 6.38 12 6.38Z" />
          </svg>
          Continue with Google
        </button>
        <p className="auth-switch">
          {isLogin
            ? "Don't have an account?"
            : "Already have an account?"}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage("");
              setLoginPopup(false);
            }}
          >
            {isLogin ? " Sign Up" : " Sign In"}
          </button>
        </p>
      </div>
      {loginPopup && (
        <div
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setLoginPopup(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,.55)", padding: 16 }}
        >
          <div role="alertdialog" aria-modal="true" aria-labelledby="login-error-title" aria-describedby="login-error-description"
            style={{ width: "100%", maxWidth: 410, background: "white", borderRadius: 18, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,.2)", color: "#0f172a" }}>
            <h2 id="login-error-title" style={{ fontSize: 21, fontWeight: 700, margin: "0 0 12px" }}>Unable to sign in</h2>
            <p id="login-error-description" style={{ fontSize: 14, lineHeight: 1.6, color: "#475569", margin: "0 0 22px" }}>
              The email or password is incorrect, or you may not have an account yet. Please check your details or create an account.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setLoginPopup(false)}
                style={{ border: "1px solid #cbd5e1", borderRadius: 10, background: "white", padding: "10px 16px", cursor: "pointer" }}>Try again</button>
              <button type="button" onClick={() => { setIsLogin(false); setLoginPopup(false); setPassword(""); setMessage(""); }}
                style={{ border: 0, borderRadius: 10, background: "#2563eb", color: "white", padding: "10px 16px", cursor: "pointer", fontWeight: 600 }}>Create Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}