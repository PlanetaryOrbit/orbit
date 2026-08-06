"use client";

import {
  LockClosedIcon,
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { InformationCircleIcon } from "@heroicons/react/24/solid";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import { useUser } from "../providers/UserProvider";
import { useRouter } from "next/navigation";
import { useInstance } from "../providers/InstanceProvider";

interface InstanceSettings {
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  darkBackground: string | null;
  lightBackground: string | null;
  allowPasswordAuth: boolean;
  allowRobloxAuth: boolean | false;
  enableRegistration: boolean;
  isSetup: boolean;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<InstanceSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const hasBoth = false && settings?.allowPasswordAuth;

  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  async function handleLogin(
    e: React.SubmitEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
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
        setError(
          data.error?.message ??
          "Invalid username or password.",
        );

        return;
      }

      router.push("/");
      router.refresh();

    } catch {
      setError(
        "Unable to connect to the server.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <section
          className="
            flex flex-1
            items-center
            px-8 py-16
            lg:px-20
          "
        >
          <div className="max-w-lg">
            <h1 className="text-5xl font-bold tracking-tight text-ctp-text">
              Welcome back to,{" "}
              <span className="text-ctp-instance">
                {settings?.name}
              </span>
            </h1>

            <p className="mt-5 max-w-md text-lg leading-relaxed text-ctp-subtext0">
              Sign in to manage your workspaces.
            </p>
          </div>
        </section>

        <section
          className="
            flex
            flex-1
            items-center
            justify-center
            px-6 py-12
          "
        >
          <div
            className="
              w-full max-w-md
              rounded-3xl
              border border-ctp-surface0
              bg-ctp-mantle/80
              p-8
              shadow-2xl
              backdrop-blur-xl
            "
          >
            <h2 className="text-2xl font-bold">Sign in</h2>

            <p className="mt-2 text-sm text-ctp-subtext0">
              {hasBoth
                ? "Sign in with your Roblox account or use your username and password."
                : settings?.allowPasswordAuth
                  ? "Sign in using your Roblox username and password."
                  : ""}
            </p>

            {!settingsLoading && !settings?.allowPasswordAuth && settings?.enableRegistration && settings?.allowRobloxAuth && (
              <div className="mt-6">
                <Button
                  variant="primary"
                  className="w-full"
                  iconSrc="/roblox.svg"
                >
                  Continue with Roblox
                </Button>
              </div>
            )}

            {!settingsLoading && settings?.allowPasswordAuth && settings?.enableRegistration && !settings?.allowRobloxAuth && (
              <form className="mt-6 space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ctp-subtext1">
                    Roblox Username
                  </label>

                  <div
                    className="
                      flex h-11 items-center
                      rounded-xl
                      border border-ctp-surface1
                      bg-ctp-crust
                      px-3
                      transition
                      focus-within:border-ctp-instance
                    "
                  >
                    <UserIcon className="h-5 w-5 mr-2 text-ctp-subtext0" />

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
                  <label className="mb-2 block text-sm font-medium text-ctp-subtext1">
                    Password
                  </label>

                  <div
                    className="
                      flex h-11 items-center
                      rounded-xl
                      border border-ctp-surface1
                      bg-ctp-crust
                      px-3
                      transition
                      focus-within:border-ctp-instance
                    "
                  >
                    <LockClosedIcon className="h-5 w-5 mr-2 text-ctp-subtext0" />

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
                        text-ctp-subtext0
                        transition
                        hover:text-ctp-text cursor-pointer
                      "
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={loading}
                >
                  Sign In
                </Button>
              </form>
            )}

            {!settingsLoading && hasBoth && (
              <>
                <div className="my-6 flex items-center">
                  <div className="h-px flex-1 bg-ctp-surface0" />

                  <span className="mx-3 text-xs uppercase text-ctp-overlay1">
                    Or
                  </span>

                  <div className="h-px flex-1 bg-ctp-surface0" />
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

            {!settingsLoading && !settings?.allowPasswordAuth && !settings?.allowRobloxAuth && (
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
                  This instance has no authentication methods enabled. Please
                  contact whoever is responsible for your instance.
                </span>
              </div>
            )}

            {!settingsLoading && !settings?.enableRegistration && (
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
                  Registration is currently disabled. Please contact whoever is responsible for your instance.
                </span>
              </div>
            )}

            {settingsLoading && <p className="mt-4 text-sm text-ctp-overlay1">Loading...</p>}
            {error && <p className="mt-4 text-sm text-ctp-red">{error}</p>}
            <p className="mt-4 text-sm text-ctp-overlay1">
              Don't have an account?{" "}
              <a href="/signup" className="text-ctp-blue">
                Sign up
              </a>
            </p>
          </div>
        </section>
      </div>
  );
}
