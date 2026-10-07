import { IconCheck, IconConfetti, IconRefresh } from '@tabler/icons-react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import Button from '@/components/button';
import {
  formatMilestoneMessage,
  getDefaultMilestoneMessage,
} from '@/utils/discord/milestoneMessage';

import { ServiceCard, ServiceToggle } from '../instance/ServiceCard';

const messageVariables = [
  {
    variable: '{groupName}',
    label: 'Group name',
    description: 'Your Roblox group name.',
  },
  {
    variable: '{crossedMilestone}',
    label: 'Milestone',
    description: 'The milestone that was just reached.',
  },
  {
    variable: '{currentMemberCount}',
    label: 'Current member count',
    description: 'The group’s current member count.',
  },
  {
    variable: '{membersRemaining}',
    label: 'Members remaining',
    description: 'Members needed to reach the next milestone.',
  },
  {
    variable: '{nextMilestone}',
    label: 'Next milestone',
    description: 'The next member milestone.',
  },
];

function DiscordMilestones({ title = 'Discord Milestones' }: { title?: string }) {
  const router = useRouter();

  const [enabled, setEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [message, setMessage] = useState(getDefaultMilestoneMessage());
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!router.query.id) return;

    axios
      .get(`/api/workspace/${router.query.id}/settings/general/discord/milestone/key`)
      .then((res) => {
        if (!res.data.value) return;

        setEnabled(res.data.value.enabled || false);
        setWebhookUrl(res.data.value.url || '');
        setMessage(res.data.value.message || getDefaultMilestoneMessage());
      })
      .catch((err) => {
        console.error('Error fetching discord webhook config:', err);
      });
  }, [router.query.id]);

  const preview = useMemo(
    () =>
      formatMilestoneMessage(message, {
        groupName: 'Group Name',
        crossedMilestone: 57,
        currentMemberCount: 57,
        membersRemaining: 43,
        nextMilestone: 100,
      }),
    [message],
  );

  const handleSave = async () => {
    setLoading(true);

    try {
      await axios.patch(
        `/api/workspace/${router.query.id}/settings/general/discord/milestone/key`,
        {
          enabled,
          url: webhookUrl,
          message,
        },
      );

      toast.success('Milestone settings saved!');
    } catch (error) {
      console.error('Error saving Discord milestone settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!webhookUrl) {
      toast.error('Please enter a webhook URL first');
      return;
    }

    setTesting(true);

    try {
      const response = await axios.post(
        `/api/workspace/${router.query.id}/settings/general/discord/milestone/test`,
        {
          url: webhookUrl,
          message,
        },
      );

      if (response.data.success) {
        toast.success('Test message sent successfully!');
      } else {
        toast.error('Failed to send test message');
      }
    } catch (error: any) {
      console.error('Error testing webhook:', error);
      toast.error(error.response?.data?.error || 'Failed to send test message');
    } finally {
      setTesting(false);
    }
  };

  const resetMessage = () => {
    setMessage(getDefaultMilestoneMessage());
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
              {loading ? 'Saving…' : 'Save'}
            </span>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <ServiceToggle
          enabled={enabled}
          onToggle={() => setEnabled(!enabled)}
          label="Post milestone messages to Discord"
        />

        {enabled && (
          <>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="discord-milestone-webhook"
                  className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
                >
                  Webhook URL
                </label>

                <input
                  id="discord-milestone-webhook"
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
                {testing ? 'Sending…' : 'Send test'}
              </button>
            </div>

            <div className="border-t border-zinc-200 pt-5 dark:border-zinc-800">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <label
                    htmlFor="discord-milestone-message"
                    className="block text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    Message
                  </label>

                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    Customize what Orbit sends when a milestone is reached.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetMessage}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  <IconRefresh className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>

              <textarea
                id="discord-milestone-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={2000}
                className="w-full resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 font-mono text-sm text-zinc-900 transition-colors focus:border-[color:rgb(var(--group-theme))] focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.25)] dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-white"
              />

              <div className="mt-1 flex justify-end text-xs text-zinc-400">
                {message.length}/2000
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Available variables
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
                {messageVariables.map((item) => (
                  <button
                    key={item.variable}
                    type="button"
                    onClick={() => setMessage((current) => `${current}${item.variable}`)}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left transition hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <code className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {item.variable}
                    </code>

                    <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                      {item.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Preview</p>

              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                {preview}
              </div>
              <p class="text-xxs text-zinc-500">
                <small>Data is not accurate to current member count</small>
              </p>
            </div>
          </>
        )}
      </div>
    </ServiceCard>
  );
}

DiscordMilestones.title = 'Discord Milestones';

export default DiscordMilestones;
