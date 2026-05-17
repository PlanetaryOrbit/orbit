import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { getConfig } from "@/utils/configEngine";
import { useState, Fragment, useMemo, useRef, useEffect } from "react";
import randomText from "@/utils/randomText";
import { useRecoilState } from "recoil";
import toast from "react-hot-toast";
import Button from "@/components/button";
import { InferGetServerSidePropsType } from "next";
import { withSessionSsr } from "@/lib/withSession";
import moment from "moment";
import { Dialog, Transition } from "@headlessui/react";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import Input from "@/components/input";
import prisma, { inactivityNotice } from "@/utils/database";
import { getUsername, getThumbnail } from "@/utils/userinfoEngine";
import Image from "next/image";
import Checkbox from "@/components/checkbox";
import Tooltip from "@/components/tooltip";
import {
  IconUsers,
  IconPlus,
  IconTrash,
  IconPencil,
  IconCalendar,
  IconClipboardList,
  IconArrowLeft,
  IconBrandDiscord,
  IconUserCheck,
  IconEdit,
  IconExternalLink,
  IconBolt,
  IconAlertTriangle,
  IconMinus,
} from "@tabler/icons-react";
import {
  ALLIANCE_STRIKES_DEFAULT_MAX,
  normalizeAllianceMaxStrikes,
} from "@/utils/allianceStrikesConfig";

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

    const ally: any = await prisma.ally.findUnique({
      where: {
        id: String(params?.aid),
      },
      include: {
        reps: true,
      },
    });

    if (ally == null) {
      res.writeHead(302, {
        Location: `/workspace/${params?.id}/alliances`,
      });
      res.end();
      return;
    }

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

    const infoAlly = {
      ...ally,
      reps: infoReps,
      terminationEffectiveDate:
        ally.terminationEffectiveDate != null
          ? new Date(ally.terminationEffectiveDate).toISOString()
          : null,
    };
    const eligibleIds = new Set(infoUsers.map((u: any) => Number(u.userid)));
    const repIds = new Set(infoReps.map((r: any) => Number(r.userid)));
    const allDbIdsRaw = await prisma.user.findMany({
      select: { userid: true },
    });
    const extraIds = allDbIdsRaw
      .map((u: any) => Number(u.userid))
      .filter((id: number) => !eligibleIds.has(id) && !repIds.has(id));
    const missingReps = infoReps.filter(
      (r: any) => !eligibleIds.has(Number(r.userid))
    );
    // @ts-ignore
    const visits = await prisma.allyVisit.findMany({
      where: {
        // @ts-ignore
        allyId: params?.aid,
      },
    });

    const infoVisits = await Promise.all(
      visits.map(async (visit: any) => {
        return {
          ...visit,
          hostId: Number(visit.hostId),
          hostUsername: await getUsername(visit.hostId),
          hostThumbnail: getThumbnail(visit.hostId),
          time: new Date(visit.time).toISOString(),
          participants: visit.participants
            ? visit.participants.map((p: bigint) => Number(p))
            : [],
        };
      })
    );

    const currentUserId = req.session?.userid;
    const isAllyRep = currentUserId
      ? infoReps.some((rep: any) => rep.userid === Number(currentUserId))
      : false;

    const currentUser = currentUserId
      ? await prisma.user.findFirst({
          where: {
            userid: BigInt(currentUserId),
          },
          include: {
            roles: {
              where: {
                workspaceGroupId: wsId,
              },
              orderBy: {
                isOwnerRole: "desc",
              },
            },
          },
        })
      : null;

    const hasManagePermissions =
      currentUser?.roles[0]?.isOwnerRole ||
      currentUser?.roles[0]?.permissions?.includes("create_alliances") ||
      false;

    const hasEditAllianceDetails =
      currentUser?.roles[0]?.isOwnerRole ||
      currentUser?.roles[0]?.permissions?.includes("edit_alliance_details") ||
      false;

    const hasAddNotes =
      currentUser?.roles[0]?.isOwnerRole ||
      currentUser?.roles[0]?.permissions?.includes("add_alliance_notes") ||
      false;

    const hasEditNotes =
      currentUser?.roles[0]?.isOwnerRole ||
      currentUser?.roles[0]?.permissions?.includes("edit_alliance_notes") ||
      false;

    const hasDeleteNotes =
      currentUser?.roles[0]?.isOwnerRole ||
      currentUser?.roles[0]?.permissions?.includes("delete_alliance_notes") ||
      false;

    const hasAddVisits =
      currentUser?.roles[0]?.isOwnerRole ||
      currentUser?.roles[0]?.permissions?.includes("add_alliance_visits") ||
      false;

    const hasEditVisits =
      currentUser?.roles[0]?.isOwnerRole ||
      currentUser?.roles[0]?.permissions?.includes("edit_alliance_visits") ||
      false;

    const hasDeleteVisits =
      currentUser?.roles[0]?.isOwnerRole ||
      currentUser?.roles[0]?.permissions?.includes("delete_alliance_visits") ||
      false;

    const hasManageDiscipline =
      currentUser?.roles[0]?.isOwnerRole ||
      currentUser?.roles[0]?.permissions?.includes("edit_alliance_details") ||
      currentUser?.roles[0]?.permissions?.includes("delete_alliances") ||
      false;

    if (!isAllyRep && !hasManagePermissions) {
      res.writeHead(302, {
        Location: `/workspace/${params?.id}/alliances`,
      });
      res.end();
      return;
    }

    const strikeCfg = await getConfig("alliance_strikes", wsId);
    const allianceMaxStrikes = normalizeAllianceMaxStrikes(
      strikeCfg?.maxStrikes ?? ALLIANCE_STRIKES_DEFAULT_MAX,
    );

    return {
      props: {
        infoUsers,
        infoAlly,
        infoVisits,
        missingReps,
        canEditAllianceDetails: hasEditAllianceDetails,
        canAddNotes: hasAddNotes,
        canEditNotes: hasEditNotes,
        canDeleteNotes: hasDeleteNotes,
        canAddVisits: hasAddVisits,
        canEditVisits: hasEditVisits,
        canDeleteVisits: hasDeleteVisits,
        canManageDiscipline: hasManageDiscipline,
        allianceMaxStrikes,
      },
    };
  }
);

