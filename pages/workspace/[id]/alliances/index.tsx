import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useState, Fragment, useMemo, useEffect } from "react";
import randomText from "@/utils/randomText";
import { useRecoilState } from "recoil";
import toast from "react-hot-toast";
import { InferGetServerSidePropsType } from "next";
import { Dialog, Transition } from "@headlessui/react";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import Input from "@/components/input";
import prisma from "@/utils/database";
import { getUsername, getThumbnail } from "@/utils/userinfoEngine";
import Checkbox from "@/components/checkbox";
import Tooltip from "@/components/tooltip";
import {
  IconUsers,
  IconPlus,
  IconTrash,
  IconClipboardList,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import {
  AlliancesPageShell,
  AlliancesPageHeader,
  AlliancesPanel,
  AlliancesEmptyState,
  AlliancesSectionHeader,
  alliancePrimaryButtonClass,
  allianceSecondaryButtonClass,
  allianceFormInputOverride,
  allianceFormInputClass,
  allianceFormLabelClass,
  alliancesPanelShadow,
} from "@/components/alliances/shell";

type Form = {
  group: string;
  notes: string;
};

const REP_RESULT_LIMIT = 20;

export const getServerSideProps = withPermissionCheckSsr(
  async ({ req, res, params }) => {
    const wsId = parseInt(params?.id as string, 10);
    let users = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            workspaceGroupId: wsId,
            permissions: {
              has: "represent_alliance",
            },
          },
        },
      },
      orderBy: { username: "asc" },
    });
    const infoUsers: any = users.map((user: any) => ({
      userid: Number(user.userid),
      username: user.username,
      thumbnail: getThumbnail(user.userid),
      canRep: true,
    }));

    const allies: any = await prisma.ally.findMany({
      where: {
        workspaceGroupId: wsId,
      },
      include: {
        reps: true,
      },
    });
    const infoAllies = await Promise.all(
      allies.map(async (ally: any) => {
        const infoReps = await Promise.all(
          ally.reps.map(async (rep: any) => {
            return {
              ...rep,
              userid: Number(rep.userid),
              username: await getUsername(rep.userid),
              thumbnail: getThumbnail(rep.userid),
            };
          })
        );

        return {
          ...ally,
          reps: infoReps,
        };
      })
    );

    return {
      props: {
        infoUsers,
        infoAllies,
      },
    };
  }
);

type pageProps = InferGetServerSidePropsType<typeof getServerSideProps>;

