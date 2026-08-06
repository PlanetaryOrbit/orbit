"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Button from "@/components/Button";
import Dialog from "@/components/Dialog";

import { useUser } from "./providers/UserProvider";
import { useInstance } from "./providers/InstanceProvider";

import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { ArrowPathIcon } from "@heroicons/react/24/solid";

export default function Home() {
  const { user } = useUser();
  const { settings, refreshSettings } = useInstance();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(settings.name);
  const [primaryColor, setPrimaryColor] = useState(
    settings.primaryColor,
  );

  if (!user) {
    router.replace("/login");
    return null;
  }

  async function save() {
    setSaving(true);

    try {
      const res = await fetch("/api/instance", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          primaryColor,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error.message);
        return;
      }

      await refreshSettings();
      setOpen(false);
    } finally {
      setSaving(false);
    }
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
        {user.isOwner && (
          <Button
            variant="primary"
            icon={WrenchScrewdriverIcon}
            onClick={() => {
              setName(settings.name);
              setPrimaryColor(settings.primaryColor);
              setOpen(true);
            }}
          >
            Edit Instance
          </Button>
        )}
    </>
  );
}
