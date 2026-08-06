"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { useUser } from "./providers/UserProvider";
import { useInstance } from "./providers/InstanceProvider";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

export default function Home() {
  const { user } = useUser();
  const { settings, refreshSettings } = useInstance();
  const router = useRouter();

  if (!user) {
    router.replace("/login");
    return null;
  }

  return (
    <>
      <h1>text</h1>

      <code className="font-mono">
        {JSON.stringify(settings, null, 2)}
      </code>

      <br />
      <br />

      <code className="font-mono">
        {JSON.stringify(user, null, 2)}
      </code>
      <br />
      <br />
      <br />
      <Button variant="secondary" onClick={refreshSettings} icon={ArrowPathIcon}>
        Refresh
      </Button>
    </>
  );
}
