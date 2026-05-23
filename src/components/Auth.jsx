import React, { useState } from "react";
import { toast } from "react-toastify";

const Auth = ({ onLoginSuccess, theme }) => {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
  // authMode can be: "login" | "signup" | "verify" | "forgot" | "reset"
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [emailForVerification, setEmailForVerification] = useState("");
  const isDark = theme === "dark";

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  // Client-Side Pre-Hashing (SHA-256) using Browser Web Crypto API
  // This prevents plaintext master passwords from being sent over the network!
  const hashPassword = async (pass) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pass);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (authMode === "login") {
      if (!formData.email && !formData.username) {
        toast.error("Please enter email or username");
        return false;
      }
      if (formData.password.length < 4) {
        toast.error("Password must be at least 4 characters long");
        return false;
      }
    } else if (authMode === "signup") {
      if (!formData.username || !formData.email || !formData.password) {
        toast.error("All fields are required");
        return false;
      }
      if (formData.username.length < 3) {
        toast.error("Username must be at least 3 characters");
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error("Please enter a valid email address");
        return false;
      }
      if (formData.password.length < 6) {
        toast.error("Password must be at least 6 characters long");
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return false;
      }
    } else if (authMode === "verify") {
      if (formData.otp.length !== 6 || isNaN(formData.otp)) {
        toast.error("Please enter a valid 6-digit OTP code");
        return false;
      }
    } else if (authMode === "forgot") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error("Please enter a valid email address");
        return false;
      }
    } else if (authMode === "reset") {
      if (formData.otp.length !== 6 || isNaN(formData.otp)) {
        toast.error("Please enter a valid 6-digit OTP code");
        return false;
      }
      if (formData.newPassword.length < 6) {
        toast.error("New password must be at least 6 characters long");
        return false;
      }
      if (formData.newPassword !== formData.confirmNewPassword) {
        toast.error("Passwords do not match");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    let endpoint = "";
    let payload = {};

    try {
      switch (authMode) {
        case "login":
          endpoint = "/api/auth/login";
          // Pre-hash master password on the client side
          const clientHashLogin = await hashPassword(formData.password);
          payload = {
            identifier: formData.email || formData.username,
            password: clientHashLogin,
          };
          break;
        case "signup":
          endpoint = "/api/auth/signup";
          // Pre-hash master password on the client side
          const clientHashSignup = await hashPassword(formData.password);
          payload = {
            username: formData.username,
            email: formData.email,
            password: clientHashSignup,
          };
          break;
        case "verify":
          endpoint = "/api/auth/verify-otp";
          payload = {
            email: emailForVerification,
            otp: formData.otp,
          };
          break;
        case "forgot":
          endpoint = "/api/auth/forgot-password";
          payload = {
            email: formData.email,
          };
          break;
        case "reset":
          endpoint = "/api/auth/reset-password";
          const clientHashReset = await hashPassword(formData.newPassword);
          payload = {
            email: formData.email,
            otp: formData.otp,
            newPassword: clientHashReset,
          };
          break;
        default:
          break;
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle unverified user during login
        if (authMode === "login" && data.unverified) {
          setEmailForVerification(data.email);
          setAuthMode("verify");
          setFormData((prev) => ({ ...prev, otp: "" }));
          toast.warning(data.error || "Please verify your account");
          return;
        }
        throw new Error(data.error || "Authentication failed");
      }

      // Handle successful state transitions
      if (authMode === "signup") {
        setEmailForVerification(formData.email);
        setAuthMode("verify");
        setFormData((prev) => ({ ...prev, otp: "" }));
        toast.info("A verification code was sent to your email.");
      } else if (authMode === "forgot") {
        setAuthMode("reset");
        setFormData((prev) => ({ ...prev, otp: "", newPassword: "", confirmNewPassword: "" }));
        toast.info("A password reset code was sent.");
      } else if (authMode === "reset") {
        setAuthMode("login");
        setFormData((prev) => ({ ...prev, email: formData.email, password: "" }));
        toast.success("Master password updated successfully! Please log in.");
      } else {
        // Success for Login & Verification
        toast.success(data.message || "Logged in successfully!");
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        onLoginSuccess(data.token, data.user);
      }
    } catch (err) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    const targetEmail = authMode === "verify" ? emailForVerification : formData.email;
    const purpose = authMode === "verify" ? "verification" : "reset";

    try {
      const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, purpose }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      toast.success("A fresh OTP code was generated!");
    } catch (err) {
      toast.error(err.message || "Resend failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background ambient blobs */}
      <div className="absolute top-1/4 left-1/4 -z-10 w-72 h-72 rounded-full bg-emerald-500 opacity-20 blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 -z-10 w-80 h-80 rounded-full bg-indigo-500 opacity-15 blur-[120px] animate-pulse delay-1000"></div>

      <div
        className={`${
          isDark
            ? "bg-slate-900/60 border-slate-800 text-white"
            : "bg-white/75 border-slate-200 shadow-xl shadow-slate-200/40 text-slate-800"
        } max-w-md w-full space-y-8 backdrop-blur-xl border p-8 rounded-3xl relative overflow-hidden transition-all duration-500`}
      >
        {/* Glowing visual stripe */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>

        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight flex justify-center items-center gap-1">
            <span className="text-emerald-500 font-mono">&lt;</span>
            <span className={isDark ? "text-white" : "text-slate-800"}>Pass</span>
            <span className="text-emerald-500 font-mono">OP/&gt;</span>
          </h1>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {authMode === "login" && "Securely access your password vault"}
            {authMode === "signup" && "Create your master vault password to begin"}
            {authMode === "verify" && `A 6-digit OTP code was sent to ${emailForVerification}`}
            {authMode === "forgot" && "Recover your account master vault details"}
            {authMode === "reset" && `Configure your new secure master credentials`}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            {/* 1. SIGNUP: Username */}
            {authMode === "signup" && (
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-300" : "text-slate-655"}`}>
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="e.g. cyber_guardian"
                  className={`${
                    isDark
                      ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus:ring-emerald-500"
                      : "bg-slate-50 border-slate-250 text-slate-800 placeholder-slate-400 focus:ring-emerald-500/80 focus:bg-white"
                  } appearance-none relative block w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 text-sm`}
                />
              </div>
            )}

            {/* 2. LOGIN / SIGNUP / FORGOT / RESET: Email input */}
            {(authMode === "login" || authMode === "signup" || authMode === "forgot") && (
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-300" : "text-slate-655"}`}>
                  {authMode === "login" ? "Username or Email" : "Email Address"}
                </label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={authMode === "login" ? "Enter username or email" : "you@example.com"}
                  className={`${
                    isDark
                      ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus:ring-emerald-500"
                      : "bg-slate-50 border-slate-250 text-slate-800 placeholder-slate-400 focus:ring-emerald-500/80 focus:bg-white"
                  } appearance-none relative block w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 text-sm`}
                />
              </div>
            )}

            {/* 3. LOGIN / SIGNUP: Master Password */}
            {(authMode === "login" || authMode === "signup") && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-655"}`}>
                    Master Password
                  </label>
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("forgot");
                        setFormData((prev) => ({ ...prev, email: "" }));
                      }}
                      className="text-[10px] font-bold text-emerald-500 hover:text-emerald-450 hover:underline tracking-wide transition-colors uppercase"
                    >
                      Forgot Master Password?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`${
                    isDark
                      ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus:ring-emerald-500"
                      : "bg-slate-50 border-slate-250 text-slate-800 placeholder-slate-400 focus:ring-emerald-500/80 focus:bg-white"
                  } appearance-none relative block w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 text-sm`}
                />
              </div>
            )}

            {/* 4. SIGNUP: Confirm Master Password */}
            {authMode === "signup" && (
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-300" : "text-slate-655"}`}>
                  Confirm Master Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`${
                    isDark
                      ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus:ring-emerald-500"
                      : "bg-slate-50 border-slate-250 text-slate-800 placeholder-slate-400 focus:ring-emerald-500/80 focus:bg-white"
                  } appearance-none relative block w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 text-sm`}
                />
              </div>
            )}

            {/* 5. VERIFY / RESET: OTP verification input */}
            {(authMode === "verify" || authMode === "reset") && (
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-300" : "text-slate-655"}`}>
                  Enter 6-Digit Code (OTP)
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength={6}
                  required
                  value={formData.otp}
                  onChange={handleChange}
                  placeholder="e.g. 123456"
                  className={`${
                    isDark
                      ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus:ring-emerald-500"
                      : "bg-slate-50 border-slate-250 text-slate-800 placeholder-slate-400 focus:ring-emerald-500/80 focus:bg-white"
                  } appearance-none relative block w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 font-mono tracking-widest text-center text-lg font-bold`}
                />
              </div>
            )}

            {/* 6. RESET: New Master Password */}
            {authMode === "reset" && (
              <>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-300" : "text-slate-655"}`}>
                    New Master Password
                  </label>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    value={formData.newPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`${
                      isDark
                        ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus:ring-emerald-500"
                        : "bg-slate-50 border-slate-250 text-slate-800 placeholder-slate-400 focus:ring-emerald-500/80 focus:bg-white"
                    } appearance-none relative block w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 text-sm`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-300" : "text-slate-655"}`}>
                    Confirm New Master Password
                  </label>
                  <input
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type="password"
                    required
                    value={formData.confirmNewPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`${
                      isDark
                        ? "bg-slate-950/50 border-slate-800 text-white placeholder-slate-600 focus:ring-emerald-500"
                        : "bg-slate-50 border-slate-250 text-slate-800 placeholder-slate-400 focus:ring-emerald-500/80 focus:bg-white"
                    } appearance-none relative block w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-transparent transition-all duration-300 text-sm`}
                  />
                </div>
              </>
            )}
          </div>

          {/* Action Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-all duration-300 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <>
                  {authMode === "login" && "Access Secure Vault"}
                  {authMode === "signup" && "Register Master Account"}
                  {authMode === "verify" && "Verify Secure Code"}
                  {authMode === "forgot" && "Send Password Reset OTP"}
                  {authMode === "reset" && "Reset Master Password"}
                </>
              )}
            </button>
          </div>
        </form>

        {/* Dynamic Mode Switch Links */}
        <div className="flex flex-col gap-3 text-center mt-4 border-t border-slate-800/10 pt-4">
          {/* Signup <--> Login Switch */}
          {authMode === "login" && (
            <button
              onClick={() => {
                setAuthMode("signup");
                setFormData({ username: "", email: "", password: "", confirmPassword: "" });
              }}
              className="text-xs font-semibold text-emerald-500 hover:text-emerald-450 hover:underline transition-colors"
            >
              Don't have a secure vault yet? Sign Up
            </button>
          )}

          {authMode === "signup" && (
            <button
              onClick={() => {
                setAuthMode("login");
                setFormData({ username: "", email: "", password: "", confirmPassword: "" });
              }}
              className="text-xs font-semibold text-emerald-500 hover:text-emerald-450 hover:underline transition-colors"
            >
              Already have a secure vault? Log In
            </button>
          )}

          {/* OTP Resend Option */}
          {(authMode === "verify" || authMode === "reset") && (
            <div className="flex justify-between items-center px-2">
              <button
                type="button"
                onClick={handleResendOTP}
                className="text-[10px] font-bold text-slate-400 hover:text-emerald-400 transition-colors uppercase tracking-wider"
              >
                Resend Code (OTP)
              </button>
              
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 transition-colors uppercase tracking-wider"
              >
                Back to Log In
              </button>
            </div>
          )}

          {/* Back to Login option for Forgot view */}
          {authMode === "forgot" && (
            <button
              type="button"
              onClick={() => setAuthMode("login")}
              className="text-xs font-semibold text-emerald-500 hover:text-emerald-450 hover:underline transition-colors"
            >
              Remember password? Back to Log In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