type Notes = {
  [key: string]: string;
};

type Rep = {
  userid: number;
};

type Visit = {
  name: string;
  time: Date;
  participants?: string[];
};

type EditVisit = {
  name: string;
  time: string;
  participants?: string[];
};

type pageProps = InferGetServerSidePropsType<typeof getServerSideProps>;
const ManageAlly: pageWithLayout<pageProps> = (props) => {
  const router = useRouter();
  const { id } = router.query;
  const [login, setLogin] = useRecoilState(loginState);
  const text = useMemo(() => randomText(login.displayname), []);
  const ally: any = props.infoAlly;
  const users: any = props.infoUsers;
  const visits: any = props.infoVisits;
  const canEditAllianceDetails: boolean = Boolean(props.canEditAllianceDetails);
  const canAddNotes: boolean = Boolean(props.canAddNotes);
  const canEditNotes: boolean = Boolean(props.canEditNotes);
  const canDeleteNotes: boolean = Boolean(props.canDeleteNotes);
  const canAddVisits: boolean = Boolean(props.canAddVisits);
  const canEditVisits: boolean = Boolean(props.canEditVisits);
  const canDeleteVisits: boolean = Boolean(props.canDeleteVisits);
  const canManageDiscipline: boolean = Boolean(props.canManageDiscipline);

  const allianceMaxStrikes = normalizeAllianceMaxStrikes(
    props.allianceMaxStrikes ?? ALLIANCE_STRIKES_DEFAULT_MAX,
  );

  const strikesCount = Number(ally.strikes ?? 0);
  const meterFilled = Math.min(strikesCount, allianceMaxStrikes);

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

  const form = useForm();
  const { register, handleSubmit, setError, watch } = form;

  const [reps, setReps] = useState(
    ally.reps.map((u: any) => {
      return u.userid;
    })
  );

  const handleCheckboxChange = (event: any) => {
    const { value } = event.target;
    let numberVal = parseInt(value);
    if (reps.includes(numberVal)) {
      setReps(reps.filter((r: any) => r !== numberVal));
    } else {
      setReps([...reps, numberVal]);
    }
  };

  const saveNotes = async () => {
    const axiosPromise = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/notes`, { notes: notes })
      .then((req) => {
        setEditNotes([]);
        setNewNotes([]);
      });
    toast.promise(axiosPromise, {
      loading: "Updating notes...",
      success: () => {
        return "Notes updated!";
      },
      error: "Notes were not saved due to an unknown error.",
    });
  };

  const saveAllianceInfo = async () => {
    const filteredTheirReps = theirReps.filter((rep: string) => rep.trim());

    const allianceInfoPromise = axios.post(
      `/api/workspace/${id}/allies/${ally.id}/update`,
      {
        discordServer: discordServer.trim(),
        ourReps: reps,
        theirReps: filteredTheirReps,
      }
    );

    const repsPromise = axios.patch(
      `/api/workspace/${id}/allies/${ally.id}/reps`,
      { reps: reps }
    );

    const dualPromise = Promise.all([allianceInfoPromise, repsPromise]).then(
      () => {
        setIsEditingInfo(false);
        router.reload();
      }
    );

    toast.promise(dualPromise, {
      loading: "Updating alliance information...",
      success: () => {
        return "Alliance information updated!";
      },
      error: "Alliance information was not saved due to an unknown error.",
    });
  };
  const [notes, setNotes] = useState(ally.notes || [""]);
  const [editNotes, setEditNotes] = useState<any[]>([]);
  const [newNotes, setNewNotes] = useState<number[]>([]);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [discordServer, setDiscordServer] = useState(ally.discordServer || "");
  const [theirReps, setTheirReps] = useState<string[]>(ally.theirReps || [""]);

  const updateReps = async () => {
    const axiosPromise = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/reps`, { reps: reps })
      .then((req) => {});
    toast.promise(axiosPromise, {
      loading: "Updating representatives...",
      success: () => {
        return "Representatives updated!";
      },
      error: "Representatives were unable to save.",
    });
  };

  const [termModalOpen, setTermModalOpen] = useState(false);
  const [termEffective, setTermEffective] = useState("");
  const [termReasonDraft, setTermReasonDraft] = useState("");
  const [strikeModalOpen, setStrikeModalOpen] = useState(false);
  const [strikeReasonDraft, setStrikeReasonDraft] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>(
    []
  );
  const [editSelectedParticipants, setEditSelectedParticipants] = useState<
    number[]
  >([]);

  const [editContent, setEditContent] = useState({
    name: "",
    time: "",
    id: "",
    participants: [] as number[],
  });

  const handleVisitChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: "name" | "time"
  ) => {
    setEditContent({ ...editContent, [field]: e.target.value });
    return true;
  };

  const handleVisitBlur = async () => {
    return true;
  };

  const handleNoteChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    index: number
  ) => {
    const newValue = e.target.value;
    let updateNote = [...notes];
    updateNote[index] = newValue;
    setNotes(updateNote);
    return true;
  };

  const addTheirRep = () => {
    setTheirReps([...theirReps, ""]);
  };

  const removeTheirRep = (index: number) => {
    setTheirReps(theirReps.filter((_, i) => i !== index));
  };

  const updateTheirRep = (index: number, value: string) => {
    const updated = [...theirReps];
    updated[index] = value;
    setTheirReps(updated);
  };

  const handleNoteBlur = async () => {
    return true;
  };

  const createNote = () => {
    const newNoteIndex = notes.length;
    setNotes([...notes, ""]);
    setEditNotes([...editNotes, newNoteIndex]);
    setNewNotes([...newNotes, newNoteIndex]);
  };

  const deleteNote = async (index: any) => {
    const noteClone = [...notes];
    noteClone.splice(index, 1);
    setNotes(noteClone);
    setNewNotes(newNotes.filter(i => i !== index).map(i => i > index ? i - 1 : i));

    const axiosPromise = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/notes`, { notes: noteClone })
      .then((req) => {
        setEditNotes([]);
      });
    toast.promise(axiosPromise, {
      loading: "Deleting note...",
      success: () => {
        return "Note deleted!";
      },
      error: "Note was not deleted due to an unknown error.",
    });
  };

  const noteEdit = (index: any) => {
    if (editNotes.includes(index)) {
      const newEdits = editNotes.filter((n) => n !== index);
      setEditNotes(newEdits);
    } else {
      setEditNotes([...editNotes, index]);
    }
  };
  const visitform = useForm<Visit>();
  const notesform = useForm<Notes>({
    defaultValues: notes.reduce((acc: Notes, note: string, index: number) => {
      acc[`note-${index}`] = note;
      return acc;
    }, {} as Notes),
  });

  const createVisit: SubmitHandler<Visit> = async ({ name, time }) => {
    const axiosPromise = axios
      .post(`/api/workspace/${id}/allies/${ally.id}/visits`, {
        name: name,
        time: time,
        participants: selectedParticipants,
      })
      .then((req) => {});
    toast.promise(axiosPromise, {
      loading: "Creating visit...",
      success: () => {
        setSelectedParticipants([]);
        router.reload();
        return "Visit created!";
      },
      error: "Visit was not created due to an unknown error.",
    });
  };

  const editVisit = async (
    visitId: any,
    visitName: any,
    visitTime: any,
    visitParticipants?: number[]
  ) => {
    const formattedTime = new Date(visitTime).toISOString().slice(0, 16);

    setEditContent({
      name: visitName,
      time: formattedTime,
      id: visitId,
      participants: visitParticipants || [],
    });
    setEditSelectedParticipants(visitParticipants || []);

    editform.reset({
      name: visitName,
      time: formattedTime,
    });

    setEditOpen(true);
  };

  const updateVisit = async () => {
    const formValues = editform.getValues();
    const axiosPromise = axios
      .patch(
        `/api/workspace/${id}/allies/${ally.id}/visits/${editContent.id}`,
        {
          name: formValues.name,
          time: formValues.time,
          participants: editSelectedParticipants,
        }
      )
      .then((req) => {});
    toast.promise(axiosPromise, {
      loading: "Updating visit...",
      success: () => {
        setEditSelectedParticipants([]);
        router.reload();
        return "Visit updated!";
      },
      error: "Visit was not updated due to an unknown error.",
    });
  };

  const deleteVisit = async (visitId: any) => {
    const axiosPromise = axios
      .delete(`/api/workspace/${id}/allies/${ally.id}/visits/${visitId}`)
      .then((req) => {});
    toast.promise(axiosPromise, {
      loading: "Deleting visit...",
      success: () => {
        router.reload();
        return "Visit deleted!";
      },
      error: "Visit was not deleted due to an unknown error.",
    });
  };

  const editform = useForm<EditVisit>({
    defaultValues: {
      name: editContent.name,
      time: editContent.time,
    },
  });

  const terminationMoment = ally.terminationEffectiveDate
    ? moment(ally.terminationEffectiveDate)
    : null;

  const patchStrikes = (
    next: number,
    opts?: { strikeReason?: string; onSuccess?: () => void },
  ) => {
    const cap = allianceMaxStrikes;
    const clamped = Math.min(cap, Math.max(0, Math.floor(next)));
    const payload: { strikes: number; strikeReason?: string } = { strikes: clamped };
    if (opts?.strikeReason !== undefined && clamped > strikesCount) {
      payload.strikeReason = opts.strikeReason.trim();
    }
    const req = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/discipline`, payload)
      .then(() => {
        opts?.onSuccess?.();
        router.reload();
      });
    toast.promise(req, {
      loading: "Saving strikes…",
      success: "Strike count updated",
      error: (e: any) => e?.response?.data?.error ?? "Could not update strikes",
    });
  };

  const openStrikeModal = () => {
    setStrikeReasonDraft("");
    setStrikeModalOpen(true);
  };

  const submitAddStrike = () => {
    const r = strikeReasonDraft.trim();
    if (r.length < 3) {
      toast.error("Enter a reason (at least 3 characters).");
      return;
    }
    patchStrikes(strikesCount + 1, {
      strikeReason: r,
      onSuccess: () => setStrikeModalOpen(false),
    });
  };

  const openTerminationModal = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setTermEffective(d.toISOString().slice(0, 16));
    setTermReasonDraft("");
    setTermModalOpen(true);
  };

  const submitTerminationSchedule = () => {
    const req = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/discipline`, {
        termination: {
          effectiveDate: new Date(termEffective).toISOString(),
          reason: termReasonDraft.trim(),
        },
      })
      .then(() => {
        setTermModalOpen(false);
        router.reload();
      });
    toast.promise(req, {
      loading: "Scheduling termination…",
      success: "Termination scheduled",
      error: "Could not schedule termination",
    });
  };

  const clearTermination = () => {
    const req = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/discipline`, { termination: null })
      .then(() => router.reload());
    toast.promise(req, {
      loading: "Removing schedule…",
      success: "Termination schedule cleared",
      error: "Could not clear termination",
    });
  };

  return (
    <>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium text-zinc-900 mb-4 dark:text-white"
                  >
                    Create New Visit
                  </Dialog.Title>

                  <div className="mt-2">
                    <FormProvider {...visitform}>
                      <form onSubmit={visitform.handleSubmit(createVisit)}>
                        <div className="space-y-4">
                          <Input
                            label="Visit Title"
                            {...visitform.register("name", { required: true })}
                          />
                          <Input
                            label="Visit Time"
                            type="datetime-local"
                            {...visitform.register("time", { required: true })}
                          />
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Participants
                            </label>
                            <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-600 rounded-lg p-2 bg-white dark:bg-zinc-700">
                              {users.map((user: any) => (
                                <label
                                  key={user.userid}
                                  className="flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-600 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedParticipants.includes(
                                      Number(user.userid)
                                    )}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedParticipants([
                                          ...selectedParticipants,
                                          Number(user.userid),
                                        ]);
                                      } else {
                                        setSelectedParticipants(
                                          selectedParticipants.filter(
                                            (id) => id !== Number(user.userid)
                                          )
                                        );
                                      }
                                    }}
                                    className="rounded border-zinc-300 text-primary focus:ring-primary"
                                  />
                                  <span className="text-sm text-zinc-900 dark:text-white">
                                    {user.username}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <input type="submit" className="hidden" />
                      </form>
                    </FormProvider>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      className="flex-1 justify-center rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                      onClick={visitform.handleSubmit(createVisit)}
                    >
                      Create Visit
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isEditOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setEditOpen(false)}
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium dark:text-white text-zinc-900 mb-4"
                  >
                    Edit Visit
                  </Dialog.Title>

                  <div className="mt-2">
                    <FormProvider {...editform}>
                      <form>
                        <div className="space-y-4">
                          <Input
                            label="Visit Title"
                            {...editform.register("name")}
                          />
                          <Input
                            label="Visit Time"
                            type="datetime-local"
                            {...editform.register("time")}
                          />
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Participants
                            </label>
                            <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-600 rounded-lg p-2 bg-white dark:bg-zinc-700">
                              {users.map((user: any) => (
                                <label
                                  key={user.userid}
                                  className="flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-600 rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={editSelectedParticipants.includes(
                                      Number(user.userid)
                                    )}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditSelectedParticipants([
                                          ...editSelectedParticipants,
                                          Number(user.userid),
                                        ]);
                                      } else {
                                        setEditSelectedParticipants(
                                          editSelectedParticipants.filter(
                                            (id) => id !== Number(user.userid)
                                          )
                                        );
                                      }
                                    }}
                                    className="rounded border-zinc-300 text-primary focus:ring-primary"
                                  />
                                  <span className="text-sm text-zinc-900 dark:text-white">
                                    {user.username}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <input type="submit" className="hidden" />
                      </form>
                    </FormProvider>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      className="flex-1 justify-center rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors"
                      onClick={() => setEditOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                      onClick={() => {
                        updateVisit();
                      }}
                    >
                      Update Visit
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={termModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setTermModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-xl transition-all dark:border-zinc-700 dark:bg-zinc-800">
                  <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                    <span className="rounded-lg bg-primary/10 p-1.5">
                      <IconCalendar className="h-5 w-5 text-primary" stroke={2} />
                    </span>
                    Schedule alliance termination
                  </Dialog.Title>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    Choose when this alliance ends and record why. Your workspace leads can clear this later if plans change.
                  </p>
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Effective date & time
                      </label>
                      <input
                        type="datetime-local"
                        value={termEffective}
                        onChange={(e) => setTermEffective(e.target.value)}
                        className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Reason
                      </label>
                      <textarea
                        value={termReasonDraft}
                        onChange={(e) => setTermReasonDraft(e.target.value)}
                        rows={4}
                        placeholder="Explain why this alliance is ending…"
                        className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      className="flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      onClick={() => setTermModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
                      onClick={() => submitTerminationSchedule()}
                    >
                      Confirm schedule
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={strikeModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setStrikeModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-xl transition-all dark:border-zinc-700 dark:bg-zinc-800">
                  <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                    <span className="rounded-lg bg-amber-500/10 p-1.5">
                      <IconAlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" stroke={2} />
                    </span>
                    Add strike
                  </Dialog.Title>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    You must give a reason. An automatic note will be appended to this alliance&apos;s notes when you confirm.
                  </p>
                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Reason
                      </label>
                      <textarea
                        value={strikeReasonDraft}
                        onChange={(e) => setStrikeReasonDraft(e.target.value)}
                        rows={4}
                        placeholder="Explain why this strike is being issued…"
                        className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        At least 3 characters required.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      className="flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                      onClick={() => setStrikeModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                      onClick={() => submitAddStrike()}
                    >
                      Confirm strike
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      <div className="pagePadding">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push(`/workspace/${id}/alliances`)}
              className="p-2 text-zinc-500 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <IconArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-medium text-zinc-900 dark:text-white">
              Alliances
            </h1>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <img
                  src={ally.icon}
                  className="w-16 h-16 rounded-full"
                  alt={`${ally.name} icon`}
                />
                <div className="flex-1">
                  <h2 className="text-xl font-medium text-zinc-900 dark:text-white">
                    {ally.name}
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Group ID: {ally.groupId}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ally.reps.map((rep: any) => (
                      <Tooltip
                        key={rep.userid}
                        orientation="top"
                        tooltipText={rep.username}
                      >
                        <div
                          className={`w-8 h-8 p-0.5 rounded-full flex items-center justify-center ${getRandomBg(
                            rep.userid
                          )} border-2 ${
                            (props as any).missingReps?.some(
                              (m: any) =>
                                Number(m.userid) === Number(rep.userid)
                            )
                              ? "border-amber-400 opacity-70"
                              : "border-white"
                          } hover:scale-110 transition-transform`}
                        >
                          <img
                            src={rep.thumbnail}
                            className="w-full h-full rounded-full object-cover"
                            alt={rep.username}
                            style={{ background: "transparent" }}
                          />
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                </div>
                <a
                  href={`https://www.roblox.com/groups/${ally.groupId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border border-zinc-300 bg-white text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 whitespace-nowrap self-start"
                >
                  <IconExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">View on Roblox</span>
                  <span className="sm:hidden">Roblox</span>
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mb-6 border border-zinc-100 dark:border-zinc-700">
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                  <IconBolt className="w-5 h-5 text-primary" stroke={2} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                    Standing & termination
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Track strikes and schedule an end date with a recorded reason.
                  </p>
                </div>
              </div>

              {terminationMoment && (
                <div
                  className={`mt-6 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    terminationMoment.isBefore(moment())
                      ? "border-red-200 bg-red-50 dark:border-red-500/35 dark:bg-red-950/25"
                      : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/20"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <IconAlertTriangle
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        terminationMoment.isBefore(moment())
                          ? "text-red-600 dark:text-red-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                      stroke={2}
                    />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {terminationMoment.isBefore(moment())
                          ? "Termination date reached"
                          : "Termination scheduled"}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">
                        Effective{" "}
                        <span className="font-medium">
                          {terminationMoment.format("MMM D, YYYY · h:mm A")}
                        </span>
                      </p>
                      {ally.terminationReason ? (
                        <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                          “{ally.terminationReason}”
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {canManageDiscipline && (
                    <button
                      type="button"
                      onClick={() => clearTermination()}
                      className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Clear schedule
                    </button>
                  )}
                </div>
              )}

              <div className="mt-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Strike meter
                </p>
                <div className="flex gap-1.5">
                  {Array.from({ length: allianceMaxStrikes }, (_, i) => (
                    <div
                      key={i}
                      className={`h-9 flex-1 rounded-lg transition-colors ${
                        i < meterFilled
                          ? "bg-primary shadow-sm"
                          : "border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/50"
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
                    {strikesCount}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    of {allianceMaxStrikes} allowed
                    {strikesCount > allianceMaxStrikes
                      ? " — above workspace cap; remove strikes or raise the limit under Settings → Other."
                      : ""}
                  </span>
                </div>
              </div>

              {canManageDiscipline && (
                <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                  <button
                    type="button"
                    disabled={strikesCount <= 0}
                    onClick={() => patchStrikes(strikesCount - 1)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <IconMinus className="h-4 w-4" stroke={2} />
                    Remove strike
                  </button>
                  <button
                    type="button"
                    disabled={strikesCount >= allianceMaxStrikes}
                    onClick={() => openStrikeModal()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IconBolt className="h-4 w-4" stroke={2} />
                    Add strike
                  </button>
                  {!terminationMoment && (
                    <button
                      type="button"
                      onClick={() => openTerminationModal()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 transition hover:bg-red-100 dark:border-red-500/40 dark:bg-red-950/35 dark:text-red-200 dark:hover:bg-red-950/50"
                    >
                      <IconCalendar className="h-4 w-4" stroke={2} />
                      Schedule termination
                    </button>
                  )}
                </div>
              )}
            </div>
            </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <IconUserCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                      Alliance Information
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Discord server and representative information
                    </p>
                  </div>
                </div>
                {canEditAllianceDetails && (
                  <button
                    onClick={() => setIsEditingInfo(!isEditingInfo)}
                    className="p-2 text-zinc-400 hover:text-primary transition-colors"
                  >
                    <IconEdit className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Discord Server
                </label>
                {isEditingInfo ? (
                  <input
                    type="text"
                    value={discordServer}
                    onChange={(e) => setDiscordServer(e.target.value)}
                    placeholder="https://discord.gg/..."
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {discordServer ? (
                      <>
                        <IconBrandDiscord className="w-5 h-5 text-indigo-500" />
                        <a
                          href={
                            discordServer.startsWith("http://") ||
                            discordServer.startsWith("https://")
                              ? discordServer
                              : `https://${discordServer}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 underline"
                        >
                          {discordServer}
                        </a>
                      </>
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400 italic">
                        No Discord server set
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Our Representatives
                </label>
                {isEditingInfo ? (
                  <>
                    <p className="text-sm text-zinc-500 mb-2">
                      {reps.length} Reps Selected (Minimum 1)
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {users.map((user: any) => (
                        <label
                          key={user.userid}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            value={user.userid}
                            checked={reps.includes(user.userid)}
                            onChange={handleCheckboxChange}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${getRandomBg(
                              user.userid
                            )} overflow-hidden`}
                          >
                            <img
                              src={user.thumbnail}
                              className="w-full h-full object-cover"
                              alt={user.username}
                              style={{ background: "transparent" }}
                            />
                          </div>
                          <span className="text-sm text-zinc-900 dark:text-white">
                            {user.username}
                          </span>
                        </label>
                      ))}

                      {(props as any).missingReps
                        ?.filter((m: any) => reps.includes(Number(m.userid)))
                        .map((m: any) => (
                          <label
                            key={`missing-${m.userid}`}
                            className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              value={m.userid}
                              checked={reps.includes(Number(m.userid))}
                              onChange={handleCheckboxChange}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${getRandomBg(
                                String(m.userid)
                              )} overflow-hidden opacity-70`}
                            >
                              <img
                                src={m.thumbnail || "/default-avatar.jpg"}
                                className="w-full h-full object-cover"
                                alt={m.username}
                                style={{ background: "transparent" }}
                                onError={(e) =>
                                  (e.currentTarget.src = "/default-avatar.jpg")
                                }
                              />
                            </div>
                            <span className="text-sm text-zinc-900 dark:text-white">
                              {m.username}
                              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                (not in workspace)
                              </span>
                            </span>
                          </label>
                        ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    {ally.reps && ally.reps.length > 0 ? (
                      ally.reps.map((rep: any, index: number) => (
                        <div
                          key={`rep-${index}`}
                          className="text-sm text-zinc-700 dark:text-zinc-300"
                        >
                          • {rep.username}
                          {(props as any).missingReps?.some(
                            (m: any) => Number(m.userid) === Number(rep.userid)
                          ) && (
                            <span className="ml-2 text-xs text-amber-500">
                              (not in workspace)
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400 italic">
                        No representatives assigned
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Their Representatives
                  </label>
                  {isEditingInfo && (
                    <button
                      onClick={addTheirRep}
                      className="text-primary hover:text-primary/80"
                    >
                      <IconPlus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {isEditingInfo ? (
                  <div className="space-y-2">
                    {theirReps.map((rep, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={rep}
                          onChange={(e) =>
                            updateTheirRep(index, e.target.value)
                          }
                          placeholder="Roblox username"
                          className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                        <button
                          onClick={() => removeTheirRep(index)}
                          className="p-2 text-red-400 hover:text-red-500"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {theirReps.length === 0 && (
                      <button
                        onClick={addTheirRep}
                        className="w-full py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-500 dark:text-zinc-400 hover:border-primary hover:text-primary transition-colors"
                      >
                        Add their representative
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {theirReps.filter((rep) => rep.trim()).length > 0 ? (
                      theirReps
                        .filter((rep) => rep.trim())
                        .map((rep, index) => (
                          <div
                            key={index}
                            className="text-sm text-zinc-700 dark:text-zinc-300"
                          >
                            • {rep}
                          </div>
                        ))
                    ) : (
                      <span className="text-zinc-500 dark:text-zinc-400 italic">
                        No representatives listed
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isEditingInfo && (
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => {
                      setIsEditingInfo(false);
                      setDiscordServer(ally.discordServer || "");
                      setTheirReps(ally.theirReps || [""]);
                      setReps(ally.reps.map((r: any) => r.userid));
                    }}
                    className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveAllianceInfo}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
            </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <IconClipboardList className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                      Notes
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Keep track of additional information
                    </p>
                  </div>
                </div>
                {canAddNotes && (
                  <button
                    onClick={() => createNote()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <IconPlus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Note</span>
                  </button>
                )}
              </div>

              {notes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-zinc-50 dark:bg-zinc-700 rounded-xl p-6 max-w-md mx-auto">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <IconClipboardList className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                      No Notes
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      You haven't added any notes yet
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note: any, index: any) => (
                    <div
                      key={index}
                      className="bg-zinc-50 dark:bg-zinc-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <p
                          className={`text-sm text-zinc-700 dark:text-white ${
                            editNotes.includes(index) ? "hidden" : null
                          }`}
                        >
                          {notes[index]}
                        </p>
                        {((canEditNotes || (canAddNotes && newNotes.includes(index))) || canDeleteNotes) && (
                          <div className="flex items-center gap-2">
                            {(canEditNotes || (canAddNotes && newNotes.includes(index))) && (
                              <button
                                onClick={() => noteEdit(index)}
                                className="p-1 text-zinc-400 hover:text-primary transition-colors"
                              >
                                <IconPencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDeleteNotes && (
                              <button
                                onClick={() => deleteNote(index)}
                                className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                              >
                                <IconTrash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div
                        className={editNotes.includes(index) ? "" : "hidden"}
                      >
                        <textarea
                          className="w-full p-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                          value={notes[index]}
                          onChange={(e) => handleNoteChange(e, index)}
                          onBlur={handleNoteBlur}
                          rows={3}
                          placeholder="Enter your note here..."
                        />
                      </div>
                    </div>
                  ))}
                  {(canAddNotes || canEditNotes) && (
                    <button
                      onClick={() => saveNotes()}
                      className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      Save Notes
                    </button>
                  )}
                </div>
              )}
            </div>
            </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <IconCalendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-white">
                      Visits
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Schedule and manage alliance visits
                    </p>
                  </div>
                </div>
                {canAddVisits && (
                  <button
                    onClick={() => setIsOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <IconPlus className="w-4 h-4" />
                    <span className="text-sm font-medium">New Visit</span>
                  </button>
                )}
              </div>

              {visits.length === 0 ? (
                <div className="text-center py-8">
                  <div className="rounded-xl p-6 max-w-md mx-auto">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      <IconCalendar className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-sm font-medium text-zinc-900 mb-1 dark:text-white">
                      No Visits
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      You haven't scheduled any visits yet
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {visits.map((visit: any) => (
                    <div
                      key={visit.id}
                      className="bg-zinc-50 dark:bg-zinc-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-medium dark:text-white text-zinc-900">
                            {visit.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-2">
                            <div
                              className={`w-6 h-6 p-0.5 rounded-full flex items-center justify-center ${getRandomBg(
                                visit.hostId
                              )} border-2 border-white`}
                            >
                              <img
                                src={visit.hostThumbnail}
                                className="w-full h-full rounded-full object-cover"
                                alt={visit.hostUsername}
                                style={{ background: "transparent" }}
                              />
                            </div>
                            <p className="text-xs dark:text-zinc-400 text-zinc-500">
                              Hosted by {visit.hostUsername}
                            </p>
                          </div>
                          <p className="text-xs dark:text-zinc-400 text-zinc-500 mt-1">
                            {new Date(visit.time).toLocaleDateString()} at{" "}
                            {new Date(visit.time)
                              .getHours()
                              .toString()
                              .padStart(2, "0")}
                            :
                            {new Date(visit.time)
                              .getMinutes()
                              .toString()
                              .padStart(2, "0")}
                          </p>
                          {visit.participants &&
                            visit.participants.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                  Participants ({visit.participants.length})
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {visit.participants
                                    .slice(0, 5)
                                    .map((participantId: number) => {
                                      const participant = users.find(
                                        (u: any) =>
                                          Number(u.userid) === participantId
                                      );
                                      return participant ? (
                                        <span
                                          key={participantId}
                                          className="text-xs bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded"
                                        >
                                          {participant.username}
                                        </span>
                                      ) : null;
                                    })}
                                  {visit.participants.length > 5 && (
                                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                      +{visit.participants.length - 5} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                        {(canEditVisits || canDeleteVisits) && (
                          <div className="flex items-center gap-1">
                            {canEditVisits && (
                              <button
                                onClick={() =>
                                  editVisit(
                                    visit.id,
                                    visit.name,
                                    visit.time,
                                    visit.participants
                                  )
                                }
                                className="p-1 text-zinc-400 hover:text-primary transition-colors"
                              >
                                <IconPencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDeleteVisits && (
                              <button
                                onClick={() => deleteVisit(visit.id)}
                                className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                              >
                                <IconTrash className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

ManageAlly.layout = workspace;

export default ManageAlly;
