/**
 * Green Sentinel - Login Page
 *
 * Phone number + OTP authentication for farmers.
 * Uses AWS Cognito when configured, falls back to demo mode.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Phone, Lock, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const {
    sendOtp,
    verifyOtp,
    isLoading,
    error,
    clearError,
    signInStep,
    isAuthenticated,
    cognitoConfigured,
  } = useAuthStore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Clear error when switching steps
  useEffect(() => {
    clearError();
  }, [signInStep]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Validate phone number (Indian mobile)
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length !== 10 || !/^[6-9]/.test(cleaned)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    const success = await sendOtp(phoneNumber);
    if (success) {
      toast.success('OTP sent to your phone');
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    const success = await verifyOtp(otp);
    if (success) {
      toast.success('Welcome to Green Sentinel!');
      navigate('/');
    }
  };

  const handleChangePhone = () => {
    setOtp('');
    useAuthStore.setState({ signInStep: 'PHONE', error: null });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Green Sentinel</h1>
          <p className="text-primary-200 mt-2">
            Digital Immune System for Indian Agriculture
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">
            {signInStep === 'PHONE' ? 'Welcome Back' : 'Enter OTP'}
          </h2>

          {signInStep === 'PHONE' ? (
            <form onSubmit={handlePhoneSubmit}>
              <div className="mb-4">
                <label className="label">Mobile Number</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-500">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="input pl-20"
                    autoComplete="tel"
                    inputMode="numeric"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  We'll send you a verification code via SMS
                </p>
              </div>

              <button
                type="submit"
                disabled={phoneNumber.length !== 10 || isLoading}
                className="btn-primary w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Get OTP
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit}>
              <div className="mb-4">
                <label className="label">Verification Code</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="input pl-10 text-center text-2xl tracking-widest"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Enter the 6-digit code sent to +91 {phoneNumber}
                </p>
              </div>

              <button
                type="submit"
                disabled={otp.length !== 6 || isLoading}
                className="btn-primary w-full mb-3"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Verify & Login
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleChangePhone}
                className="btn-ghost w-full text-slate-600"
              >
                <ArrowLeft className="w-4 h-4" />
                Change phone number
              </button>
            </form>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-primary-200 text-sm mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>

        {/* Demo hint - only show when Cognito not configured */}
        {!cognitoConfigured && (
          <div className="mt-4 p-3 bg-white/10 rounded-lg text-center">
            <p className="text-white/80 text-sm">
              <strong>Demo Mode:</strong> Enter any 10-digit number and any 6-digit OTP
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
