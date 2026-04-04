import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useState, Fragment, useMemo, useEffect } from "react";
import randomText from "@/utils/randomText";
import { useRecoilState } from "recoil";
import toast, { Toaster } from "react-hot-toast";
import { InferGetServerSidePropsType } from "next";
import { withSessionSsr } from "@/lib/withSession";
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
  IconArrowLeft,
} from "@tabler/icons-react";

type Form = {
  group: string;
  notes: string;
};

export const getServerSideProps = withPermissionCheckSsr(
  async ({ req, res, params }) => {
    let users = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            workspaceGroupId: parseInt(params?.id as string),
            permissions: {
              has: "represent_alliance",
            },
          },
        },
      },
    });
    const infoUsers: any = await Promise.all(
      users.map(async (user: any) => {
        return {
          ...user,
          userid: Number(user.userid),
          thumbnail: getThumbnail(user.userid),
        };
      })
    );

    const allies: any = await prisma.ally.findMany({
      where: {
        workspaceGroupId: parseInt(params?.id as string),
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

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    if (checked) {
      setReps([...reps, value]);
    } else {
      setReps(reps.filter((r) => r !== value));
    }
  };

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

  return (
    <>
      <Toaster position="bottom-center" />

      <div className="pagePadding">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Alliances
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage and view your group's alliances with other communities
            </p>
          </header>

          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center">
                <IconUsers className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                  Allies
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Your group's alliance partners
                </p>
              </div>
            </div>
            {canManageAlliances && (
              <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
              >
                <IconPlus className="w-4 h-4" />
                New alliance
              </button>
            )}
          </div>

          {allies.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-12 text-center max-w-md mx-auto">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mb-4">
                <IconClipboardList className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
                No alliances yet
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Create your first alliance to connect with another community.
              </p>
              {canManageAlliances && (
                <button
                  onClick={() => setIsOpen(true)}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <IconPlus className="w-4 h-4" />
                  New alliance
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {allies.map((ally: any) => (
                <div
                  key={ally.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 p-5 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1 flex items-start gap-4">
                    <img
                      src={ally.icon}
                      alt={ally.name}
                      className="w-12 h-12 rounded-xl shrink-0 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                        {ally.name}
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Group ID: {ally.groupId}
                      </p>
                      {ally.reps?.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {ally.reps.map((rep: any) => (
                            <Tooltip
                              key={rep.userid}
                              orientation="top"
                              tooltipText={rep.username}
                            >
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${getRandomBg(
                                  rep.userid
                                )} ring-2 ring-white dark:ring-zinc-800`}
                              >
                                <img
                                  src={rep.thumbnail}
                                  className="w-full h-full object-cover"
                                  alt={rep.username}
                                />
                              </div>
                            </Tooltip>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {canManageSpecificAlly(ally) && (
                      <button
                        onClick={() =>
                          router.push(
                            `/workspace/${id}/alliances/manage/${ally.id}`
                          )
                        }
                        className="px-4 py-2 text-sm font-medium rounded-xl bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                      >
                        Manage
                      </button>
                    )}
                    {canManageAlliances && (
                      <button
                        onClick={() => {
                          setAllyToDelete({ id: ally.id, name: ally.name });
                          setShowDeleteModal(true);
                        }}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        aria-label="Delete alliance"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-semibold text-zinc-900 dark:text-white"
                  >
                    Create alliance
                  </Dialog.Title>

                  <div className="mt-4">
                    <FormProvider {...form}>
                      <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="space-y-4">
                          <Input
                            label="Group ID"
                            type="number"
                            {...register("group", { required: true })}
                          />
                          <Input
                            textarea
                            label="Notes"
                            {...register("notes")}
                          />
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Representatives
                            </label>
                            {users.length < 1 ? (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                No users with rep permissions yet
                              </p>
                            ) : (
                              <>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                                  {reps.length} selected (minimum 1)
                                </p>
                                <div className="space-y-2 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-600 p-2">
                                  {users.map((user: any) => (
                                    <label
                                      key={user.userid}
                                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
                                    >
                                      <input
                                        type="checkbox"
                                        value={user.userid}
                                        onChange={handleCheckboxChange}
                                        className="rounded border-zinc-300 text-primary focus:ring-primary dark:border-zinc-600"
                                      />
                                      <div
                                        className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${getRandomBg(
                                          user.userid
                                        )}`}
                                      >
                                        <img
                                          src={user.thumbnail}
                                          className="w-full h-full object-cover"
                                          alt={user.username}
                                        />
                                      </div>
                                      <span className="text-sm text-zinc-900 dark:text-white">
                                        {user.username}
                                      </span>
                                    </label>
                                  ))}
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
                      className="flex-1 justify-center rounded-xl bg-zinc-100 dark:bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
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
              <div className="fixed inset-0 bg-black/70" />
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
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all border border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="shrink-0 w-11 h-11 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                        <IconTrash className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold text-zinc-900 dark:text-white"
                      >
                        Delete alliance
                      </Dialog.Title>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Are you sure you want to delete{" "}
                      <span className="font-semibold text-zinc-900 dark:text-white">
                        {allyToDelete.name}
                      </span>
                      ? This can't be undone.
                    </p>
                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        className="flex-1 justify-center rounded-xl bg-zinc-100 dark:bg-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                        onClick={() => setShowDeleteModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="flex-1 justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
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
