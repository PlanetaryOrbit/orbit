import { useState, useEffect, useRef } from "react";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconCheck, IconCloud, IconEye, IconEyeOff, IconX } from "@tabler/icons-react";
import Button from "@/components/button";
import { ServiceCard, ServiceToggle } from "../instance/ServiceCard";

type KeyStatus = "verified" | "failed" | "Saved" | null;

function OpenCloud({ title = "Open Cloud" }: { title?: string }) {
  const [workspace] = useRecoilState(workspacestate);
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [keySet, setKeySet] = useState(false);
  const [ockey, setockey] = useState("");
  const [replaceMode, setReplaceMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const testedKey = useRef<string | null>(null);

  useEffect(() => {
    if (router.query.id) {
      axios
        .get(`/api/workspace/${workspace.groupId}/settings/general/roblox/key`)
        .then((res) => {
          if (res.data.value) {
            setEnabled(res.data.value.enabled || false);
            setKeySet(!!res.data.value.keySet);
            setockey("");
            setReplaceMode(false);
            testedKey.current = res.data.value.keySet ? "•" : null;
            setKeyStatus(res.data.value.keySet ? "Saved" : null);
          }
        })
        .catch((err) => {
          console.error("Error fetching OpenCloud key config:", err);
        });
    }
  }, [router.query.id, workspace.groupId]);

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setockey(e.target.value);
    setKeyStatus(null);
  };

  const testKey = async (keyToTest: string | null): Promise<boolean> => {
    const errorMessages: Record<number, string> = {
      1: "API key is missing the 'group' scope",
      2: "API key needs both read and write permissions",
      3: "API key has expired",
      4: "API key is disabled",
      5: "Invalid API key",
      400: "API key is not provided in a valid format.",
    };
    try {
      const payload = keyToTest && keyToTest.trim() !== "" ? { key: keyToTest } : {};
      const response = await axios.post(
        `/api/workspace/${workspace.groupId}/settings/general/roblox/test`,
        payload
      );
      if (response.data.success) {
        if (keyToTest && keyToTest.trim() !== "") {
          testedKey.current = keyToTest.trim();
        } else {
          testedKey.current = "•";
        }
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
    if (ockey.trim()) {
      setTesting(true);
      const valid = await testKey(ockey);
      if (valid) toast.success("API key is valid");
      setTesting(false);
      return;
    }
    if (keySet) {
      setTesting(true);
      const valid = await testKey(null);
      if (valid) toast.success("API key is valid");
      setTesting(false);
      return;
    }
    toast.error("Please enter an Open Cloud API key first");
  };

  const handleSave = async () => {
    if (enabled) {
      if (!keySet && !ockey.trim()) {
        toast.error("Please enter an Open Cloud API key first");
        return;
      }
      if (ockey.trim() && testedKey.current !== ockey.trim()) {
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
      const payload: { enabled: boolean; key?: string } = { enabled };
      if (ockey.trim() !== "") {
        payload.key = ockey;
      }
      await axios.patch(`/api/workspace/${workspace.groupId}/settings/general/roblox/key`, payload);
      setKeyStatus("Saved");
      if (ockey.trim() !== "") {
        setKeySet(true);
        testedKey.current = "•";
      }
      setReplaceMode(false);
      setockey("");
      setShowApiKey(false);
      toast.success("Open Cloud API key saved!");
    } catch (error) {
      console.error("Error saving Open Cloud API key:", error);
      toast.error("Failed to save Open Cloud API key");
    } finally {
      setLoading(false);
    }
  };

  const showInput = !keySet || replaceMode;
  const canTest = ockey.trim() !== "" || keySet;
  const inputType = showApiKey ? "text" : "password";

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
            {showInput ? (
              <div className="relative">
                <input
                  type={inputType}
                  value={ockey}
                  onChange={handleKeyChange}
                  placeholder="Open Cloud API key"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-3 pr-11 text-sm text-zinc-900 transition-colors focus:border-[color:rgb(var(--group-theme))] focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.25)] dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800 dark:hover:bg-zinc-700/80 dark:hover:text-zinc-200"
                  title={showApiKey ? "Hide key" : "Show key"}
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? <IconEyeOff className="h-4 w-4" stroke={1.5} /> : <IconEye className="h-4 w-4" stroke={1.5} />}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  A key is saved. It is not shown again. Use <b className="text-zinc-800 dark:text-zinc-200">Replace key</b> to rotate it.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setReplaceMode(true);
                    setockey("");
                    setKeyStatus(null);
                    testedKey.current = null;
                    setShowApiKey(false);
                  }}
                  className="shrink-0 self-start rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  Replace key
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || loading || !canTest}
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
