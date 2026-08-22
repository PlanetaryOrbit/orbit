"use client";

import Button from "@/components/Button";
import {
  BuildingOffice2Icon,
  PhotoIcon,
  PaintBrushIcon,
  LockClosedIcon,
  UserPlusIcon,
} from "@heroicons/react/24/solid";
import FormInput from "@/components/ui/FormInput";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "../providers/UserProvider";
import { useInstance } from "../providers/InstanceProvider";
import SwitchCard from "@/components/ui/SwitchCard";
import InputWithPreview from "@/components/ui/InputWithPreview";
import ColorInput from "@/components/ui/ColorPicker";

export default function SetupPage() {
  const { user } = useUser();
  const { settings } = useInstance();
  const [name, setName] = useState(settings.name);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl);
  const [primaryColor, setPrimaryColor] = useState(settings.primaryColor);
  const [allowPasswordAuth, setAllowPasswordAuth] = useState(
    settings.allowPasswordAuth,
  );
  const [enableRegistration, setEnableRegistration] = useState(
    settings.enableRegistration,
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace("/signup");
      return;
    }

    if (!user.isOwner) {
      router.replace("/");
    }
  }, [user, router]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--instance-primary",
      primaryColor,
    );
  }, [primaryColor]);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/v1/setup/instance_settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          logoUrl,
          primaryColor,
          allowPasswordAuth,
          enableRegistration,
          done: true,
        }),
      });

      const data = await res.json();
      console.log(data);
      if (!data.success) {
        console.error(data.error);
        return;
      }

      console.log("redirecting");
      router.replace("/");
    } catch (err) {
      console.error("Failed to save instance settings:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
      <section className="flex flex-1 items-center px-8 py-16 lg:px-20">
        <div className="max-w-lg">
          <h1 className="text-5xl font-bold tracking-tight text-ctp-text">
            Let's get your <span className="text-ctp-instance">Orbit</span>{" "}
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
          <h2 className="text-2xl font-bold">Setup</h2>

          <p className="mt-2 text-sm text-ctp-subtext0">
            Configure your Orbit instance settings.
          </p>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <FormInput
              label="Instance Name"
              value={name}
              onChange={setName}
              placeholder="Orbit"
              icon={BuildingOffice2Icon}
            />

            <InputWithPreview
              label="Logo"
              value={logoUrl}
              onChange={setLogoUrl}
              placeholder="https://example.com/logo.png"
            />

            <ColorInput
              label="Primary Color"
              value={primaryColor}
              onChange={setPrimaryColor}
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-ctp-subtext1">
                Authentication
              </label>

              <div className="space-y-3">
                <SwitchCard
                  icon={LockClosedIcon}
                  title="Password Authentication"
                  description="Allow users to sign in using a password."
                  enabled={allowPasswordAuth}
                  setEnabled={setAllowPasswordAuth}
                />

                <SwitchCard
                  icon={UserPlusIcon}
                  title="Enable Registration"
                  description="Allow new users to create accounts."
                  enabled={enableRegistration}
                  setEnabled={setEnableRegistration}
                />
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full mb-0"
              type="submit"
              loading={loading}
            >
              Complete Setup
            </Button>
            <p className="text-sm text-ctp-subtext1">
              You can change these settings later.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
