"use client";

import AuthBackground from "@/components/AuthBackground";
import Button from "@/components/Button";
import {
  BuildingOffice2Icon,
  PhotoIcon,
  PaintBrushIcon,
  LockClosedIcon,
  UserPlusIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SetupPage() {
  const [name, setName] = useState("Orbit");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#fb019c");
  const [allowPasswordAuth, setAllowPasswordAuth] = useState(true);
  const [enableRegistration, setEnableRegistration] = useState(true);
  const [loadingMe, setLoadingMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  useEffect(() => {
    async function checkUser() {
      try {
        const res = await fetch("/api/me");
        const data = await res.json();

        if (!data.success || !data.data) {
          router.push("/signup");
          return;
        }

        if (!data.data.isOwner) {
          router.push("/");
          return;
        }

        setLoadingMe(false);
      } catch (err) {
        console.error("Failed to check user:", err);
        router.push("/signup");
      }
    }

    checkUser();
  }, [router]);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/setup/instance_settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          logoUrl,
          faviconUrl,
          primaryColor,
          allowPasswordAuth,
          enableRegistration,
        }),
      });

      const data = await res.json();
      console.log(data)
      if (!data.success) {
        console.error(data.error);
        return;
      }

      console.log("redirecting")
      router.refresh();
      router.replace("/");
    } catch (err) {
      console.error("Failed to save instance settings:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ctp-base">
      <AuthBackground
        lightBackground="/orbitbackground-light.svg"
        darkBackground="/orbitbackground-dark.svg"
      />

      {loadingMe && <div className="relative z-10 min-h-screen w-full flex items-center justify-center"><h1 className="text-5xl font-bold tracking-tight text-ctp-text">Loading</h1></div>}
      {!loadingMe && (
        <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
          <section className="flex flex-1 items-center px-8 py-16 lg:px-20">
            <div className="max-w-lg">
              <h1 className="text-5xl font-bold tracking-tight text-ctp-text">
                Let's get your{" "}
                <span className="text-ctp-instance">
                  Orbit
                </span>{" "}
                instance setup!
              </h1>

            <p className="mt-5 max-w-md text-lg leading-relaxed text-ctp-subtext0">
              A modern, open-source staff management platform for Roblox groups.
            </p>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center px-6 py-12">
          <div
            className="
              w-full
              max-w-md
              rounded-3xl
              border
              border-ctp-surface0
              bg-ctp-mantle/80
              p-8
              shadow-2xl
              backdrop-blur-xl
            "
          >
            <h2 className="text-2xl font-bold">
              Setup
            </h2>

            <p className="mt-2 text-sm text-ctp-subtext0">
              Configure your Orbit instance settings.
            </p>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-ctp-subtext1">
                  Instance Name
                </label>

                <div className="flex h-11 items-center rounded-xl border border-ctp-surface1 bg-ctp-crust px-3 focus-within:border-ctp-instance">
                  <BuildingOffice2Icon className="mr-2 h-5 w-5 text-ctp-subtext0" />

                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Orbit"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-ctp-overlay0"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ctp-subtext1">
                  Branding
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex h-11 items-center rounded-xl border border-ctp-surface1 bg-ctp-crust px-3 focus-within:border-ctp-instance">
                    <PhotoIcon className="mr-2 h-5 w-5 text-ctp-subtext0" />

                    <input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="Logo URL"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-ctp-overlay0"
                    />
                  </div>

                  <div className="flex h-11 items-center rounded-xl border border-ctp-surface1 bg-ctp-crust px-3 focus-within:border-ctp-instance">
                    <GlobeAltIcon className="mr-2 h-5 w-5 text-ctp-subtext0" />

                    <input
                      value={faviconUrl}
                      onChange={(e) => setFaviconUrl(e.target.value)}
                      placeholder="Favicon URL"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-ctp-overlay0"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ctp-subtext1">
                  Appearance
                </label>

                <div className="flex h-11 items-center rounded-xl border border-ctp-surface1 bg-ctp-crust px-3 focus-within:border-ctp-instance">
                  <PaintBrushIcon className="mr-2 h-5 w-5 text-ctp-subtext0" />

                  <input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#fb019c"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-ctp-overlay0"
                  />

                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-7 w-7 cursor-pointer rounded-lg border-0 bg-transparent"
                  />
                </div>
              </div>


              <div>
                <label className="mb-2 block text-sm font-medium text-ctp-subtext1">
                  Authentication
                </label>

                <div className="space-y-3">
                  <label className="flex items-center justify-between rounded-xl border border-ctp-surface1 bg-ctp-crust p-3">
                    <div className="flex items-center gap-3">
                      <LockClosedIcon className="h-5 w-5 text-ctp-subtext0" />

                      <span className="text-sm">
                        Password Authentication
                      </span>
                    </div>

                    <input
                      type="checkbox"
                      checked={allowPasswordAuth}
                      onChange={(e) =>
                        setAllowPasswordAuth(e.target.checked)
                      }
                      className="h-4 w-4 accent-ctp-instance"
                    />
                  </label>


                  <label className="flex items-center justify-between rounded-xl border border-ctp-surface1 bg-ctp-crust p-3">
                    <div className="flex items-center gap-3">
                      <UserPlusIcon className="h-5 w-5 text-ctp-subtext0" />

                      <span className="text-sm">
                        Enable Registration
                      </span>
                    </div>

                    <input
                      type="checkbox"
                      checked={enableRegistration}
                      onChange={(e) =>
                        setEnableRegistration(e.target.checked)
                      }
                      className="h-4 w-4 accent-ctp-instance"
                    />
                  </label>
                </div>
              </div>

              <Button variant="primary" className="w-full mb-0" type="submit" loading={loading}>
                Complete Setup
              </Button>
              <p className="text-sm text-ctp-subtext1">
                You can change these settings later.
              </p>
            </form>
          </div>
        </section>
        </div>
      )}
    </main>
  );
}
