import React, { useState } from "react";
import { Mail, User, ShieldCheck, ArrowRight, RefreshCw, Loader2 } from "lucide-react";
import { StudentProfile } from "../types";

interface LoginViewProps {
  onLoginSuccess: (user: StudentProfile) => void;
  onSkipLogin: () => void;
}

export default function LoginView({ onLoginSuccess, onSkipLogin }: LoginViewProps) {
  const [step, setStep] = useState<"details" | "otp">("details");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMsg("Please fill out all fields.");
      return;
    }
    
    if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
      setErrorMsg("Only @gmail.com email addresses are allowed.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim().toLowerCase()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code.");
      }

      if (data.otp) {
        setSuccessMsg(`OTP generated! Since SMTP mail delivery is skipped or offline, please enter code: ${data.otp}`);
      } else {
        setSuccessMsg(`A 6-digit verification code has been dispatched to ${email}.`);
      }
      setStep("otp");
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred. Please check your SMTP settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMsg("Please enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "OTP verification failed.");
      }

      setSuccessMsg("Email successfully verified!");
      setTimeout(() => {
        onLoginSuccess(data.user);
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDetails = () => {
    setStep("details");
    setErrorMsg("");
    setSuccessMsg("");
    setOtp("");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full bg-white border border-gray-100 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-100/50 transition-all duration-300">
        
        {/* Intro */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl mb-4 shadow-sm">
            {step === "details" ? <Mail className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7 text-emerald-600" />}
          </div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl tracking-tight text-gray-900">
            {step === "details" ? "Student Portal" : "Verification Step"}
          </h2>
          <p className="text-sm text-gray-500 mt-1.5 max-w-xs mx-auto">
            {step === "details" 
              ? "Access your personalized college recommendations." 
              : "We've generated a secure 6-digit code for your account access."}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-xl font-medium animate-in fade-in duration-200">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl font-medium animate-in fade-in duration-200">
            {successMsg}
          </div>
        )}

        {step === "details" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  First Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="login-firstname-input"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder=""
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Last Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="login-lastname-input"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder=""
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E.g., student@gmail.com"
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                />
              </div>
            </div>

            <button
              id="login-send-otp-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md shadow-blue-100 hover:shadow-lg hover:shadow-blue-200/50 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Send OTP via Gmail</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400 font-bold tracking-widest">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onSkipLogin}
              className="w-full py-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Skip for now</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 text-center">
                Enter 6-Digit OTP Verification Code
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <input
                  id="login-otp-input"
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full text-center tracking-widest pl-9 pr-4 py-3 font-mono text-xl bg-gray-50/50 border border-gray-200 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-hidden transition-all"
                />
              </div>
            </div>

            <button
              id="login-verify-otp-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium shadow-md shadow-emerald-100 hover:shadow-lg hover:shadow-emerald-200/50 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Verify OTP Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="login-back-btn"
              onClick={handleBackToDetails}
              className="w-full py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center space-x-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Change Name or Email</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
