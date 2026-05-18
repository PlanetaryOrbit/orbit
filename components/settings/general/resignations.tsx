import axios from "axios";
import React from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { FC } from "@/types/settingsComponent";
import { IconDoorExit } from "@tabler/icons-react";

type props = {
  triggerToast: typeof toast;
};

const ResignationsSettings: FC<props> = (props) => {
  const triggerToast = props.triggerToast;
  const [workspace, setWorkspace] = useRecoilState(workspacestate);

  const toggle = async () => {
    const res = await axios.patch(
      `/api/workspace/${workspace.groupId}/settings/general/resignations`,
      {
        enabled: !workspace.settings.resignationsEnabled,
      }
    );
    if (res.status === 200) {
      const obj = JSON.parse(JSON.stringify(workspace), (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      );
      obj.settings.resignationsEnabled = !workspace.settings.resignationsEnabled;
      setWorkspace(obj);
      triggerToast.success("Updated resignations!");
    } else {
      triggerToast.error("Failed to update resignations.");
    }
  };

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <IconDoorExit size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">
            Resignations
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Shows resignation requests on the Notices page
          </p>
        </div>
      </div>
      <SwitchComponenet
        checked={workspace.settings?.resignationsEnabled}
        onChange={toggle}
        label=""
        classoverride="mt-0"
      />
    </div>
  );
};

ResignationsSettings.title = "Resignations";

export default ResignationsSettings;
