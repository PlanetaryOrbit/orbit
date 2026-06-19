import { NextPage } from "next";
import Head from "next/head";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import React, { useEffect, useState, useRef } from "react";
import { useRecoilState } from "recoil";
import { loginState } from "@/state";
import Router from "next/router";
import axios from "axios";
import Input from "@/components/input";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Dialog } from "@headlessui/react";
import { IconX } from "@tabler/icons-react";
import { RobloxOAuthAvailable } from "@/hooks/useRobloxOAuth";
import { DiscordOAuthAvailable } from "@/hooks/useDiscordOAuth";
import toast from "react-hot-toast";
import { GoogleOAuthAvailable } from "@/hooks/useGoogleOAuth";
import { OAuthAvailable } from "@/hooks/useOAuth";
import clsx from "clsx";
import {
  sessionFormInputOverride,
  sessionPrimaryButtonClass,
  sessionSecondaryButtonClass,
} from "@/components/sessions/shell";

const oauthButtonClass =
  "w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

function AuthSubmitButton({
  loading,
  disabled,
  children,
  className,
  type = "submit",
  onClick,
}: {
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(sessionPrimaryButtonClass, className)}
    >
      {loading ? (
        <svg
          className="h-5 w-5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        children
      )}
    </button>
  );
}

type LoginForm = { username: string; password: string };
type SignupForm = {
  username: string;
  password: string;
  verifypassword: string;
};

const AVATAR_BG_COLORS = [
  "#fce7f3",
  "#fbcfe8",
  "#f9a8d4",
  "#f472b6",
  "#ec4899",
  "#e0e7ff",
  "#c7d2fe",
  "#a5b4fc",
  "#818cf8",
  "#6366f1",
  "#d1fae5",
  "#a7f3d0",
  "#6ee7b7",
  "#34d399",
  "#10b981",
  "#cffafe",
  "#a5f3fc",
  "#67e8f9",
  "#22d3ee",
  "#06b6d4",
  "#fef3c7",
  "#fde68a",
  "#fcd34d",
  "#fbbf24",
  "#f59e0b",
];

function getAvatarBgColor(displayName: string): string {
  let n = 0;
  for (let i = 0; i < displayName.length; i++)
    n = (n * 31 + displayName.charCodeAt(i)) >>> 0;
  return AVATAR_BG_COLORS[n % AVATAR_BG_COLORS.length];
}

