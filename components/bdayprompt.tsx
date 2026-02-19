import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

interface WorkspaceBirthdayPromptProps {
  workspaceId: number | string;
  visible?: boolean;
}

export const WorkspaceBirthdayPrompt: React.FC<WorkspaceBirthdayPromptProps> = ({ workspaceId, visible }) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [timezone, setTimezone] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(detectedTimezone);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`/api/workspace/${workspaceId}/birthday`);
        if (cancelled) return;
        const { birthdayDay, birthdayMonth } = res.data;
        const skipped = birthdayDay === 0 && birthdayMonth === 0;
        const needs = !skipped && (birthdayDay == null || birthdayMonth == null);
        setOpen(needs && (visible ?? true));
      } catch (e) {
      } finally {
        if (!cancelled) setInitialLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [workspaceId, visible]);

  const daysInMonth = (m: number) => {
    if (m === 2) return 28;
    if ([4,6,9,11].includes(m)) return 30;
    return 31;
  };

  const months = [
    { name: 'January', value: 1 }, { name: 'February', value: 2 }, { name: 'March', value: 3 },
    { name: 'April', value: 4 }, { name: 'May', value: 5 }, { name: 'June', value: 6 },
    { name: 'July', value: 7 }, { name: 'August', value: 8 }, { name: 'September', value: 9 },
    { name: 'October', value: 10 }, { name: 'November', value: 11 }, { name: 'December', value: 12 }
  ];

  const days = month ? Array.from({ length: daysInMonth(Number(month)) }, (_, i) => i + 1) : [];

  const save = async (skip = false) => {
    setLoading(true);
    try {
      if (skip) {
        await axios.post(`/api/workspace/${workspaceId}/birthday`, { day: 0, month: 0, timezone });
      } else {
        await axios.post(`/api/workspace/${workspaceId}/birthday`, { day: Number(day), month: Number(month), timezone });
      }
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (!open || !initialLoaded) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bday-title"
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden"
      >
        <div className="px-6 py-5 sm:px-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-[#ff66b2] to-[#ff0099] flex items-center justify-center text-white text-xl shadow-md">
                🎂
              </div>
            </div>

            <div className="flex-1">
              <h2 id="bday-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Set your birthday</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Sharing your birthday helps with celebrations — you can skip if you'd prefer not to.</p>
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); save(false); }}
            className="mt-5"
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="sr-only" htmlFor="bday-month">Month</label>
              <select
                id="bday-month"
                value={month}
                onChange={e => { setMonth(e.target.value); setDay(''); }}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#ff0099]/40"
              >
                <option value="">Month</option>
                {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
              </select>

              <label className="sr-only" htmlFor="bday-day">Day</label>
              <select
                id="bday-day"
                value={day}
                onChange={e => setDay(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#ff0099]/40"
                disabled={!month}
              >
                <option value="">Day</option>
                {days.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || !day || !month}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#ff0099] hover:bg-[#ff0099]/95 text-white font-medium shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>

              <button
                type="button"
                onClick={() => save(true)}
                disabled={loading}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100/90"
              >
                Skip
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkspaceBirthdayPrompt;