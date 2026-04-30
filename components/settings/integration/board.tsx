import axios from "axios";
import React, { useEffect, useState, Fragment } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import SwitchComponenet from "@/components/switch";
import { workspacestate } from "@/state";
import { Dialog, Listbox, Transition } from "@headlessui/react";
import {
  IconCheck,
  IconChevronDown,
  IconAlertTriangle,
  IconCalendarTime,
  IconList,
  IconPodium,
  IconDownload,
  IconHistory,
} from "@tabler/icons-react";
import { useRouter } from "next/router";
import moment from "moment";
import clsx from "clsx";
import { FC } from "@/types/settingsComponent";

const sessionTypes = [
  { value: "shift", label: "Shift" },
  { value: "training", label: "Training" },
  { value: "event", label: "Event" },
  { value: "other", label: "Other" },
  { value: "all", label: "All" },
];

const listboxButtonClass = "w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-left text-sm font-medium text-zinc-900 dark:text-white hover:border-[color:rgb(var(--group-theme)/0.4)] focus:outline-none focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.3)]";
const listboxOptionsClass =
  "absolute left-0 z-50 mt-2 w-full min-w-[12rem] rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 shadow-lg py-1 overflow-auto max-h-60";
const listboxOptionClass = (active: boolean) => clsx("flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer text-sm", active ? "bg-[color:rgb(var(--group-theme)/0.1)] text-[color:rgb(var(--group-theme))]" : "text-zinc-700 dark:text-zinc-300");

function SettingField({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</p>
        {hint ? <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{hint}</p> : null}
      </div>
      {children}
    </div>
  )
}

type props = {
  triggerToast: typeof toast;
  hasResetActivityOnly?: boolean;
};

const Board: FC<props> = (props) => {
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [lightMode, setLightMode] = useState(false);
  const [globalFormat, setGlobalFormat] = useState(false);
  const [showClaimed, setShowClaimed] = useState(true);
  const [selectedSessionType, setSelectedSessionType] = useState<string>("shift");

  const downloadLoader = async () => {
    window.open(`/api/workspace/${workspace.groupId}/settings/integrations/board/download?event=${selectedSessionType}&gFormat=${globalFormat}&sClaimed=${showClaimed}&lightMode=${lightMode}`);
  };

  const cardClass =
    "rounded-2xl border border-zinc-200/90 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/30 shadow-sm overflow-visible"
  const cardHeaderClass = "px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80"

  return (
    <div className="relative z-15 mx-auto max-w-3xl space-y-6">
      <section className={cardClass}>
        <div className={clsx(cardHeaderClass, "bg-zinc-50/80 dark:bg-zinc-800/20")}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))]">
              <IconCalendarTime className="h-5 w-5" stroke={1.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Sessions Board</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Display upcoming sessions effortlessly with our session board.
              </p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800/80">
          <div className="pb-5">
            <SettingField
              label="Session type"
              hint="Select the type of session to display on the board."
            >
              <Listbox value={selectedSessionType} onChange={setSelectedSessionType} as="div" className="relative">
                <Listbox.Button className={listboxButtonClass}>
                  <span className="truncate">
                    {sessionTypes.find(t => t.value === selectedSessionType)?.label || "Select session type"}
                  </span>
                  <IconChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                </Listbox.Button>
                <Listbox.Options className={listboxOptionsClass}>
                  {sessionTypes.map((type) => (
                    <Listbox.Option
                      key={type.value}
                      value={type.value}
                      className={({ active }) => listboxOptionClass(active)}
                    >
                      {({ selected }) => (
                        <>
                          <span className={selected ? "font-semibold" : ""}>{type.label}</span>
                          {selected && <IconCheck className="w-4 h-4 text-[color:rgb(var(--group-theme))]" />}
                        </>
                      )}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Listbox>
            </SettingField>
          </div>
          <div className="pt-5 pb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Use light mode</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Tailor your board's look for the game's best fit</p>
              </div>
              <div className="flex items-center justify-end gap-2 shrink-0">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums w-12 text-right">{lightMode ? "On" : "Off"}</span>
                <SwitchComponenet checked={lightMode} onChange={() => setLightMode(!lightMode)} label="" />
              </div>
            </div>
          </div>
          <div className="pt-5 pb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Use 24h format</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Set to which format you wanna see the time.</p>
              </div>
              <div className="flex items-center justify-end gap-2 shrink-0">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums w-12 text-right">{globalFormat ? "On" : "Off"}</span>
                <SwitchComponenet checked={globalFormat} onChange={() => setGlobalFormat(!globalFormat)} label="" />
              </div>
            </div>
          </div>
          <div className="pt-5 pb-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Only show claimed sessions</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">If enabled, it'll only show claimed sessions</p>
              </div>
              <div className="flex items-center justify-end gap-2 shrink-0">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums w-12 text-right">{showClaimed ? "On" : "Off"}</span>
                <SwitchComponenet checked={showClaimed} onChange={() => setShowClaimed(!showClaimed)} label="" />
              </div>
            </div>
          </div>
          <div className="pt-5">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Download Board</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-3">Once you feel the board is ready, download it and see the upcoming sessions</p>
            <button
              type="button"
              onClick={downloadLoader}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[color:rgb(var(--group-theme))] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            >
              <IconDownload className="h-4 w-4" stroke={1.5} />
              Download Board
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

Board.title = "Sessions Board";

export default Board;
