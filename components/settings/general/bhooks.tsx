import { useState, useEffect } from "react";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconGift, IconCheck } from "@tabler/icons-react";
import Button from "@/components/button";

function BirthdayWebhook({ title = "Birthday Notifications" }: { title?: string }) {
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (router.query.id) {
      axios
        .get(
          `/api/workspace/${router.query.id}/settings/general/birthdays/hook`
        )
        .then((res) => {
          if (res.data.value) {
            setEnabled(res.data.value.enabled || false);
            setWebhookUrl(res.data.value.url || "");
          }
        })
        .catch((err) => {
          console.error("Error fetching birthday webhook config:", err);
        });
    }
  }, [router.query.id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.patch(
        `/api/workspace/${router.query.id}/settings/general/birthdays/hook`,
        {
          enabled,
          url: webhookUrl,
        }
      );
      toast.success("Birthday webhook settings saved!");
    } catch (error) {
      console.error("Error saving birthday webhook:", error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl) {
      toast.error("Please enter a webhook URL first");
      return;
    }

    setTesting(true);
    try {
      const response = await axios.post(
        `/api/workspace/${router.query.id}/settings/general/birthdays/test`,
        { url: webhookUrl }
      );

      if (response.data.success) {
        toast.success("Test message sent successfully!");
      } else {
        toast.error("Failed to send test message");
      }
    } catch (error: any) {
      console.error("Error testing webhook:", error);
      toast.error(error.response?.data?.error || "Failed to send test message");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))] shrink-0">
          <IconGift className="w-6 h-6" stroke={1.5} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Send Discord notifications when it's someone's birthday
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between p-5 bg-zinc-50/80 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/50">
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">
              Enable Birthday Notifications
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Automatically send Discord messages for birthdays
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              enabled ? "bg-[color:rgb(var(--group-theme))]" : "bg-zinc-300 dark:bg-zinc-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {enabled && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Discord Webhook URL
              </label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-3 py-2.5 border rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.25)] focus:border-[color:rgb(var(--group-theme))] transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={testing || !webhookUrl}
                className="px-4 py-2.5 text-sm font-medium rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? "Sending..." : "Send Test Message"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-6 border-t border-zinc-200/80 dark:border-zinc-700/80">
        <Button onClick={handleSave} disabled={loading} workspace>
          <span className="inline-flex items-center gap-2">
            <IconCheck className="w-4 h-4" stroke={1.5} />
            {loading ? "Saving..." : "Save Settings"}
          </span>
        </Button>
      </div>
    </div>
  );
}

BirthdayWebhook.title = "Birthday Notifications";

export default BirthdayWebhook;