const Allies: pageWithLayout<pageProps> = (props) => {
  const router = useRouter();
  const { id } = router.query;
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [login, setLogin] = useRecoilState(loginState);
  const [workspace] = useRecoilState(workspacestate);
  const text = useMemo(() => randomText(login.displayname), []);
  const canManageAlliances =
    workspace.yourPermission?.includes("create_alliances") || false;

  const isUserRep = (ally: any) => {
    if (!login.userId) return false;
    return ally.reps.some((rep: any) => rep.userid === Number(login.userId));
  };

  const canManageSpecificAlly = (ally: any) => {
    return canManageAlliances || isUserRep(ally);
  };

  const form = useForm<Form>();
  const { register, handleSubmit, setError, watch } = form;

  const toggleRole = async (role: string) => {
    const roles = selectedRoles;
    if (roles.includes(role)) {
      roles.splice(roles.indexOf(role), 1);
    } else {
      roles.push(role);
    }
    setSelectedRoles(roles);
  };

  const [reps, setReps] = useState<string[]>([]);
  const [repSearch, setRepSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    if (checked) {
      setReps([...reps, value]);
    } else {
      setReps(reps.filter((r) => r !== value));
    }
  };

  const openCreateModal = () => {
    setRepSearch("");
    setIsOpen(true);
  };

  useEffect(() => {
    const query = repSearch.trim();

    if (!query) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setSearching(true);
    setSearchResults(null);

    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(
          `/api/workspace/${id}/allies/rep-search`,
          { params: { q: query }, signal: controller.signal }
        );
        if (!cancelled) setSearchResults(res.data.users ?? []);
      } catch (error) {
        if (!cancelled && !axios.isCancel(error)) {
          console.error("Failed to search members:", error);
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [repSearch, id]);

  const onSubmit: SubmitHandler<Form> = async ({ group, notes }) => {
    const axiosPromise = axios
      .post(`/api/workspace/${id}/allies/new`, {
        groupId: group,
        notes: notes,
        reps: reps,
      })
      .then((req) => {
        router.reload();
      });
    toast.promise(axiosPromise, {
      loading: "Creating alliance...",
      success: () => {
        setIsOpen(false);
        return "Alliance created!";
      },
      error: "Alliance was not created.",
    });
  };

  const confirmDeleteAlly = async () => {
    if (!allyToDelete) return;

    const axiosPromise = axios
      .delete(`/api/workspace/${id}/allies/${allyToDelete.id}/delete`)
      .then((req) => {
        router.reload();
      });
    toast.promise(axiosPromise, {
      loading: "Deleting alliance...",
      success: () => {
        setShowDeleteModal(false);
        setAllyToDelete(null);
        return "Alliance deleted!";
      },
      error: "Failed to delete alliance.",
    });
  };

  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [allyToDelete, setAllyToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!showDeleteModal && allyToDelete) {
      const t = setTimeout(() => setAllyToDelete(null), 300);
      return () => clearTimeout(t);
    }
  }, [showDeleteModal, allyToDelete]);

  const BG_COLORS = [
    "bg-rose-300",
    "bg-lime-300",
    "bg-teal-200",
    "bg-amber-300",
    "bg-rose-200",
    "bg-lime-200",
    "bg-green-100",
    "bg-red-100",
    "bg-yellow-200",
    "bg-amber-200",
    "bg-emerald-300",
    "bg-green-300",
    "bg-red-300",
    "bg-emerald-200",
    "bg-green-200",
    "bg-red-200",
  ];

  function getRandomBg(userid: string, username?: string) {
    const key = `${userid ?? ""}:${username ?? ""}`;
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
    }
    const index = (hash >>> 0) % BG_COLORS.length;
    return BG_COLORS[index];
  }

  const colors = [
    "bg-red-500",
    "bg-yellow-500",
    "bg-green-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-purple-500",
    "bg-pink-500",
  ];

  const getRandomColor = () => {
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const allies: any = props.infoAllies;
  const users: any = props.infoUsers;

  const filteredUsers = useMemo(() => {
    const isSelected = (user: any) => reps.includes(String(user.userid));
    const pool = repSearch.trim() ? searchResults ?? [] : users;

    const selected = users.filter(isSelected);
    const rest = pool.filter((user: any) => !isSelected(user));

    return [...selected, ...rest].slice(0, REP_RESULT_LIMIT);
  }, [users, searchResults, reps, repSearch]);

  return (
    <>
      <AlliancesPageShell>
        <AlliancesPageHeader
          title="Alliances"
          subtitle="Manage and view your group's alliances with other communities"
          workspaceLabel={workspace.customName || workspace.groupName}
          action={
            canManageAlliances ? (
              <button
                type="button"
                onClick={openCreateModal}
                className={alliancePrimaryButtonClass}
              >
                <IconPlus className="h-4 w-4" />
                New alliance
              </button>
            ) : undefined
          }
        />

        <AlliancesSectionHeader
          icon={IconUsers}
          title="Allies"
          subtitle="Your group's alliance partners"
        />

        {allies.length === 0 ? (
          <AlliancesEmptyState
            icon={IconClipboardList}
            title="No alliances yet"
            description="Create your first alliance to connect with another community."
            action={
              canManageAlliances ? (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className={alliancePrimaryButtonClass}
                >
                  <IconPlus className="h-4 w-4" />
                  New alliance
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {allies.map((ally: any) => (
              <AlliancesPanel
                key={ally.id}
                className="flex items-start justify-between gap-4 p-5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <img
                    src={ally.icon}
                    alt={ally.name}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-zinc-100 dark:ring-zinc-800"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                      {ally.name}
                    </h3>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                      Group ID: {ally.groupId}
                    </p>
                    {ally.reps?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {ally.reps.map((rep: any) => (
                          <Tooltip
                            key={rep.userid}
                            orientation="top"
                            tooltipText={rep.username}
                          >
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ${getRandomBg(
                                rep.userid
                              )} ring-2 ring-white dark:ring-zinc-900`}
                            >
                              <img
                                src={rep.thumbnail}
                                className="h-full w-full object-cover"
                                alt={rep.username}
                              />
                            </div>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {canManageSpecificAlly(ally) && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/workspace/${id}/alliances/manage/${ally.id}`
                        )
                      }
                      className={allianceSecondaryButtonClass}
                    >
                      Manage
                    </button>
                  )}
                  {canManageAlliances && (
                    <button
                      type="button"
                      onClick={() => {
                        setAllyToDelete({ id: ally.id, name: ally.name });
                        setShowDeleteModal(true);
                      }}
                      className="rounded-xl p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                      aria-label="Delete alliance"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </AlliancesPanel>
            ))}
          </div>
        )}
      </AlliancesPageShell>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
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
                <Dialog.Panel
                  className={`w-full max-w-md overflow-hidden rounded-2xl bg-white p-5 text-left align-middle transition-all dark:bg-zinc-900 sm:p-6 ${alliancesPanelShadow}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <IconUsers className="h-5 w-5 text-primary" stroke={1.75} />
                    </div>
                    <div>
                      <Dialog.Title
                        as="h3"
                        className="text-base font-semibold text-zinc-900 dark:text-white"
                      >
                        Create alliance
                      </Dialog.Title>
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        Connect with another Roblox community
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <FormProvider {...form}>
                      <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-4">
                          <Input
                            label="Group ID"
                            type="number"
                            classoverride={allianceFormInputOverride}
                            {...register("group", { required: true })}
                          />
                          <Input
                            textarea
                            label="Notes"
                            classoverride={allianceFormInputOverride}
                            {...register("notes")}
                          />
                          <div>
                            <label className={allianceFormLabelClass}>
                              Representatives
                            </label>
                            {users.length < 1 ? (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                No members found in this workspace
                              </p>
                            ) : (
                              <>
                                <div className="relative mb-2">
                                  <IconSearch
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                                    stroke={1.75}
                                    aria-hidden="true"
                                  />
                                  <input
                                    type="text"
                                    value={repSearch}
                                    onChange={(e) => setRepSearch(e.target.value)}
                                    placeholder="Search members..."
                                    autoComplete="off"
                                    spellCheck={false}
                                    aria-label="Search members"
                                    className={`${allianceFormInputClass} !pl-9 !pr-9`}
                                  />
                                  {repSearch && (
                                    <button
                                      type="button"
                                      onClick={() => setRepSearch("")}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                                      aria-label="Clear search"
                                    >
                                      <IconX className="h-3.5 w-3.5" stroke={2} />
                                    </button>
                                  )}
                                </div>

                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    {reps.length} selected (minimum 1)
                                  </p>
                                  <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                    {searching
                                      ? "Searching…"
                                      : repSearch.trim()
                                        ? `${filteredUsers.length} shown`
                                        : `${users.length} available`}
                                  </p>
                                </div>

                                <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-zinc-50/80 p-2 dark:bg-zinc-800/40">
                                  {filteredUsers.map((user: any) => {
                                    const canRep = Boolean(user.canRep);

                                    return (
                                      <label
                                        key={user.userid}
                                        title={
                                          canRep
                                            ? undefined
                                            : "This user doesn't have permission to represent alliances"
                                        }
                                        className={`flex items-center gap-3 rounded-lg p-2 transition ${
                                          canRep
                                            ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                            : "cursor-not-allowed opacity-60"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          value={user.userid}
                                          disabled={!canRep}
                                          checked={reps.includes(String(user.userid))}
                                          onChange={handleCheckboxChange}
                                          className="rounded border-zinc-300 text-primary focus:ring-primary disabled:cursor-not-allowed dark:border-zinc-600"
                                        />
                                        <div
                                          className={`flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full ${getRandomBg(
                                            user.userid
                                          )}`}
                                        >
                                          <img
                                            src={user.thumbnail}
                                            className="h-full w-full object-cover"
                                            alt={user.username}
                                          />
                                        </div>
                                        <span className="min-w-0 flex-1 truncate text-sm text-zinc-900 dark:text-white">
                                          {user.username}
                                        </span>
                                        {!canRep && (
                                          <span className="shrink-0 rounded-md bg-zinc-200/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-700/60 dark:text-zinc-400">
                                            Can&apos;t rep
                                          </span>
                                        )}
                                      </label>
                                    );
                                  })}

                                  {searching && filteredUsers.length === 0 && (
                                    <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                      Searching…
                                    </p>
                                  )}

                                  {!searching && filteredUsers.length === 0 && (
                                    <p className="py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                      {repSearch.trim()
                                        ? `No members match “${repSearch}”`
                                        : "No users can represent alliances yet"}
                                    </p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <input type="submit" className="hidden" />
                      </form>
                    </FormProvider>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      className={`${allianceSecondaryButtonClass} flex-1 justify-center`}
                      onClick={() => setIsOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={`${alliancePrimaryButtonClass} flex-1 justify-center`}
                      onClick={handleSubmit(onSubmit)}
                    >
                      Create
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {allyToDelete && (
        <Transition appear show={showDeleteModal} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setShowDeleteModal(false)}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel
                    className={`w-full max-w-md overflow-hidden rounded-2xl bg-white p-5 text-left align-middle transition-all dark:bg-zinc-900 sm:p-6 ${alliancesPanelShadow}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15">
                        <IconTrash className="h-5 w-5 text-red-600 dark:text-red-400" stroke={1.75} />
                      </div>
                      <div>
                        <Dialog.Title
                          as="h3"
                          className="text-base font-semibold text-zinc-900 dark:text-white"
                        >
                          Delete alliance
                        </Dialog.Title>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                          Are you sure you want to delete{" "}
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            {allyToDelete.name}
                          </span>
                          ? This can't be undone.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        className={`${allianceSecondaryButtonClass} flex-1 justify-center`}
                        onClick={() => setShowDeleteModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="inline-flex flex-1 items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                        onClick={confirmDeleteAlly}
                      >
                        Delete
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      )}
    </>
  );
};

Allies.layout = workspace;

export default Allies;
