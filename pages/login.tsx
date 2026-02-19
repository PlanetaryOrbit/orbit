import { NextPage } from "next";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import React, { useEffect, useState, useRef } from "react";
import { useRecoilState } from "recoil";
import { loginState } from "@/state";
import Button from "@/components/button";
import Router from "next/router";
import axios from "axios";
import Input from "@/components/input";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Dialog } from "@headlessui/react";
import { IconX } from "@tabler/icons-react";
import { OAuthAvailable } from "@/hooks/useOAuth";

type LoginForm = { username: string; password: string };
type SignupForm = {
  username: string;
  password: string;
  verifypassword: string;
};

const AVATAR_BG_COLORS = [
  "#fce7f3", "#fbcfe8", "#f9a8d4", "#f472b6", "#ec4899",
  "#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1",
  "#d1fae5", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981",
  "#cffafe", "#a5f3fc", "#67e8f9", "#22d3ee", "#06b6d4",
  "#fef3c7", "#fde68a", "#fcd34d", "#fbbf24", "#f59e0b",
];
function getAvatarBgColor(displayName: string): string {
  let n = 0;
  for (let i = 0; i < displayName.length; i++) n = (n * 31 + displayName.charCodeAt(i)) >>> 0;
  return AVATAR_BG_COLORS[n % AVATAR_BG_COLORS.length];
}

