import axios from "axios";
import React from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { FC } from '@/types/settingsComponent'
import { IconForms } from "@tabler/icons-react";

type props = {
  triggerToast: typeof toast;
}

const Forms: FC<props> = (props) => {
  const triggerToast = props.triggerToast;
  const [workspace, setWorkspace] = useRecoilState(workspacestate);

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <IconForms size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">Forms</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Create, customize, and manage workspace forms for collecting structured data, submissions, and user input across your workspace</p>
        </div>
      </div>
      <SwitchComponenet
        checked={workspace.settings?.policiesEnabled}
        label=""
        classoverride="mt-0"
      />
    </div>
  );
};

Forms.title = "Forms";

export default Forms;