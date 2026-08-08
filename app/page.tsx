"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "./providers/UserProvider";
import { useInstance } from "./providers/InstanceProvider";
import {
  ArrowLongRightIcon,
  ArrowPathIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import Button from "@/components/Button";
import Image from "next/image";

const greetings = [
  "Welcome back, $!",
  "Good to see you again, $!",
  "Hey $, ready to get things done?",
  "Welcome home, $",
  "Meowdy, $",
];

function getGreeting(username: string) {
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  return greeting.replace("$", username);
}

export default function Home() {
  const { user } = useUser();
  const { settings } = useInstance();
  const router = useRouter();

  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    if (user) {
      setGreeting(getGreeting(user.username));
    }
  }, [user]);

  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-ctp-text">
          {greeting || `Welcome back, ${user.username}!`}
        </h1>

        <p className="mt-3 text-lg text-ctp-subtext0">
          Pick a workspace to get started.
        </p>
      </header>

      <section className="mt-10">
        <div className="flex items-center justify-between border-b border-ctp-surface1 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-ctp-text">
              Workspaces
            </h2>

            <p className="mt-1 text-xs text-ctp-overlay0">
              1 workspace available
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={ArrowPathIcon}
              onClick={() => {
                // TODO: sync roles
              }}
            >
              Sync Roles
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={PlusIcon}
              onClick={() => {
                // TODO: create workspace
              }}
            >
              Create Workspace
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="group overflow-hidden rounded-2xl border border-ctp-surface1 bg-ctp-mantle transition-all duration-200 hover:border-ctp-surface2 hover:shadow-lg">
            <div className="flex items-start justify-between p-5">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-crust">
                {settings.logoUrl ? (
                  <Image
                    src={settings.logoUrl}
                    alt={settings.name}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-base font-semibold text-ctp-instance">
                    {settings.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 pb-5">
              <h3 className="text-base font-semibold text-ctp-text">
                Test Workspace
              </h3>

              <p className="mt-1 text-sm text-ctp-subtext0">
                meow meow meow meow
              </p>

              <div className="mt-5 flex items-center justify-between border-t border-ctp-surface1 pt-4">
                <div className="flex gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ctp-text">12</p>
                    <p className="text-xs text-ctp-overlay0">Roles</p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-ctp-text">48</p>
                    <p className="text-xs text-ctp-overlay0">Members</p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  href="/workspace/test"
                  icon={ArrowLongRightIcon}
                >
                  Open
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
