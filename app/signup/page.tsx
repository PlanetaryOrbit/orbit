"use client";

import Image from "next/image";
import {
  LockClosedIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { InformationCircleIcon } from "@heroicons/react/24/solid";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import { useUser } from "../providers/UserProvider";
import { useRouter } from "next/navigation";
import { useInstance } from "../providers/InstanceProvider";
import { calculatePasswordStrength } from "@/utils/passwordStrength";

export default function SignupPage() {
  const router = useRouter();
  const { user } = useUser();
  const { settings } = useInstance();
  const [step, setStep] = useState<"signup" | "verify">("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signupId, setSignupId] = useState<string | null>(null);
  const passwordStrength = calculatePasswordStrength(password);

  const hasBoth = false && settings?.allowPasswordAuth;

  const [verification, setVerification] = useState<{
    code: string;
    expiresAt: string;
  } | null>(null);

  const [robloxUser, setRobloxUser] = useState<{
    username: string;
    displayName: string;
    avatar: string | null;
  } | null>(null);

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  async function handleSignup(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/signup/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.error.code === "ACCOUNT_EXISTS") {
          router.push("/login");
          return;
        } else {
          setError(data.error?.message ?? "Unable to start signup.");
        }

        return;
      }

      setSignupId(data.data.signupId);

      setVerification({
        code: data.data.verification.code,
        expiresAt: data.data.verification.expiresAt,
      });

      setRobloxUser(data.data.user);

      setStep("verify");
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!signupId) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/signup/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signupId,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error?.message ?? "Verification failed.");

        return;
      }

      if (data.data.isFirst) {
        router.push("/setup");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
      <section className="flex flex-1 items-center px-8 py-16 lg:px-20">
        <div className="max-w-lg">
          <h1 className="text-5xl font-bold tracking-tight text-ctp-text">
            Welcome to{" "}
            <span className="text-ctp-instance">
              {settings?.name || "Orbit"}
            </span>
          </h1>

          <p className="mt-5 max-w-md text-lg leading-relaxed text-ctp-subtext0">
            Create an account to get started.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-3xl border border-ctp-surface0 bg-ctp-mantle/80 p-8 shadow-2xl backdrop-blur-xl">
          {step === "signup" && (
            <>
              <h2 className="text-2xl font-bold">Create Account</h2>

              <p className="mt-2 text-sm text-ctp-subtext0">
                {settings?.allowRobloxAuth && settings?.allowPasswordAuth
                  ? "Create an account using your Roblox account or a Roblox username and password."
                  : settings?.allowRobloxAuth
                    ? "Create an account using your Roblox account."
                    : "Create an account using your Roblox username and password."}
              </p>

              {settings?.allowPasswordAuth && settings?.enableRegistration && (
                <form className="mt-6 space-y-5" onSubmit={handleSignup}>
                  <div>
                    <label
                      className="
                        mb-2
                        block
                        text-sm
                        font-medium
                        text-ctp-subtext1
                      "
                    >
                      Roblox Username
                    </label>

                    <div
                      className="
                        flex h-11
                        items-center
                        rounded-xl
                        border
                        border-ctp-surface1
                        bg-ctp-crust
                        px-3
                        transition
                        focus-within:border-ctp-instance
                      "
                    >
                      <UserIcon
                        className="
                          mr-2
                          h-5
                          w-5
                          text-ctp-subtext0
                        "
                      />

                      <input
                        placeholder="Builderman"
                        className="
                            flex-1
                            bg-transparent
                            text-sm
                            outline-none
                            placeholder:text-ctp-overlay0
                          "
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      className="
                        mb-2
                        block
                        text-sm
                        font-medium
                        text-ctp-subtext1
                      "
                    >
                      Password
                    </label>

                    <div
                      className="
                        flex h-11
                        items-center
                        rounded-xl
                        border
                        border-ctp-surface1
                        bg-ctp-crust
                        px-3
                        transition
                        focus-within:border-ctp-instance
                      "
                    >
                      <LockClosedIcon
                        className="
                          mr-2
                          h-5
                          w-5
                          text-ctp-subtext0
                        "
                      />

                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••"
                        className="
                            flex-1
                            bg-transparent
                            text-sm
                            outline-none
                          "
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        className="
                            cursor-pointer
                            text-ctp-subtext0
                            transition
                            hover:text-ctp-text
                          "
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {password && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-ctp-overlay1">
                            Password strength
                          </span>

                          <span
                            className={
                              passwordStrength.score <= 1
                                ? "text-ctp-red"
                                : passwordStrength.score === 2
                                  ? "text-ctp-yellow"
                                  : passwordStrength.score === 3
                                    ? "text-ctp-green"
                                    : "text-ctp-teal"
                            }
                          >
                            {passwordStrength.label}
                          </span>
                        </div>

                        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                          {[1, 2, 3, 4].map((segment) => {
                            const level =
                              passwordStrength.score <= 1
                                ? 1
                                : passwordStrength.score;

                            const activeColor =
                              passwordStrength.score <= 1
                                ? "bg-ctp-red"
                                : passwordStrength.score === 2
                                  ? "bg-ctp-yellow"
                                  : passwordStrength.score === 3
                                    ? "bg-ctp-green"
                                    : "bg-ctp-teal";

                            return (
                              <div
                                key={segment}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  level >= segment
                                    ? activeColor
                                    : "bg-ctp-surface0"
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    loading={loading}
                  >
                    Create Account
                  </Button>
                </form>
              )}

              {hasBoth && settings?.enableRegistration && (
                <>
                  <div
                    className="
                      my-6
                      flex
                      items-center
                    "
                  >
                    <div
                      className="
                        h-px
                        flex-1
                        bg-ctp-surface0
                      "
                    />

                    <span
                      className="
                        mx-3
                        text-xs
                        uppercase
                        text-ctp-overlay1
                      "
                    >
                      Or
                    </span>

                    <div
                      className="
                        h-px
                        flex-1
                        bg-ctp-surface0
                      "
                    />
                  </div>

                  <Button
                    variant="secondary"
                    className="w-full"
                    iconSrc="/roblox.svg"
                  >
                    Continue with Roblox
                  </Button>
                </>
              )}
            </>
          )}

          {step === "verify" && robloxUser && verification && (
            <>
              <h2 className="text-2xl font-bold">Verify Roblox Account</h2>

              <p
                className="
                    mt-2
                    text-sm
                    text-ctp-subtext0
                  "
              >
                Add the verification code below to your Roblox profile bio.
              </p>

              <div
                className="
                    mt-6
                    flex
                    items-center
                    gap-4
                  "
              >
                {robloxUser.avatar && (
                  <Image
                    src={robloxUser.avatar}
                    alt={robloxUser.username}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                )}

                <div>
                  <p className="font-semibold">{robloxUser.displayName}</p>

                  <p
                    className="
                        text-sm
                        text-ctp-subtext0
                      "
                  >
                    @{robloxUser.username}
                  </p>
                </div>
              </div>

              <div
                className="
                    mt-6
                    rounded-xl
                    border
                    border-ctp-surface1
                    bg-ctp-crust
                    p-5
                  "
              >
                <code
                  className="
                      block
                      break-all
                      text-center
                      font-mono
                      text-lg
                      text-ctp-instance
                    "
                  onClick={() => {
                    navigator.clipboard.writeText(verification.code);
                  }}
                >
                  {verification.code}
                </code>
              </div>

              <p
                className="
                    mt-3
                    text-xs
                    text-ctp-overlay1
                  "
              >
                Expires {new Date(verification.expiresAt).toLocaleTimeString()}
              </p>

              <Button
                variant="primary"
                className="mt-6 w-full"
                loading={loading}
                onClick={handleVerify}
              >
                Verify Account
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setStep("signup");
                  setSignupId(null);
                  setVerification(null);
                  setRobloxUser(null);
                }}
                className="mt-2 w-full"
              >
                Use a different account
              </Button>
            </>
          )}

          {error && (
            <p
              className="
                mt-4
                text-sm
                text-ctp-red
              "
            >
              {error}
            </p>
          )}

          {step === "signup" && (
            <p
              className="
                mt-4
                text-sm
                text-ctp-overlay1
              "
            >
              Already have an account?{" "}
              <a href="/login" className="text-ctp-blue">
                Log in
              </a>
            </p>
          )}

          {!settings?.allowRobloxAuth &&
            !settings?.allowPasswordAuth &&
            settings?.enableRegistration && (
              <div
                className="
                mt-6
                flex
                items-start
                gap-3
                rounded-xl
                border
                border-ctp-red/40
                bg-ctp-red/10
                p-4
                text-sm
                text-ctp-red
              "
              >
                <InformationCircleIcon
                  className="
                  mt-0.5
                  h-5
                  w-5
                  shrink-0
                "
                />

                <span>
                  This instance has no authentication methods enabled. Please
                  contact the instance administrator.
                </span>
              </div>
            )}

          {!settings?.enableRegistration && (
            <div
              className="
                  mt-6
                  flex
                  items-start
                  gap-3
                  rounded-xl
                  border border-ctp-red/40
                  bg-ctp-red/10
                  p-4
                  text-sm
                  text-ctp-red
                "
            >
              <InformationCircleIcon className="h-5 w-5 mt-0.5 shrink-0 antialiased" />

              <span>
                Registration is currently disabled. Please contact whoever is
                responsible for your instance.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
