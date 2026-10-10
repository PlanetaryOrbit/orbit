import { IconArrowUp, IconCheck } from '@tabler/icons-react';
import axios from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import type toast from 'react-hot-toast';
import { useRecoilState } from 'recoil';

import SwitchComponenet from '@/components/switch';
import { workspacestate } from '@/state';
import { FC } from '@/types/settingsComponent';

type GroupRank = {
  id: number;
  name: string;
  rank: number;
};

type RecommendationConfig = {
  enabled: boolean;
  ranks: number[];
};

type Props = {
  triggerToast: typeof toast;
};

const Recommendations: FC<Props> = ({ triggerToast }) => {
  const [workspace] = useRecoilState(workspacestate);
  const [config, setConfig] = useState<RecommendationConfig>({
    enabled: false,
    ranks: [],
  });
  const [ranks, setRanks] = useState<GroupRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      try {
        const [configResponse, ranksResponse] = await Promise.all([
          axios.get(`/api/workspace/${workspace.groupId}/settings/general/recommendations`),
          axios.get(`/api/workspace/${workspace.groupId}/ranks`),
        ]);

        if (cancelled) return;

        if (configResponse.data.success) {
          setConfig({
            enabled: configResponse.data.value?.enabled === true,
            ranks: Array.isArray(configResponse.data.value?.ranks)
              ? configResponse.data.value.ranks
              : [],
          });
        }

        if (ranksResponse.data.success) {
          setRanks(Array.isArray(ranksResponse.data.ranks) ? ranksResponse.data.ranks : []);
        }
      } catch {
        if (!cancelled) {
          triggerToast.error('Failed to load recommendation settings.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [workspace.groupId, triggerToast]);

  const selectableRanks = useMemo(
    () => ranks.filter((rank) => rank.rank > 0 && rank.rank < 255),
    [ranks],
  );

  const save = async (next: RecommendationConfig) => {
    setSaving(true);

    try {
      const response = await axios.patch(
        `/api/workspace/${workspace.groupId}/settings/general/recommendations`,
        next,
      );

      if (response.status !== 200 || !response.data.success) {
        throw new Error('Failed to save recommendation settings.');
      }

      setConfig(next);
      triggerToast.success('Updated recommendation settings.');
    } catch {
      triggerToast.error('Failed to update recommendation settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleRank = (rank: number) => {
    const selected = config.ranks.includes(rank);

    setConfig((current) => ({
      ...current,
      ranks: selected
        ? current.ranks.filter((value) => value !== rank)
        : [...current.ranks, rank].sort((a, b) => a - b),
    }));
  };

  const updateEnabled = async () => {
    await save({
      ...config,
      enabled: !config.enabled,
    });
  };

  const saveRanks = async () => {
    await save(config);
  };

  return (
    <div className="px-5 py-5">
      <div className="flex items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <IconArrowUp size={18} className="text-primary" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Recommendations</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Allow selected Roblox ranks to recommend members for promotion.
            </p>
          </div>
        </div>

        <SwitchComponenet
          checked={config.enabled}
          onChange={updateEnabled}
          disabled={loading || saving}
          label=""
          classoverride="mt-0 shrink-0"
        />
      </div>

      {config.enabled && (
        <div className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
          <div className="mb-3">
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Eligible ranks</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              Members with these Roblox ranks can submit promotion recommendations.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Loading Roblox ranks...
            </div>
          ) : selectableRanks.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
              No Roblox ranks are available.
            </div>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {selectableRanks.map((rank) => {
                  const selected = config.ranks.includes(rank.rank);

                  return (
                    <button
                      key={rank.id}
                      type="button"
                      disabled={saving}
                      onClick={() => toggleRank(rank.rank)}
                      className={[
                        'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                        selected
                          ? 'border-primary/30 bg-primary/5 text-zinc-900 dark:border-primary/30 dark:bg-primary/10 dark:text-white'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                          selected
                            ? 'border-primary bg-primary text-white'
                            : 'border-zinc-300 dark:border-zinc-700',
                        ].join(' ')}
                      >
                        {selected && <IconCheck size={13} stroke={2.5} />}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{rank.name}</span>
                        <span className="block text-xs text-zinc-400">Rank {rank.rank}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {config.ranks.length === 0
                    ? 'No ranks selected.'
                    : `${config.ranks.length} rank${config.ranks.length === 1 ? '' : 's'} selected.`}
                </p>

                <button
                  type="button"
                  disabled={saving}
                  onClick={saveRanks}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save ranks'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

Recommendations.title = 'Recommendations';

export default Recommendations;
