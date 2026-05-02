import axios from "axios";
import { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import type toast from "react-hot-toast";
import { FC } from "@/types/settingsComponent";
import { IconBolt } from "@tabler/icons-react";
import {
  ALLIANCE_STRIKES_DEFAULT_MAX,
  ALLIANCE_STRIKES_MIN,
  ALLIANCE_STRIKES_SETTING_MAX,
} from "@/utils/allianceStrikesConfig";

type props = {
  triggerToast: typeof toast;
};

const Other: FC<props> = ({ triggerToast }) => {
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const initial = workspace.settings?.allianceMaxStrikes ?? ALLIANCE_STRIKES_DEFAULT_MAX;
  const [maxStrikes, setMaxStrikes] = useState(initial);

  useEffect(() => {
    setMaxStrikes(workspace.settings?.allianceMaxStrikes ?? ALLIANCE_STRIKES_DEFAULT_MAX);
  }, [workspace.settings?.allianceMaxStrikes]);

  const save = async () => {
    const v = Math.min(
      ALLIANCE_STRIKES_SETTING_MAX,
      Math.max(
        ALLIANCE_STRIKES_MIN,
        parseInt(String(maxStrikes), 10) || ALLIANCE_STRIKES_DEFAULT_MAX,
      ),
    );
    try {
      const res = await axios.patch(
        `/api/workspace/${workspace.groupId}/settings/general/alliance-strikes`,
        { maxStrikes: v },
      );
      if (res.status !== 200 || !res.data?.success) throw new Error();
      const next = typeof res.data.maxStrikes === "number" ? res.data.maxStrikes : v;
      const obj = JSON.parse(JSON.stringify(workspace), (key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      );
      obj.settings.allianceMaxStrikes = next;
      setWorkspace(obj);
      setMaxStrikes(next);
      triggerToast.success("Alliance strike limit saved");
    } catch {
      triggerToast.error("Could not save settings");
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-600 dark:bg-zinc-900/40">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <IconBolt className="h-5 w-5 text-primary" stroke={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-white">Alliance strike limit</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Caps how many strikes each alliance can hold. The alliance page shows one meter segment per strike (between{" "}
            {ALLIANCE_STRIKES_MIN} and {ALLIANCE_STRIKES_SETTING_MAX}).
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Max strikes
              </label>
              <input
                type="number"
                min={ALLIANCE_STRIKES_MIN}
                max={ALLIANCE_STRIKES_SETTING_MAX}
                value={maxStrikes}
                onChange={(e) => setMaxStrikes(Number(e.target.value))}
                className="w-28 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <button
              type="button"
              onClick={() => void save()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

Other.title = "Alliance strikes";

export default Other;
