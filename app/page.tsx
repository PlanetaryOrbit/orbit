"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "./providers/UserProvider";
import { useInstance } from "./providers/InstanceProvider";

const greetings = [
  "Welcome back, $!",
  "Good to see you again, $!",
  "Hey $, ready to get things done?",
  "Welcome home, $",
  "Meowdy, $",
];

function getGreeting(username: string) {
  const greeting =
    greetings[Math.floor(Math.random() * greetings.length)];

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
      <h1 className="text-4xl font-bold tracking-tight text-ctp-text">
        {greeting || `Welcome back, ${user.username}!`}
      </h1>

      <p className="mt-3 text-lg text-ctp-subtext0">
        Please pick a workspace to get started.
      </p>

      <div className="mt-12 space-y-10">
        <section>
          <h2 className="mb-3 text-xl font-semibold text-ctp-text">
            Instance Settings
          </h2>

          <pre
            className="
              overflow-x-auto
              rounded-2xl
              bg-ctp-crust
              p-5
              font-mono
              text-sm
              leading-relaxed
              text-ctp-subtext1
            "
          >
            {JSON.stringify(settings, null, 2)}
          </pre>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-ctp-text">
            User Provider
          </h2>

          <pre
            className="
              overflow-x-auto
              rounded-2xl
              bg-ctp-crust
              p-5
              font-mono
              text-sm
              leading-relaxed
              text-ctp-subtext1
            "
          >
            {JSON.stringify(user, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
