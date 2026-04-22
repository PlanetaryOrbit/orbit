import { useState, useEffect, useRef } from "react";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconCheck, IconCloud, IconX } from "@tabler/icons-react";
import Button from "@/components/button";
import { ServiceCard, ServiceToggle } from "../instance/ServiceCard";

type KeyStatus = "verified" | "failed" | "Saved" | null;

function OpenCloud({ title = "Open Cloud" }: { title?: string }) {
  const [workspace] = useRecoilState(workspacestate);
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [ockey, setockey] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>(null);
  const testedKey = useRef<string | null>(null);
  const savedKey = useRef<string>("");

  useEffect(() => {
    if (router.query.id) {
      axios
        .get(`/api/workspace/${workspace.groupId}/settings/general/roblox/key`)
        .then((res) => {
          if (res.data.value) {
            setEnabled(res.data.value.enabled || false);
            setockey(res.data.value.key || "");
            savedKey.current = res.data.value.key || "";
            testedKey.current = res.data.value.key || "";
            setKeyStatus(res.data.value.key ? "verified" : null);
          }
        })
        .catch((err) => {
          console.error("Error fetching OpenCloud key config:", err);
        });
    }
  }, [router.query.id, workspace.groupId]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setockey(val);
    setKeyStatus(val && val === testedKey.current ? "verified" : null);
  };

  const testKey = async (keyToTest: string): Promise<boolean> => {
    const errorMessages: Record<number, string> = {
      1: "API key is missing the 'group' scope",
      2: "API key needs both read and write permissions",
      3: "API key has expired",
      4: "API key is disabled",
      5: "Invalid API key",
      400: "API key is not provided in a valid format.",
    };
    try {
      const response = await axios.post(`/api/workspace/${workspace.groupId}/settings/general/roblox/test`, { key: keyToTest });
      if (response.data.success) {
        testedKey.current = keyToTest;
        setKeyStatus("verified");
        return true;
      }
      setKeyStatus("failed");
      toast.error("API key is invalid");
      return false;
    } catch (error: any) {
      const code = error?.response?.data?.code;
      const message = error?.response?.data?.message;
      setKeyStatus("failed");
      toast.error(errorMessages[code] || message || "Failed to test key");
      return false;
    }
  };

  const handleTest = async () => {
    if (!ockey) {
      toast.error("Please enter an Open Cloud API key first");
      return;
    }
    setTesting(true);
    const valid = await testKey(ockey);
    if (valid) toast.success("API key is valid");
    setTesting(false);
  };

  const handleSave = async () => {
    if (enabled) {
      if (!ockey) {
        toast.error("Please enter an Open Cloud API key first");
        return;
      }
      if (ockey !== testedKey.current) {
        setTesting(true);
        toast.loading("Testing key before saving...", { id: "pre-save-test" });
        const valid = await testKey(ockey);
        setTesting(false);
        toast.dismiss("pre-save-test");
        if (!valid) return;
        toast.success("API key is valid");
      }
    }
    setLoading(true);
    try {
      await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/roblox/key`, { enabled, key: ockey });
      savedKey.current = ockey;
      setKeyStatus("Saved");
      toast.success("Open Cloud API key saved!");
    } catch (error) {
      console.error("Error saving Open Cloud API key:", error);
      toast.error("Failed to save Open Cloud API key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ServiceCard
      icon={IconCloud}
      title={title}
      description="Use Roblox Open Cloud for deeper integration with your group."
      footer={
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading || testing} workspace>
            <span className="inline-flex items-center gap-2">
              <IconCheck className="h-4 w-4" stroke={1.5} />
              {loading ? "Saving…" : testing ? "Testing…" : "Save"}
            </span>
          </Button>
        </div>
      }
    >
      <ServiceToggle
        enabled={enabled}
        onToggle={() => setEnabled(!enabled)}
        label="Enable Open Cloud for this workspace"
      />
      {enabled && (
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">API key</label>
            <input
              type="text"
              value={ockey}
              onChange={handleKeyChange}
              placeholder="Open Cloud API key"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 transition-colors focus:border-[color:rgb(var(--group-theme))] focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.25)] dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || loading || !ockey}
              className="rounded-lg bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
            >
              {testing ? "Testing…" : "Test key"}
            </button>
            {keyStatus === "verified" && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                <IconCheck className="h-4 w-4" stroke={2} />
                Verified
              </span>
            )}
            {keyStatus === "Saved" && (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                <IconCheck className="h-4 w-4" stroke={2} />
                Saved
              </span>
            )}
            {keyStatus === "failed" && (
              <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                <IconX className="h-4 w-4" stroke={2} />
                Invalid
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Requires <b className="text-zinc-700 dark:text-zinc-200">group:read</b> and{" "}
            <b className="text-zinc-700 dark:text-zinc-200">group:write</b>.
          </p>
        </div>
      )}
    </ServiceCard>
  );
}

OpenCloud.title = "Open Cloud Integration";

export default OpenCloud;
