import { Dialog, Transition, RadioGroup } from "@headlessui/react";
import { Fragment, useState } from "react";
import { IconCalendarRepeat, IconCalendar, IconCalendarEvent, IconX } from "@tabler/icons-react";

interface PatternEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: "single" | "future" | "all") => void;
  session: any;
}

export default function PatternEditDialog({
  isOpen,
  onClose,
  onConfirm,
  session,
}: PatternEditDialogProps) {
  const [selectedScope, setSelectedScope] = useState<"single" | "future" | "all">("single");

  const handleConfirm = () => {
    onConfirm(selectedScope);
    onClose();
  };

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const sessionDate = new Date(session.date);
  const dayOfWeek = dayNames[sessionDate.getDay()];
  const timeString = sessionDate.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <IconCalendarRepeat className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold text-zinc-900 dark:text-white"
                      >
                        Edit Recurring Session
                      </Dialog.Title>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {session.name} • {dayOfWeek} at {timeString}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    This session is part of a recurring pattern. What would you like to edit?
                  </p>

                  <RadioGroup value={selectedScope} onChange={setSelectedScope}>
                    <div className="space-y-3">
                      <RadioGroup.Option value="single">
                        {({ checked }) => (
                          <div
                            className={`cursor-pointer rounded-lg p-4 transition-all ${
                              checked
                                ? "bg-primary/10 border-2 border-primary"
                                : "bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 ${checked ? "text-primary" : "text-zinc-400"}`}>
                                <IconCalendar className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-zinc-900 dark:text-white">
                                    Only this session
                                  </span>
                                  {checked && (
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                  Edit only the session on {sessionDate.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </RadioGroup.Option>

                      <RadioGroup.Option value="future">
                        {({ checked }) => (
                          <div
                            className={`cursor-pointer rounded-lg p-4 transition-all ${
                              checked
                                ? "bg-primary/10 border-2 border-primary"
                                : "bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 ${checked ? "text-primary" : "text-zinc-400"}`}>
                                <IconCalendarEvent className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-zinc-900 dark:text-white">
                                    This and future {dayOfWeek}s
                                  </span>
                                  {checked && (
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                  Edit all future sessions on {dayOfWeek} at {timeString}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </RadioGroup.Option>

                      <RadioGroup.Option value="all">
                        {({ checked }) => (
                          <div
                            className={`cursor-pointer rounded-lg p-4 transition-all ${
                              checked
                                ? "bg-primary/10 border-2 border-primary"
                                : "bg-zinc-50 dark:bg-zinc-800 border-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`mt-1 ${checked ? "text-primary" : "text-zinc-400"}`}>
                                <IconCalendarRepeat className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-zinc-900 dark:text-white">
                                    All sessions in pattern
                                  </span>
                                  {checked && (
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                  )}
                                </div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                  Edit all sessions at {timeString} across all selected days
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </RadioGroup.Option>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                  >
                    Continue
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