const Login: NextPage = () => {
  const [login, setLogin] = useRecoilState(loginState);
  const { isAvailable: isRobloxOAuth } = RobloxOAuthAvailable();
  const { oauthOnly, isAvailable: isOAuthAvailable } = OAuthAvailable();
  const { isAvailable: isDiscordOAuth } = DiscordOAuthAvailable();
  const { isAvailable: isGoogleOAuth } = GoogleOAuthAvailable();

  const loginMethods = useForm<LoginForm>();
  const signupMethods = useForm<SignupForm>();

  const {
    register: regLogin,
    handleSubmit: submitLogin,
    setError: setErrLogin,
  } = loginMethods;
  const {
    register: regSignup,
    handleSubmit: submitSignup,
    setError: setErrSignup,
    getValues: getSignupValues,
  } = signupMethods;

  const [loading, setLoading] = useState(false);
  const [loginBg, setLoginBg] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "signup" | "link">("login");
  const [signupStep, setSignupStep] = useState<0 | 1 | 2 | 3>(0);
  const [signupThumbnail, setSignupThumbnail] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupUserid, setSignupUserid] = useState<number | undefined>(
    undefined,
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null,
  );
  const [showTraditionalLogin, setShowTraditionalLogin] = useState(false);

  const errorToastShown = useRef(false);
  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  const effectiveOAuthOnly = oauthOnly && isOAuthAvailable;

  useEffect(() => {
    loginMethods.reset();
    signupMethods.reset();
    setVerificationError(null);
    setSignupStep(0);
    setSignupThumbnail("");
    setSignupDisplayName("");
    setVerificationCode("");
    setLoading(false);
    setUsernameCheckLoading(false);
    setUsernameAvailable(null);
    setShowTraditionalLogin(false);
    if (usernameCheckTimeout.current)
      clearTimeout(usernameCheckTimeout.current);
  }, [mode]);

  useEffect(() => {
    let isMounted = true;

    async function fetchMe() {
      try {
        const userInfo = await axios.get("/api/@me");
        if (isMounted && userInfo.status === 200) {
          Router.push("/");
        }
      } catch (error) {
        console.log("User not authenticated");
      }
    }

    async function fetchBackground() {
      try {
        const res = await axios.get("/api/instance/login-background");
        if (!isMounted) return;

        if (res.data.backgroundUrl) {
          setLoginBg(res.data.backgroundUrl);
        }
        if (res.data.themeRgb) {
          document.documentElement.style.setProperty(
            "--group-theme",
            res.data.themeRgb,
          );
        }
      } catch (error) {
        console.error("Failed to fetch background:", error);
      }
    }

    fetchMe();
    fetchBackground();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (usernameCheckTimeout.current)
        clearTimeout(usernameCheckTimeout.current);
    };
  }, []);

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 2) {
      setUsernameAvailable(null);
      return;
    }
    setUsernameCheckLoading(true);
    setUsernameAvailable(null);
    try {
      await axios.post("/api/auth/checkUsername", { username });
      signupMethods.clearErrors("username");
      setUsernameAvailable(true);
    } catch (e: any) {
      const errorMessage = e?.response?.data?.error;
      if (errorMessage) {
        setErrSignup("username", { type: "custom", message: errorMessage });
        setUsernameAvailable(false);
      }
    } finally {
      setUsernameCheckLoading(false);
    }
  };

  const onUsernameChange = (username: string) => {
    if (usernameCheckTimeout.current)
      clearTimeout(usernameCheckTimeout.current);
    signupMethods.clearErrors("username");
    setUsernameAvailable(null);
    usernameCheckTimeout.current = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 800);
  };

  const signupUsernameReg = regSignup("username", {
    required: "This field is required",
  });
  const signupUsernameProps = {
    ...signupUsernameReg,
    onChange: (e: Parameters<typeof signupUsernameReg.onChange>[0]) => {
      const result = signupUsernameReg.onChange(e);
      onUsernameChange((e.target as HTMLInputElement).value);
      return result;
    },
  };

  const onSubmitLogin: SubmitHandler<LoginForm> = async (data) => {
    setLoading(true);
    try {
      const req = await axios.post("/api/auth/login", data).catch((e: any) => {
        setLoading(false);
        if (e.response?.status === 404) {
          setErrLogin("username", {
            type: "custom",
            message: e.response.data.error,
          });
        } else if (e.response?.status === 401) {
          setErrLogin("password", {
            type: "custom",
            message: e.response.data.error,
          });
        } else {
          setErrLogin("username", {
            type: "custom",
            message: "Something went wrong",
          });
          setErrLogin("password", {
            type: "custom",
            message: "Something went wrong",
          });
        }
        throw e;
      });
      const { data: res } = req;
      setLogin({ ...res.user, workspaces: res.workspaces });
      Router.push("/");
    } catch {
    } finally {
      setLoading(false);
    }
  };

  // Step 2 → 3: call start, store both code and token
  const onSubmitSignup: SubmitHandler<SignupForm> = async ({
    username,
    password,
    verifypassword,
  }) => {
    if (password !== verifypassword) {
      setErrSignup("verifypassword", {
        type: "validate",
        message: "Passwords must match",
      });
      return;
    }
    setLoading(true);
    setVerificationError(null);
    try {
      const { data } = await axios.post("/api/auth/signup/start", { username });
      setVerificationCode(data.code);
      setSignupUserid(data.userid);
      setSignupStep(3);
    } catch (e: any) {
      setErrSignup("username", {
        type: "custom",
        message: e.response?.data?.error || "Unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: verify — pass token back to finish route
  const onVerifyAgain = async () => {
    setLoading(true);
    setVerificationError(null);
    const { password } = getSignupValues();
    try {
      const { data } = await axios.post("/api/auth/signup/finish", {
        password,
        code: verificationCode,
        userid: signupUserid,
      });
      if (data.success) Router.push("/");
      else setVerificationError("Verification failed. Please try again.");
    } catch (e: any) {
      setVerificationError(
        e?.response?.data?.error || "Verification not found. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Router.isReady || errorToastShown.current) return;
    const { error, action, ...rest } = Router.query;
    if (error) {
      if (error === "discord-not-linked")
        toast.error("This account isn't linked to any Orbit account.");
      else if (error === "google-not-linked")
        toast.error("Your Google account is not linked.");
      else if (error === "state-mismatch")
        toast.error(
          "We detected a state mismatch, OAuth process was discontinued.",
        );
      else if (error === "missing_params")
        toast.error("Not enough params were provided.");
      else if (error === "unauthorized-domain")
        toast.error("This domain is not allowed to sign in.");
      else toast.error("There was an error while logging in.");
      errorToastShown.current = true;
      Router.replace({ pathname: Router.pathname, query: rest }, undefined, {
        shallow: true,
      });
    }
  }, [Router.isReady, Router.query]);

  const OAuthButtons = ({ className }: { className?: string }) => (
    <div className={`flex flex-col gap-2.5 ${className ?? ""}`}>
      {isRobloxOAuth && (
        <button
          type="button"
          onClick={() => (window.location.href = "/api/auth/roblox/start")}
          disabled={loading}
          className={oauthButtonClass}
        >
          <img
            src="/roblox.svg"
            alt="Roblox"
            className="h-5 w-5 dark:invert-0 invert"
          />
          Continue with Roblox
        </button>
      )}
      {isDiscordOAuth && (
        <button
          type="button"
          onClick={() => (window.location.href = "/api/auth/discord/start")}
          disabled={loading}
          className={oauthButtonClass}
        >
          <img
            src="/discord.svg"
            alt="Discord"
            className="h-5 w-5 dark:invert-0 invert"
          />
          Continue with Discord
        </button>
      )}
      {isGoogleOAuth && (
        <button
          type="button"
          onClick={() => (window.location.href = "/api/auth/google/start")}
          disabled={loading}
          className={oauthButtonClass}
        >
          <img
            src="/google.svg"
            alt="Google"
            className="h-5 w-5 dark:invert-0 invert"
          />
          Continue with Google
        </button>
      )}
    </div>
  );

  const divider = (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-zinc-200 dark:border-zinc-700" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-white px-2 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500">
          or
        </span>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Sign in · Orbit</title>
      </Head>

      <div className="relative min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        {loginBg ? (
          <>
            <div
              className="fixed inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${loginBg})` }}
              aria-hidden
            />
            <div
              className="fixed inset-0 bg-zinc-50/90 dark:bg-zinc-950/88"
              aria-hidden
            />
          </>
        ) : null}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(var(--group-theme,236,72,153),0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(var(--group-theme,236,72,153),0.12),transparent)]"
          aria-hidden
        />

        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
          <div className="flex flex-col justify-center px-6 pb-4 pt-16 sm:px-10 lg:w-[42%] lg:px-16 lg:py-16 xl:w-[38%]">
            <div className="max-w-md">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-primary/80 dark:text-primary/70">
                Account
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                Welcome to <span className="text-primary">Orbit</span>
              </h1>
              <p className="mt-3 max-w-sm text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
                Sign in or create an account to access your workspaces.
              </p>
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:py-16">
            <div className="w-full max-w-md">
              <div
                className={clsx(
                  "rounded-2xl bg-white p-6 dark:bg-zinc-900/70 sm:p-8 shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:shadow-zinc-950/30",
                )}
              >
                {mode === "login" && (
                  <>
                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                      Sign in
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {effectiveOAuthOnly && !showTraditionalLogin
                        ? "Use one of the options below to sign in."
                        : "Use your username and password to continue."}
                    </p>

                    {effectiveOAuthOnly && !showTraditionalLogin && (
                      <div className="mt-6">
                        <OAuthButtons />
                        <div className="mt-6 text-center">
                          <button
                            type="button"
                            onClick={() => setShowTraditionalLogin(true)}
                            className="text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                          >
                            Having trouble? Sign in with password instead
                          </button>
                        </div>
                      </div>
                    )}

                    {(!effectiveOAuthOnly || showTraditionalLogin) && (
                      <FormProvider {...loginMethods}>
                        <form
                          onSubmit={submitLogin(onSubmitLogin)}
                          className="mt-6 space-y-1"
                          noValidate
                        >
                          <Input
                            label="Username"
                            placeholder="Username"
                            id="username"
                            classoverride={sessionFormInputOverride}
                            {...regLogin("username", {
                              required: "This field is required",
                            })}
                          />
                          <Input
                            label="Password"
                            placeholder="Password"
                            type={showPassword ? "text" : "password"}
                            id="password"
                            classoverride={sessionFormInputOverride}
                            {...regLogin("password", {
                              required: "This field is required",
                            })}
                          />
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              id="show-password"
                              type="checkbox"
                              checked={showPassword}
                              onChange={() => setShowPassword((v) => !v)}
                              className="rounded border-zinc-300 text-primary focus:ring-primary/30 dark:border-zinc-600"
                            />
                            <label
                              htmlFor="show-password"
                              className="select-none text-sm text-zinc-500 dark:text-zinc-400"
                            >
                              Show password
                            </label>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                            <div>
                              <Link
                                href="/forgot-password"
                                className="text-sm text-primary transition-colors hover:text-primary/80"
                              >
                                Forgot password?
                              </Link>
                              <p
                                onClick={() => setMode("signup")}
                                className="text-sm text-zinc-500 dark:text-zinc-400 transition-colors hover:text-primary/80 mt-1 cursor-pointer"
                              >
                                Are you new?
                              </p>
                            </div>

                            <AuthSubmitButton
                              loading={loading}
                              disabled={loading}
                            >
                              Sign in
                            </AuthSubmitButton>
                          </div>

                          {(isRobloxOAuth || isDiscordOAuth || isGoogleOAuth) &&
                            !effectiveOAuthOnly && (
                              <>
                                {divider}
                                <OAuthButtons />
                              </>
                            )}

                          {effectiveOAuthOnly && showTraditionalLogin && (
                            <div className="mt-4 text-center">
                              <button
                                type="button"
                                onClick={() => setShowTraditionalLogin(false)}
                                className="text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                              >
                                Back to sign-in options
                              </button>
                            </div>
                          )}
                        </form>
                      </FormProvider>
                    )}
                  </>
                )}

                {mode === "signup" && (
                  <>
                    {signupStep === 0 && (
                      <>
                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                          Create an account
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          Choose a username to get started.
                        </p>
                        {!effectiveOAuthOnly && (
                          <FormProvider {...signupMethods}>
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const username = getSignupValues("username");
                                if (!username) return;
                                setLoading(true);
                                try {
                                  const { data } = await axios.post(
                                    "/api/auth/signup/preview",
                                    { username },
                                  );
                                  setSignupThumbnail(data.thumbnail || "");
                                  setSignupDisplayName(
                                    data.displayName || username,
                                  );
                                  setSignupStep(1);
                                } catch (err: any) {
                                  setErrSignup("username", {
                                    type: "custom",
                                    message:
                                      err?.response?.data?.error ||
                                      "Something went wrong",
                                  });
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              className="mt-6 space-y-1"
                              noValidate
                            >
                              <Input
                                label="Username"
                                placeholder="Username"
                                id="signup-username"
                                classoverride={sessionFormInputOverride}
                                {...signupUsernameProps}
                              />
                              {usernameCheckLoading && (
                                <p className="mt-1 text-sm text-primary">
                                  Checking username...
                                </p>
                              )}
                              {!usernameCheckLoading &&
                                usernameAvailable === true && (
                                  <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                                    Username is available
                                  </p>
                                )}
                              <div className="flex justify-end pt-4">
                                <AuthSubmitButton
                                  loading={loading}
                                  disabled={
                                    loading ||
                                    usernameCheckLoading ||
                                    usernameAvailable !== true ||
                                    !!signupMethods.formState.errors.username
                                  }
                                >
                                  Continue
                                </AuthSubmitButton>
                              </div>
                            </form>
                          </FormProvider>
                        )}
                        {(isRobloxOAuth || isDiscordOAuth || isGoogleOAuth) && (
                          <>
                            {!effectiveOAuthOnly && divider}
                            <OAuthButtons />
                          </>
                        )}
                      </>
                    )}

                    {signupStep === 1 && (
                      <>
                        <div className="mb-6 flex items-start gap-4">
                          <div
                            className="flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center rounded-2xl p-2 ring-1 ring-zinc-200/80 dark:ring-zinc-700/60"
                            style={{
                              backgroundColor: getAvatarBgColor(
                                signupDisplayName || "",
                              ),
                            }}
                          >
                            {signupThumbnail ? (
                              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-transparent">
                                <img
                                  src={signupThumbnail}
                                  alt=""
                                  className="block h-full max-h-full w-full max-w-full rounded-xl object-contain object-bottom"
                                />
                              </div>
                            ) : (
                              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-zinc-200/80 text-2xl font-medium text-zinc-500 dark:bg-zinc-700/80 dark:text-zinc-400">
                                ?
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                              Is{" "}
                              <span className="text-primary">
                                {signupDisplayName ||
                                  getSignupValues("username") ||
                                  "this user"}
                              </span>{" "}
                              correct?
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                              Confirm this is your Roblox account, then choose a
                              password.
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            className={clsx(
                              sessionSecondaryButtonClass,
                              "flex-1 justify-center",
                            )}
                            onClick={() => setSignupStep(0)}
                            disabled={loading}
                          >
                            Back
                          </button>
                          <AuthSubmitButton
                            type="button"
                            className="flex-1 justify-center"
                            onClick={() => setSignupStep(2)}
                            disabled={loading}
                          >
                            Yes, continue
                          </AuthSubmitButton>
                        </div>
                      </>
                    )}

                    {signupStep === 2 && (
                      <>
                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                          Set a password
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          Choose a secure password for your account.
                        </p>
                        <FormProvider {...signupMethods}>
                          <form
                            onSubmit={submitSignup(onSubmitSignup)}
                            className="mt-6 space-y-1"
                            noValidate
                          >
                            <Input
                              label="Password"
                              placeholder="Password"
                              type="password"
                              id="signup-password"
                              classoverride={sessionFormInputOverride}
                              {...regSignup("password", {
                                required: "Password is required",
                                minLength: {
                                  value: 7,
                                  message:
                                    "Password must be at least 7 characters",
                                },
                                pattern: {
                                  value: /^(?=.*[0-9!@#$%^&*])/,
                                  message:
                                    "Password must contain at least one number or special character",
                                },
                              })}
                            />
                            <Input
                              label="Verify password"
                              placeholder="Verify password"
                              type="password"
                              id="signup-verify-password"
                              classoverride={sessionFormInputOverride}
                              {...regSignup("verifypassword", {
                                required: "Please verify your password",
                                validate: (value) =>
                                  value === getSignupValues("password") ||
                                  "Passwords must match",
                              })}
                            />
                            <div className="flex gap-3 pt-4">
                              <button
                                type="button"
                                className={clsx(
                                  sessionSecondaryButtonClass,
                                  "flex-1 justify-center",
                                )}
                                onClick={() => setSignupStep(1)}
                                disabled={loading}
                              >
                                Back
                              </button>
                              <AuthSubmitButton
                                className="flex-1 justify-center"
                                loading={loading}
                                disabled={loading}
                              >
                                Continue
                              </AuthSubmitButton>
                            </div>
                            {(isRobloxOAuth ||
                              isDiscordOAuth ||
                              isGoogleOAuth) && (
                              <>
                                {divider}
                                <OAuthButtons />
                              </>
                            )}
                            <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
                              Don&apos;t share your password. Don&apos;t use the
                              same password as your Roblox account.
                            </p>
                          </form>
                        </FormProvider>
                      </>
                    )}

                    {signupStep === 3 && (
                      <>
                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                          Verify your account
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          Paste this code into your Roblox profile bio, then
                          click Verify.
                        </p>
                        <p
                          className="mb-4 mt-5 select-all rounded-xl bg-zinc-100 px-4 py-3 text-center font-mono text-sm text-zinc-900 dark:bg-zinc-800 dark:text-white"
                          onClick={() => {
                            navigator.clipboard.writeText(verificationCode);
                            toast.success(
                              "Verification code copied to clipboard",
                            );
                          }}
                        >
                          {verificationCode}
                        </p>
                        <ul className="mb-6 list-inside list-disc space-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                          <li>Go to your Roblox profile</li>
                          <li>Click &quot;Edit Profile&quot;</li>
                          <li>Paste the code into your Bio / About section</li>
                          <li>Save and click Verify below</li>
                        </ul>
                        {verificationError && (
                          <p className="mb-4 text-center text-sm text-red-500">
                            {verificationError}
                          </p>
                        )}
                        <div className="flex gap-3">
                          <button
                            type="button"
                            className={clsx(
                              sessionSecondaryButtonClass,
                              "flex-1 justify-center",
                            )}
                            onClick={() => setSignupStep(2)}
                            disabled={loading}
                          >
                            Back
                          </button>
                          <AuthSubmitButton
                            type="button"
                            className="flex-1 justify-center"
                            loading={loading}
                            disabled={loading}
                            onClick={onVerifyAgain}
                          >
                            Verify
                          </AuthSubmitButton>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-4 left-4 z-40 sm:bottom-6 sm:left-6">
          <button
            onClick={() => setShowCopyright(true)}
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            type="button"
          >
            © Copyright Notices
          </button>
        </div>
      </div>

      <Dialog
        open={showCopyright}
        onClose={() => setShowCopyright(false)}
        className="relative z-50"
      >
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          aria-hidden="true"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel
            className={clsx(
              "mx-auto max-w-sm rounded-2xl bg-white p-6 dark:bg-zinc-900 shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:shadow-zinc-950/30",
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-white">
                Copyright Notices
              </Dialog.Title>
              <button
                onClick={() => setShowCopyright(false)}
                className="rounded-xl p-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <IconX className="h-5 w-5 text-zinc-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="mb-1 text-sm font-medium text-zinc-900 dark:text-white">
                  Orbit features, enhancements, and modifications:
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Copyright © 2026 Planetary. All rights reserved.
                </p>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-medium text-zinc-900 dark:text-white">
                  Original Tovy features and code:
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Copyright © 2022 Tovy. All rights reserved.
                </p>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
};

export default Login;
