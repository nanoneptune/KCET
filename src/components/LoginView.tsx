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

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to send verification code.");
        }

        if (data.otp) {
          setSuccessMsg(`Check server logs for code: ${data.otp}`);
        } else {
          setSuccessMsg(`A 6-digit verification code has been dispatched to ${email}.`);
        }
        setStep("otp");
      } else {
        const text = await res.text();
        console.error("Server response was not JSON:", text);
        throw new Error("Server error occurred. Please try again later.");
      }
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

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "OTP verification failed.");
        }

        setSuccessMsg("Email successfully verified!");
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 800);
      } else {
        const text = await res.text();
        console.error("Server response was not JSON:", text);
        throw new Error("Verification failed. Please try again later.");
      }
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
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-rose-50 via-white to-pink-50">
      <div className="max-w-md w-full glass rounded-[3rem] p-8 sm:p-12 shadow-[0_32px_64px_-16px_rgba(244,63,94,0.1)] transition-all duration-500 animate-in fade-in zoom-in duration-700">
        
        {/* Intro */}
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-rose-500/10 text-rose-500 rounded-3xl mb-6 shadow-sm border border-rose-500/10">
            {step === "details" ? <Mail className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8 text-emerald-500" />}
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl tracking-tight text-slate-900 mb-2">
            {step === "details" ? "Student Portal" : "Security Check"}
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            {step === "details" ? "Enter your credentials to match colleges" : "Verify your identity with the OTP"}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs rounded-xl font-bold animate-in fade-in duration-200">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs rounded-xl font-bold animate-in fade-in duration-200">
            {successMsg}
          </div>
        )}

        {step === "details" ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-rose-500/80 uppercase tracking-widest mb-1.5">
                  First Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-600 pointer-events-none">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="login-firstname-input"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder=""
                    className="w-full pl-10 pr-4 py-3 text-sm bg-white/60 border border-white/60 rounded-2xl text-slate-900 focus:border-rose-500 focus:bg-white/80 focus:ring-1 focus:ring-rose-500 outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-500/80 uppercase tracking-widest mb-1.5">
                  Last Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-600 pointer-events-none">
                    <User className="h-4 w-4" />
                  </span>
                  <input
                    id="login-lastname-input"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder=""
                    className="w-full pl-10 pr-4 py-3 text-sm bg-white/60 border border-white/60 rounded-2xl text-slate-900 focus:border-rose-500 focus:bg-white/80 focus:ring-1 focus:ring-rose-500 outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-rose-500/80 uppercase tracking-widest mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-600 pointer-events-none">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  id="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full pl-10 pr-4 py-3 text-sm bg-white/60 border border-white/60 rounded-2xl text-slate-900 focus:border-rose-500 focus:bg-white/80 focus:ring-1 focus:ring-rose-500 outline-hidden transition-all placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              id="login-send-otp-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-2xl shadow-lg shadow-rose-500/10 hover:shadow-rose-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait active:scale-99"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Send Code via Gmail</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </>
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/60"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/80 px-3.5 text-slate-500 font-black tracking-widest">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onSkipLogin}
              className="w-full py-4 bg-white/40 hover:bg-white/60 text-rose-500 border border-white/80 rounded-2xl font-black text-sm transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98] backdrop-blur-sm shadow-sm"
            >
              <span>Explore as Guest</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
            <div>
              <label className="block text-xs font-bold text-rose-500/80 uppercase tracking-widest mb-1.5 text-center">
                Enter 6-Digit OTP Verification Code
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-600 pointer-events-none">
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
                  className="w-full text-center tracking-widest pl-10 pr-4 py-3.5 font-mono text-xl bg-white/60 border border-white/60 rounded-2xl text-slate-900 focus:border-rose-500 focus:bg-white/80 focus:ring-1 focus:ring-rose-500 outline-hidden transition-all"
                />
              </div>
            </div>

            <button
              id="login-verify-otp-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-75 disabled:cursor-wait active:scale-99"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-white" />
                  <span>Verify OTP Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="login-back-btn"
              onClick={handleBackToDetails}
              className="w-full py-3 bg-white/60 hover:bg-white/80 border border-white/60 text-rose-500 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center space-x-1.5 active:scale-99"
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
