import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconCheck, IconConfetti } from "@tabler/icons-react";
import Button from "@/components/button";
import { ServiceCard, ServiceToggle } from "../instance/ServiceCard";

function DiscordMilestones({ title = "Discord Milestones" }: { title?: string }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (router.query.id) {
      axios
        .get(`/api/workspace/${router.query.id}/settings/general/discord/milestone/key`)
        .then((res) => {
          if (res.data.value) {
            setEnabled(res.data.value.enabled || false);
            setWebhookUrl(res.data.value.url || "");
          }
        })
        .catch((err) => {
          console.error("Error fetching discord webhook config:", err);
        });
    }
  }, [router.query.id]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.patch(`/api/workspace/${router.query.id}/settings/general/discord/milestone/key`, {
        enabled,
        url: webhookUrl,
      });
      toast.success("Milestone webhook saved!");
    } catch (error) {
      console.error("Error saving Discord webhook:", error);
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
        `/api/workspace/${router.query.id}/settings/general/discord/milestone/test`,
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
    <ServiceCard
      icon={IconConfetti}
      title={title}
      description="Celebrate when your group hits a new member count milestone."
      footer={
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading} workspace>
            <span className="inline-flex items-center gap-2">
              <IconCheck className="h-4 w-4" stroke={1.5} />
              {loading ? "Saving…" : "Save"}
            </span>
          </Button>
        </div>
      }
    >
      <ServiceToggle
        enabled={enabled}
        onToggle={() => setEnabled(!enabled)}
        label="Post milestone messages to Discord"
      />
      {enabled && (
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">Webhook URL</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/…"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 transition-colors focus:border-[color:rgb(var(--group-theme))] focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.25)] dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-white"
            />
          </div>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !webhookUrl}
            className="rounded-lg bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
          >
            {testing ? "Sending…" : "Send test"}
          </button>
        </div>
      )}
    </ServiceCard>
  );
}

DiscordMilestones.title = "Discord Milestones";

export default DiscordMilestones;
