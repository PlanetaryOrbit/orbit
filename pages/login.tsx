"use client";

import { NextPage } from "next";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import React, { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { loginState } from "@/state";
import Router from "next/router";
import axios from "axios";
import Link from "next/link";
import { useTheme } from "next-themes";
import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconRocket,
  IconSun,
  IconMoon,
  IconEye,
  IconEyeOff,
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconBrandDiscord,
  IconShieldCheck,
} from "@tabler/icons-react";
import { OAuthAvailable } from "@/hooks/useOAuth";

type LoginForm = { username: string; password: string };
type SignupForm = { username: string; password: string; verifypassword: string };

const LoginPage: NextPage = () => {
  const [login, setLogin] = useRecoilState(loginState);
  const { isAvailable: isOAuth } = OAuthAvailable();
  const { theme, setTheme } = useTheme();

  const loginMethods = useForm<LoginForm>();
  const signupMethods = useForm<SignupForm>();

  const { register: regLogin, handleSubmit: submitLogin, setError: setErrLogin, formState: { errors: loginErrors } } = loginMethods;
  const { register: regSignup, handleSubmit: submitSignup, setError: setErrSignup, getValues: getSignupValues, formState: { errors: signupErrors } } = signupMethods;

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<0 | 1 | 2>(0);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    loginMethods.reset();
    signupMethods.reset();
    setVerificationError(false);
    setSignupStep(0);
    setLoading(false);
  }, [mode]);

  const onSubmitLogin: SubmitHandler<LoginForm> = async (data) => {
    setLoading(true);
    try {
      const req = await axios.post('/api/auth/login', data);
      const { data: res } = req;
      setLogin({ ...res.user, workspaces: res.workspaces });
      Router.push("/");
    } catch (e: any) {
      const msg = e.response?.data?.error || "Something went wrong";
      const status = e.response?.status;
      if (status === 404) {
        setErrLogin("username", { type: "custom", message: msg });
      } else if (status === 401) {
        setErrLogin("password", { type: "custom", message: msg });
      } else {
        setErrLogin("username", { type: "custom", message: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmitSignup: SubmitHandler<SignupForm> = async ({ username, password, verifypassword }) => {
    if (password !== verifypassword) {
      setErrSignup("verifypassword", { type: "validate", message: "Passwords must match" });
      return;
    }
    setLoading(true);
    setVerificationError(false);
    try {
      const { data } = await axios.post("/api/auth/signup/start", { username });
      setVerificationCode(data.code);
      setSignupStep(2);
    } catch (e: any) {
      setErrSignup("username", {
        type: "custom",
        message: e.response?.data?.error || "Unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onVerifyAgain = async () => {
    setLoading(true);
    setVerificationError(false);
    const { password } = getSignupValues();
    try {
      const { data } = await axios.post("/api/auth/signup/finish", { password, code: verificationCode });
      if (data.success) Router.push("/");
      else setVerificationError(true);
    } catch {
      setVerificationError(true);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(verificationCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <>
      <Head>
        <title>{mode === "login" ? "Sign In" : "Create Account"} - Orbit</title>
        <meta name="description" content="Sign in to your Orbit account" />
      </Head>

      <div className="min-h-screen flex">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-pink-600 via-purple-600 to-pink-500 overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
          </div>

          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-12 text-white">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <IconRocket className="w-7 h-7" />
              </div>
              <span className="text-2xl font-bold">Orbit</span>
            </div>

            {/* Main Content */}
            <div className="max-w-md">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl xl:text-5xl font-bold leading-tight mb-6"
              >
                Manage your team,
                <br />
                <span className="text-white/80">your way.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-lg text-white/70 leading-relaxed"
              >
                The modern staff management platform for Roblox groups. 
                Powerful features, intuitive design, completely free.
              </motion.p>

              {/* Features */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-10 space-y-4"
              >
                {[
                  "Track staff activity in real-time",
                  "Schedule and manage sessions",
                  "Custom roles and permissions",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <IconCheck className="w-4 h-4" />
                    </div>
                    <span className="text-white/80">{feature}</span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Footer */}
            <div className="text-sm text-white/50">
              © {new Date().getFullYear()} Planetary. Open source under GPL-3.0.
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-6">
            <div className="lg:hidden flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-pink-500 flex items-center justify-center">
                <IconRocket className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-white">Orbit</span>
            </div>
            <div className="lg:flex-1" />
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <IconSun className="w-5 h-5" /> : <IconMoon className="w-5 h-5" />}
            </button>
          </div>

          {/* Form Container */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
              {/* Mode Tabs */}
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-8">
                {(["login", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    disabled={loading}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                      mode === m
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {m === "login" ? "Sign In" : "Create Account"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {mode === "login" && (
                  <motion.div
                    key="login"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Welcome back
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400">
                        Sign in to your account to continue
                      </p>
                    </div>

                    <FormProvider {...loginMethods}>
                      <form onSubmit={submitLogin(onSubmitLogin)} className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                            Username
                          </label>
                          <input
                            {...regLogin("username", { required: "Username is required" })}
                            placeholder="Enter your username"
                            className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border ${
                              loginErrors.username 
                                ? "border-red-500 focus:ring-red-500/20" 
                                : "border-slate-200 dark:border-slate-700 focus:ring-pink-500/20 focus:border-pink-500"
                            } text-slate-900 dark:text-white placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2`}
                          />
                          {loginErrors.username && (
                            <p className="mt-1.5 text-sm text-red-500">{loginErrors.username.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              {...regLogin("password", { required: "Password is required" })}
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter your password"
                              className={`w-full px-4 py-3 pr-12 rounded-xl bg-white dark:bg-slate-800 border ${
                                loginErrors.password 
                                  ? "border-red-500 focus:ring-red-500/20" 
                                  : "border-slate-200 dark:border-slate-700 focus:ring-pink-500/20 focus:border-pink-500"
                              } text-slate-900 dark:text-white placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                              {showPassword ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
                            </button>
                          </div>
                          {loginErrors.password && (
                            <p className="mt-1.5 text-sm text-red-500">{loginErrors.password.message}</p>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <Link 
                            href="/forgot-password" 
                            className="text-sm text-pink-600 dark:text-pink-400 hover:underline"
                          >
                            Forgot password?
                          </Link>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <>
                              Sign In
                              <IconArrowRight className="w-5 h-5" />
                            </>
                          )}
                        </button>

                        {isOAuth && (
                          <>
                            <div className="relative my-6">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                              </div>
                              <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-slate-50 dark:bg-slate-900 text-slate-500">
                                  Or continue with
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => window.location.href = '/api/auth/roblox/start'}
                              disabled={loading}
                              className="w-full py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-3"
                            >
                              <img src="/roblox.svg" alt="Roblox" className="w-5 h-5 dark:invert" />
                              Continue with Roblox
                            </button>
                          </>
                        )}
                      </form>
                    </FormProvider>
                  </motion.div>
                )}

                {mode === "signup" && signupStep === 0 && (
                  <motion.div
                    key="signup-0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Create your account
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400">
                        Enter your Roblox username to get started
                      </p>
                    </div>

                    <FormProvider {...signupMethods}>
                      <form onSubmit={(e) => { e.preventDefault(); setSignupStep(1); }} className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                            Roblox Username
                          </label>
                          <input
                            {...regSignup("username", { required: "Username is required" })}
                            placeholder="Enter your Roblox username"
                            className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border ${
                              signupErrors.username 
                                ? "border-red-500 focus:ring-red-500/20" 
                                : "border-slate-200 dark:border-slate-700 focus:ring-pink-500/20 focus:border-pink-500"
                            } text-slate-900 dark:text-white placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2`}
                          />
                          {signupErrors.username && (
                            <p className="mt-1.5 text-sm text-red-500">{signupErrors.username.message}</p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          Continue
                          <IconArrowRight className="w-5 h-5" />
                        </button>

                        {isOAuth && (
                          <>
                            <div className="relative my-6">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                              </div>
                              <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-slate-50 dark:bg-slate-900 text-slate-500">
                                  Or sign up with
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => window.location.href = '/api/auth/roblox/start'}
                              disabled={loading}
                              className="w-full py-3 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-3"
                            >
                              <img src="/roblox.svg" alt="Roblox" className="w-5 h-5 dark:invert" />
                              Sign up with Roblox
                            </button>
                          </>
                        )}
                      </form>
                    </FormProvider>
                  </motion.div>
                )}

                {mode === "signup" && signupStep === 1 && (
                  <motion.div
                    key="signup-1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Set your password
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400">
                        Choose a strong password for your account
                      </p>
                    </div>

                    <FormProvider {...signupMethods}>
                      <form onSubmit={submitSignup(onSubmitSignup)} className="space-y-5">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                            Password
                          </label>
                          <div className="relative">
                            <input
                              {...regSignup("password", {
                                required: "Password is required",
                                minLength: { value: 7, message: "Password must be at least 7 characters" },
                                pattern: { value: /^(?=.*[0-9!@#$%^&*])/, message: "Must contain a number or special character" },
                              })}
                              type={showPassword ? "text" : "password"}
                              placeholder="Create a password"
                              className={`w-full px-4 py-3 pr-12 rounded-xl bg-white dark:bg-slate-800 border ${
                                signupErrors.password 
                                  ? "border-red-500 focus:ring-red-500/20" 
                                  : "border-slate-200 dark:border-slate-700 focus:ring-pink-500/20 focus:border-pink-500"
                              } text-slate-900 dark:text-white placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                            >
                              {showPassword ? <IconEyeOff className="w-5 h-5" /> : <IconEye className="w-5 h-5" />}
                            </button>
                          </div>
                          {signupErrors.password && (
                            <p className="mt-1.5 text-sm text-red-500">{signupErrors.password.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                            Confirm Password
                          </label>
                          <input
                            {...regSignup("verifypassword", {
                              required: "Please confirm your password",
                              validate: value => value === getSignupValues("password") || "Passwords must match",
                            })}
                            type="password"
                            placeholder="Confirm your password"
                            className={`w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border ${
                              signupErrors.verifypassword 
                                ? "border-red-500 focus:ring-red-500/20" 
                                : "border-slate-200 dark:border-slate-700 focus:ring-pink-500/20 focus:border-pink-500"
                            } text-slate-900 dark:text-white placeholder:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2`}
                          />
                          {signupErrors.verifypassword && (
                            <p className="mt-1.5 text-sm text-red-500">{signupErrors.verifypassword.message}</p>
                          )}
                        </div>

                        <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                          <div className="flex gap-3">
                            <IconShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800 dark:text-amber-200">
                              <p className="font-medium">Security tip</p>
                              <p className="mt-1 text-amber-700 dark:text-amber-300">
                                Don't use the same password as your Roblox account.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setSignupStep(0)}
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            <IconArrowLeft className="w-5 h-5" />
                            Back
                          </button>
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
                          >
                            {loading ? (
                              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <>
                                Continue
                                <IconArrowRight className="w-5 h-5" />
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    </FormProvider>
                  </motion.div>
                )}

                {mode === "signup" && signupStep === 2 && (
                  <motion.div
                    key="signup-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        Verify your account
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400">
                        Add this code to your Roblox profile bio
                      </p>
                    </div>

                    <div className="space-y-6">
                      <div className="relative">
                        <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-lg text-slate-900 dark:text-white">
                          <span className="select-all">{verificationCode}</span>
                          <button
                            onClick={copyCode}
                            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            {codeCopied ? (
                              <IconCheck className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <IconCopy className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {verificationError && (
                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                            Verification code not found in your bio. Please try again.
                          </p>
                        </div>
                      )}

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          How to verify:
                        </p>
                        <ol className="text-sm text-slate-500 dark:text-slate-400 space-y-2 list-decimal list-inside">
                          <li>Copy the code above</li>
                          <li>Go to your Roblox profile</li>
                          <li>Paste the code in your bio</li>
                          <li>Click "Verify" below</li>
                        </ol>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setSignupStep(1)}
                          disabled={loading}
                          className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/20 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <IconArrowLeft className="w-5 h-5" />
                          Back
                        </button>
                        <button
                          onClick={onVerifyAgain}
                          disabled={loading}
                          className="flex-1 py-3 px-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-medium rounded-xl hover:from-pink-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          ) : (
                            <>
                              Verify
                              <IconCheck className="w-5 h-5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