const Login: NextPage = () => {
  const [login, setLogin] = useRecoilState(loginState);
  const { isAvailable: isOAuth, oauthOnly } = OAuthAvailable();

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
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<0 | 1 | 2 | 3>(0);
  const [signupThumbnail, setSignupThumbnail] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(
    null
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );

  const usernameCheckTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loginMethods.reset();
    signupMethods.reset();
    setVerificationError(null);
    setSignupStep(0);
    setSignupThumbnail("");
    setSignupDisplayName("");
    setLoading(false);
    setUsernameCheckLoading(false);
    setUsernameAvailable(null);
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }
  }, [mode]);

  useEffect(() => {
    return () => {
      if (usernameCheckTimeout.current) {
        clearTimeout(usernameCheckTimeout.current);
      }
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
        setErrSignup("username", {
          type: "custom",
          message: errorMessage,
        });
        setUsernameAvailable(false);
      }
    } finally {
      setUsernameCheckLoading(false);
    }
  };

  const onUsernameChange = (username: string) => {
    if (usernameCheckTimeout.current) {
      clearTimeout(usernameCheckTimeout.current);
    }

    signupMethods.clearErrors("username");
    setUsernameAvailable(null);

    usernameCheckTimeout.current = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 800);
  };

  const signupUsernameReg = regSignup("username", { required: "This field is required" });
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
      let req;
      try {
        req = await axios.post("/api/auth/login", data);
      } catch (e: any) {
        setLoading(false);
        if (e.response.status === 404) {
          setErrLogin("username", {
            type: "custom",
            message: e.response.data.error,
          });
          return;
        }
        if (e.response.status === 401) {
          setErrLogin("password", {
            type: "custom",
            message: e.response.data.error,
          });
          return;
        }
        setErrLogin("username", {
          type: "custom",
          message: "Something went wrong",
        });
        setErrLogin("password", {
          type: "custom",
          message: "Something went wrong",
        });
        return;
      }
      const { data: res } = req;
      setLogin({ ...res.user, workspaces: res.workspaces });
      Router.push("/");
    } catch (e: any) {
      const msg = e.response?.data?.error || "Something went wrong";
      const status = e.response?.status;

      if (status === 404 || status === 401) {
        setErrLogin("username", { type: "custom", message: msg });
        if (status === 401)
          setErrLogin("password", { type: "custom", message: msg });
      } else {
        setErrLogin("username", { type: "custom", message: msg });
        setErrLogin("password", { type: "custom", message: msg });
      }
    } finally {
      setLoading(false);
    }
  };

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

  const onVerifyAgain = async () => {
    setLoading(true);
    setVerificationError(null);

    const { password } = getSignupValues();

    try {
      const { data } = await axios.post("/api/auth/signup/finish", {
        password,
        code: verificationCode,
      });
      if (data.success) Router.push("/");
      else setVerificationError("Verification failed. Please try again.");
    } catch (e: any) {
      const errorMessage =
        e?.response?.data?.error || "Verification not found. Please try again.";
      setVerificationError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const StepButtons = ({
    backStep,
    forwardLabel,
    onForward,
  }: {
    backStep?: () => void;
    forwardLabel: string;
    onForward: () => void;
  }) => (
    <div className="flex gap-4">
      {backStep && (
        <Button
          onPress={backStep}
          type="button"
          classoverride="flex-1"
          loading={loading}
          disabled={loading}
        >
          Back
        </Button>
      )}
      <Button
        onPress={onForward}
        classoverride="flex-1"
        loading={loading}
        disabled={loading}
      >
        {forwardLabel}
      </Button>
    </div>
  );

  return (
    <>
      <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950">
        <div
          className="fixed inset-0 bg-infobg-light dark:bg-infobg-dark bg-cover bg-center bg-no-repeat opacity-40"
          aria-hidden
        />
        <div className="fixed inset-0 bg-gradient-to-br from-orbit/30 via-zinc-950/80 to-zinc-950" aria-hidden />

        <div className="relative z-10 flex flex-col justify-center px-8 md:px-12 lg:px-16 py-12 md:py-0 md:w-[42%] lg:w-[38%]">
          <div className="max-w-md">
            <span className="inline-flex items-center gap-2 text-zinc-400 text-sm font-medium tracking-wide uppercase mb-6">
              <span className="w-8 h-px bg-orbit rounded-full" />
              Account
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
              Welcome to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orbit to-pink-400">
                Orbit
              </span>
            </h1>
            <p className="mt-4 text-lg text-zinc-400 leading-relaxed">
              Sign in or create an account to access your workspaces.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-col justify-center items-center w-full md:w-[58%] lg:w-[62%] px-4 sm:px-6 py-12 md:py-16">
          <div className="w-full max-w-md">
            <div className="relative rounded-2xl bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-700/50 shadow-xl shadow-zinc-900/5 dark:shadow-black/20 p-8">
              <div className="absolute top-6 right-6">
                <ThemeToggle />
              </div>

              <div className="flex gap-6 mb-8 border-b border-zinc-200 dark:border-zinc-600 -mx-1">
                {["login", ...(oauthOnly ? [] : ["signup"])].map((m) => {
                  const isActive = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m as any)}
                      className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 -mb-px ${
                        isActive
                          ? "text-orbit border-orbit"
                          : "text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-700 dark:hover:text-zinc-300"
                      }`}
                      type="button"
                      disabled={loading}
                    >
                      {m === "login" ? "Login" : "Sign Up"}
                    </button>
                  );
                })}
              </div>

          {mode === "login" && (
            <>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                Sign in
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                Use your username and password to continue.
              </p>

              {!oauthOnly && (
                <FormProvider {...loginMethods}>
                  <form
                    onSubmit={submitLogin(onSubmitLogin)}
                    className="space-y-4 mb-6"
                    noValidate
                  >
                    <Input
                      label="Username"
                      placeholder="Username"
                      id="username"
                      {...regLogin("username", {
                        required: "This field is required",
                      })}
                    />
                    <Input
                      label="Password"
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                      id="password"
                      {...regLogin("password", {
                        required: "This field is required",
                      })}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        id="show-password"
                        type="checkbox"
                        checked={showPassword}
                        onChange={() => setShowPassword((v) => !v)}
                        className="rounded border-zinc-300 dark:border-zinc-600 text-orbit focus:ring-orbit/30"
                      />
                      <label
                        htmlFor="show-password"
                        className="text-sm text-zinc-600 dark:text-zinc-400 select-none"
                      >
                        Show password
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <Link
                        href="/forgot-password"
                        className="text-sm text-orbit hover:text-orbit/80 transition-colors"
                      >
                        Forgot password?
                      </Link>
                      <Button
                        type="submit"
                        classoverride="px-6 py-2.5 text-sm font-medium rounded-xl shadow-sm hover:bg-orbit/90"
                        loading={loading}
                        disabled={loading}
                      >
                        Login
                      </Button>
                    </div>

                    {isOAuth && (
                      <>
                        <div className="relative my-6">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-200 dark:border-zinc-600" />
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="bg-white dark:bg-zinc-800 px-2 text-zinc-500 dark:text-zinc-400">
                              or
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            (window.location.href = "/api/auth/roblox/start")
                          }
                          disabled={loading}
                          className="w-full flex items-center justify-center px-4 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 disabled:opacity-50 transition-colors"
                        >
                          <img
                            src="/roblox.svg"
                            alt="Roblox"
                            className="w-5 h-5 mr-2 dark:invert-0 invert"
                          />
                          Continue with Roblox
                        </button>
                      </>
                    )}
                  </form>
                </FormProvider>
              )}

              {isOAuth && oauthOnly && (
                <button
                  type="button"
                  onClick={() =>
                    (window.location.href = "/api/auth/roblox/start")
                  }
                  disabled={loading}
                  className="w-full flex items-center justify-center px-4 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 disabled:opacity-50 transition-colors"
                >
                  <img
                    src="/roblox.svg"
                    alt="Roblox"
                    className="w-5 h-5 mr-2 dark:invert-0 invert"
                  />
                  Continue with Roblox
                </button>
              )}
            </>
          )}

          {mode === "signup" && (
            <>
              {signupStep === 0 && (
                <>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                    Create an account
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    Choose a username to get started.
                  </p>

                  {!oauthOnly && (
                    <FormProvider {...signupMethods}>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const username = getSignupValues("username");
                          if (!username) return;
                          setLoading(true);
                          try {
                            const { data } = await axios.post("/api/auth/signup/preview", { username });
                            setSignupThumbnail(data.thumbnail || "");
                            setSignupDisplayName(data.displayName || username);
                            setSignupStep(1);
                          } catch (err: any) {
                            setErrSignup("username", {
                              type: "custom",
                              message: err?.response?.data?.error || "Something went wrong",
                            });
                          } finally {
                            setLoading(false);
                          }
                        }}
                        className="space-y-4 mb-6"
                        noValidate
                      >
                        <Input
                          label="Username"
                          placeholder="Username"
                          id="signup-username"
                          {...signupUsernameProps}
                        />
                        {usernameCheckLoading && (
                          <p className="text-sm text-orbit mt-1">
                            Checking username...
                          </p>
                        )}
                        {!usernameCheckLoading && usernameAvailable === true && (
                          <p className="text-sm text-emerald-500 dark:text-emerald-400 mt-1">
                            ✓ Username is available
                          </p>
                        )}
                        <div className="flex justify-end pt-1">
                          <Button
                            type="submit"
                            classoverride="px-6 py-2.5 text-sm font-medium rounded-xl shadow-sm"
                            loading={loading}
                            disabled={
                              loading ||
                              usernameCheckLoading ||
                              usernameAvailable !== true ||
                              !!signupMethods.formState.errors.username
                            }
                          >
                            Continue
                          </Button>
                        </div>
                      </form>
                    </FormProvider>
                  )}

                  {isOAuth && (
                    <>
                      {!oauthOnly && (
                        <div className="relative my-6">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-200 dark:border-zinc-600" />
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="bg-white dark:bg-zinc-800 px-2 text-zinc-500 dark:text-zinc-400">
                              or
                            </span>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          (window.location.href = "/api/auth/roblox/start")
                        }
                        disabled={loading}
                        className="w-full flex items-center justify-center px-4 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 disabled:opacity-50 transition-colors"
                      >
                        <img
                          src="/roblox.svg"
                          alt="Roblox"
                          className="w-5 h-5 mr-2 dark:invert-0 invert"
                        />
                        Sign up with Roblox
                      </button>
                    </>
                  )}
                </>
              )}

              {signupStep === 1 && (
                <>
                  <div className="flex items-start gap-5 mb-6">
                    <div
                      className="flex shrink-0 items-center justify-center rounded-2xl p-2 ring-1 ring-zinc-200/80 dark:ring-zinc-600/60 w-[5.5rem] h-[5.5rem]"
                      style={{ backgroundColor: getAvatarBgColor(signupDisplayName || "") }}
                    >
                      {signupThumbnail ? (
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center bg-transparent shrink-0">
                          <img
                            src={signupThumbnail}
                            alt=""
                            className="max-w-full max-h-full w-full h-full rounded-xl object-contain object-bottom block"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-zinc-200/80 dark:bg-zinc-600/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-2xl font-medium shrink-0">
                          ?
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                        Is <span className="text-orbit">{signupDisplayName || getSignupValues("username") || "this user"}</span> correct?
                      </h2>
                      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Confirm this is your Roblox account, then choose a password.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      classoverride="flex-1 px-5 py-2.5 text-sm font-medium rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      onPress={() => setSignupStep(0)}
                      disabled={loading}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      classoverride="flex-1 px-6 py-2.5 text-sm font-medium rounded-xl shadow-sm"
                      onPress={() => setSignupStep(2)}
                      disabled={loading}
                    >
                      Yes, continue
                    </Button>
                  </div>
                </>
              )}

              {signupStep === 2 && (
                <>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                    Set a password
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    Choose a secure password for your account.
                  </p>

                  <FormProvider {...signupMethods}>
                    <form
                      onSubmit={submitSignup(onSubmitSignup)}
                      className="space-y-4 mb-6"
                      noValidate
                    >
                      <Input
                        label="Password"
                        placeholder="Password"
                        type="password"
                        id="signup-password"
                        {...regSignup("password", {
                          required: "Password is required",
                          minLength: {
                            value: 7,
                            message: "Password must be at least 7 characters",
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
                        {...regSignup("verifypassword", {
                          required: "Please verify your password",
                          validate: (value) =>
                            value === getSignupValues("password") ||
                            "Passwords must match",
                        })}
                      />
                      <div className="flex gap-3 pt-1">
                        <Button
                          type="button"
                          classoverride="flex-1 px-5 py-2.5 text-sm font-medium rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                          onPress={() => setSignupStep(1)}
                          disabled={loading}
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          classoverride="flex-1 px-6 py-2.5 text-sm font-medium rounded-xl shadow-sm"
                          loading={loading}
                          disabled={loading}
                        >
                          Continue
                        </Button>
                      </div>

                      {isOAuth && (
                        <>
                          <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                              <span className="w-full border-t border-zinc-200 dark:border-zinc-600" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                              <span className="bg-white dark:bg-zinc-800 px-2 text-zinc-500 dark:text-zinc-400">
                                or
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              (window.location.href = "/api/auth/roblox/start")
                            }
                            disabled={loading}
                            className="w-full flex items-center justify-center px-4 py-2.5 border border-zinc-200 dark:border-zinc-600 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 disabled:opacity-50 transition-colors"
                          >
                            <img
                              src="/roblox.svg"
                              alt="Roblox"
                              className="w-5 h-5 mr-2"
                            />
                            Sign up with Roblox
                          </button>
                        </>
                      )}

                      <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 text-center">
                        Don’t share your password. Don’t use the same password as your Roblox account.
                      </p>
                    </form>
                  </FormProvider>
                </>
              )}

              {signupStep === 3 && (
                <>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
                    Verify your account
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    Paste this code into your Roblox profile bio, then click Verify.
                  </p>
                  <p className="text-center font-mono text-sm bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white py-3 px-4 rounded-xl mb-4 select-all border border-zinc-200 dark:border-zinc-600">
                    {verificationCode}
                  </p>
                  <ul className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 space-y-1 list-disc list-inside">
                    <li>Go to your Roblox profile</li>
                    <li>Click “Edit Profile”</li>
                    <li>Paste the code into your Bio / About section</li>
                    <li>Save and click Verify below</li>
                  </ul>
                  {verificationError && (
                    <p className="text-center text-red-500 text-sm mb-4">
                      {verificationError}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button
                      type="button"
classoverride="flex-1 px-5 py-2.5 text-sm font-medium rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    onPress={() => setSignupStep(2)}
                      disabled={loading}
                    >
                      Back
                    </Button>
                    <Button
                      classoverride="flex-1 px-6 py-2.5 text-sm font-medium rounded-xl shadow-sm"
                      loading={loading}
                      disabled={loading}
                      onPress={onVerifyAgain}
                    >
                      Verify
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
            </div>
          </div>
        </div>

        <div className="fixed bottom-4 left-4 z-40">
          <button
            onClick={() => setShowCopyright(true)}
            className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
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
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white dark:bg-zinc-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-medium text-zinc-900 dark:text-white">
                Copyright Notices
              </Dialog.Title>
              <button
                onClick={() => setShowCopyright(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                <IconX className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                  Orbit features, enhancements, and modifications:
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Copyright © 2026 Planetary. All rights reserved.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
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