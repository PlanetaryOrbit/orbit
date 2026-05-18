import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { getConfig } from "@/utils/configEngine";
import { useState, Fragment, useMemo } from "react";
import randomText from "@/utils/randomText";
import { useRecoilState } from "recoil";
import toast from "react-hot-toast";
import { InferGetServerSidePropsType } from "next";
import moment from "moment";
import { Dialog, Transition } from "@headlessui/react";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import Input from "@/components/input";
import prisma from "@/utils/database";
import { getUsername, getThumbnail } from "@/utils/userinfoEngine";
import Tooltip from "@/components/tooltip";
import {
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

    const users = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            workspaceGroupId: wsId,
            permissions: { has: "represent_alliance" },
          },
        },
      },
    });

    const infoUsers: any[] = await Promise.all(
      users.map(async (user: any) => ({
        ...user,
        userid: Number(user.userid),
        thumbnail: getThumbnail(user.userid),
      })),
    );

    const ally: any = await prisma.ally.findUnique({
      where: { id: String(params?.aid) },
      include: { reps: true },
    });

    if (ally == null) {
      return {
        redirect: {
          destination: `/workspace/${params?.id}/alliances`,
          permanent: false,
        },
      };
    }

    const infoReps = await Promise.all(
      ally.reps.map(async (rep: any) => ({
        ...rep,
        userid: Number(rep.userid),
        username: await getUsername(rep.userid),
        thumbnail: getThumbnail(rep.userid),
      })),
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
    const missingReps = infoReps.filter(
      (r: any) => !eligibleIds.has(Number(r.userid)),
    );

    // @ts-ignore
    const visits = await prisma.allyVisit.findMany({
      // @ts-ignore
      where: { allyId: params?.aid },
    });

    const infoVisits = await Promise.all(
      visits.map(async (visit: any) => ({
        ...visit,
        hostId: Number(visit.hostId),
        hostUsername: await getUsername(visit.hostId),
        hostThumbnail: getThumbnail(visit.hostId),
        time: new Date(visit.time).toISOString(),
        participants: visit.participants
          ? visit.participants.map((p: bigint) => Number(p))
          : [],
      })),
    );

    const currentUserId = (req as any).auth?.userId
    const isAllyRep = currentUserId
      ? infoReps.some((rep: any) => rep.userid === Number(currentUserId))
      : false;

    const currentUser = currentUserId
      ? await prisma.user.findFirst({
          where: { userid: BigInt(currentUserId) },
          include: {
            roles: {
              where: { workspaceGroupId: wsId },
              orderBy: { isOwnerRole: "desc" },
            },
          },
        })
      : null;

    const role = currentUser?.roles[0];
    const isOwner = role?.isOwnerRole ?? false;
    const perm = (p: string) => isOwner || role?.permissions?.includes(p) || false;

    const hasManagePermissions = perm("create_alliances");

    if (!isAllyRep && !hasManagePermissions) {
      return {
        redirect: {
          destination: `/workspace/${params?.id}/alliances`,
          permanent: false,
        },
      };
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
        canEditAllianceDetails: perm("edit_alliance_details"),
        canAddNotes: perm("add_alliance_notes"),
        canEditNotes: perm("edit_alliance_notes"),
        canDeleteNotes: perm("delete_alliance_notes"),
        canAddVisits: perm("add_alliance_visits"),
        canEditVisits: perm("edit_alliance_visits"),
        canDeleteVisits: perm("delete_alliance_visits"),
        canManageDiscipline: isOwner || perm("edit_alliance_details") || perm("delete_alliances"),
        allianceMaxStrikes,
      },
    };
  },
);

type AllyPageProps = InferGetServerSidePropsType<typeof getServerSideProps>;
type NoteMap = { [key: string]: string };
type VisitForm = { name: string; time: Date; participants?: string[] };
type EditVisitForm = { name: string; time: string; participants?: string[] };

const BG_COLORS = [
  "bg-rose-300","bg-lime-300","bg-teal-200","bg-amber-300","bg-rose-200",
  "bg-lime-200","bg-green-100","bg-red-100","bg-yellow-200","bg-amber-200",
  "bg-emerald-300","bg-green-300","bg-red-300","bg-emerald-200","bg-green-200",
  "bg-red-200",
];

function getRandomBg(userid: string | number, username?: string) {
  const key = `${userid ?? ""}:${username ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) ^ key.charCodeAt(i);
  }
  return BG_COLORS[(hash >>> 0) % BG_COLORS.length];
}


function CreateVisitModal({ isOpen, onClose, users, selectedParticipants, setSelectedParticipants, onSubmit }: {
  isOpen: boolean; onClose: () => void; users: any[];
  selectedParticipants: number[]; setSelectedParticipants: (v: number[]) => void;
  onSubmit: SubmitHandler<VisitForm>;
}) {
  const form = useForm<VisitForm>();
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium text-zinc-900 mb-4 dark:text-white">Create New Visit</Dialog.Title>
                <FormProvider {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                      <Input label="Visit Title" {...form.register("name", { required: true })} />
                      <Input label="Visit Time" type="datetime-local" {...form.register("time", { required: true })} />
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Participants</label>
                        <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-600 rounded-lg p-2 bg-white dark:bg-zinc-700">
                          {users.map((user: any) => (
                            <label key={user.userid} className="flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-600 rounded cursor-pointer">
                              <input type="checkbox" checked={selectedParticipants.includes(Number(user.userid))}
                                onChange={(e) => setSelectedParticipants(e.target.checked ? [...selectedParticipants, Number(user.userid)] : selectedParticipants.filter((id) => id !== Number(user.userid)))}
                                className="rounded border-zinc-300 text-primary focus:ring-primary" />
                              <span className="text-sm text-zinc-900 dark:text-white">{user.username}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <input type="submit" className="hidden" />
                  </form>
                </FormProvider>
                <div className="mt-6 flex gap-3">
                  <button type="button" className="flex-1 justify-center rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors" onClick={onClose}>Cancel</button>
                  <button type="button" className="flex-1 justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors" onClick={form.handleSubmit(onSubmit)}>Create Visit</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function EditVisitModal({ isOpen, onClose, users, editSelectedParticipants, setEditSelectedParticipants, onUpdate, form }: {
  isOpen: boolean; onClose: () => void; users: any[];
  editSelectedParticipants: number[]; setEditSelectedParticipants: (v: number[]) => void;
  onUpdate: () => void; form: ReturnType<typeof useForm<EditVisitForm>>;
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium dark:text-white text-zinc-900 mb-4">Edit Visit</Dialog.Title>
                <FormProvider {...form}>
                  <form>
                    <div className="space-y-4">
                      <Input label="Visit Title" {...form.register("name")} />
                      <Input label="Visit Time" type="datetime-local" {...form.register("time")} />
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Participants</label>
                        <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-600 rounded-lg p-2 bg-white dark:bg-zinc-700">
                          {users.map((user: any) => (
                            <label key={user.userid} className="flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-600 rounded cursor-pointer">
                              <input type="checkbox" checked={editSelectedParticipants.includes(Number(user.userid))}
                                onChange={(e) => setEditSelectedParticipants(e.target.checked ? [...editSelectedParticipants, Number(user.userid)] : editSelectedParticipants.filter((id) => id !== Number(user.userid)))}
                                className="rounded border-zinc-300 text-primary focus:ring-primary" />
                              <span className="text-sm text-zinc-900 dark:text-white">{user.username}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </form>
                </FormProvider>
                <div className="mt-6 flex gap-3">
                  <button type="button" className="flex-1 justify-center rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 transition-colors" onClick={onClose}>Cancel</button>
                  <button type="button" className="flex-1 justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors" onClick={onUpdate}>Update Visit</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function TerminationModal({ isOpen, onClose, termEffective, setTermEffective, termReasonDraft, setTermReasonDraft, onConfirm }: {
  isOpen: boolean; onClose: () => void; termEffective: string; setTermEffective: (v: string) => void;
  termReasonDraft: string; setTermReasonDraft: (v: string) => void; onConfirm: () => void;
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-xl transition-all dark:border-zinc-700 dark:bg-zinc-800">
                <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                  <span className="rounded-lg bg-primary/10 p-1.5"><IconCalendar className="h-5 w-5 text-primary" stroke={2} /></span>
                  Schedule alliance termination
                </Dialog.Title>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Choose when this alliance ends and record why. Your workspace leads can clear this later if plans change.</p>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Effective date & time</label>
                    <input type="datetime-local" value={termEffective} onChange={(e) => setTermEffective(e.target.value)} className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Reason</label>
                    <textarea value={termReasonDraft} onChange={(e) => setTermReasonDraft(e.target.value)} rows={4} placeholder="Explain why this alliance is ending…" className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white" />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button type="button" className="flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700" onClick={onClose}>Cancel</button>
                  <button type="button" className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onClick={onConfirm}>Confirm schedule</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function StrikeModal({ isOpen, onClose, strikeReasonDraft, setStrikeReasonDraft, onConfirm }: {
  isOpen: boolean; onClose: () => void; strikeReasonDraft: string;
  setStrikeReasonDraft: (v: string) => void; onConfirm: () => void;
}) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-xl transition-all dark:border-zinc-700 dark:bg-zinc-800">
                <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
                  <span className="rounded-lg bg-amber-500/10 p-1.5"><IconAlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" stroke={2} /></span>
                  Add strike
                </Dialog.Title>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">You must give a reason. An automatic note will be appended to this alliance&apos;s notes when you confirm.</p>
                <div className="mt-5">
                  <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Reason</label>
                  <textarea value={strikeReasonDraft} onChange={(e) => setStrikeReasonDraft(e.target.value)} rows={4} placeholder="Explain why this strike is being issued…" className="w-full resize-none rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white" />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">At least 3 characters required.</p>
                </div>
                <div className="mt-6 flex gap-3">
                  <button type="button" className="flex-1 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700" onClick={onClose}>Cancel</button>
                  <button type="button" className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700" onClick={onConfirm}>Confirm strike</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

function ManageAllyInner(props: AllyPageProps & { ally: any }) {
  const { ally } = props;
  const router = useRouter();
  const { id } = router.query;
  const [login] = useRecoilState(loginState);
  const text = useMemo(() => randomText(login.displayname), []);

  const users: any[] = (props.infoUsers as any) ?? [];
  const visits: any[] = (props.infoVisits as any) ?? [];

  const canEditAllianceDetails = Boolean(props.canEditAllianceDetails);
  const canAddNotes            = Boolean(props.canAddNotes);
  const canEditNotes           = Boolean(props.canEditNotes);
  const canDeleteNotes         = Boolean(props.canDeleteNotes);
  const canAddVisits           = Boolean(props.canAddVisits);
  const canEditVisits          = Boolean(props.canEditVisits);
  const canDeleteVisits        = Boolean(props.canDeleteVisits);
  const canManageDiscipline    = Boolean(props.canManageDiscipline);

  const allianceMaxStrikes = normalizeAllianceMaxStrikes(
    props.allianceMaxStrikes ?? ALLIANCE_STRIKES_DEFAULT_MAX,
  );
  const strikesCount = Number(ally.strikes ?? 0);
  const meterFilled  = Math.min(strikesCount, allianceMaxStrikes);
  const terminationMoment = ally.terminationEffectiveDate
    ? moment(ally.terminationEffectiveDate)
    : null;

  // ---- state ----
  const [notes,          setNotes]          = useState<string[]>(ally.notes || []);
  const [editNotes,      setEditNotes]      = useState<number[]>([]);
  const [newNotes,       setNewNotes]       = useState<number[]>([]);
  const [isEditingInfo,  setIsEditingInfo]  = useState(false);
  const [discordServer,  setDiscordServer]  = useState<string>(ally.discordServer || "");
  const [theirReps,      setTheirReps]      = useState<string[]>(ally.theirReps || [""]);
  const [reps,           setReps]           = useState<number[]>(ally.reps.map((u: any) => u.userid));

  const [termModalOpen,    setTermModalOpen]    = useState(false);
  const [termEffective,    setTermEffective]    = useState("");
  const [termReasonDraft,  setTermReasonDraft]  = useState("");
  const [strikeModalOpen,  setStrikeModalOpen]  = useState(false);
  const [strikeReasonDraft,setStrikeReasonDraft]= useState("");
  const [createVisitOpen,  setCreateVisitOpen]  = useState(false);
  const [editVisitOpen,    setEditVisitOpen]    = useState(false);
  const [selectedParticipants,     setSelectedParticipants]     = useState<number[]>([]);
  const [editSelectedParticipants, setEditSelectedParticipants] = useState<number[]>([]);
  const [editContent, setEditContent] = useState({ name: "", time: "", id: "", participants: [] as number[] });

  const editform = useForm<EditVisitForm>({
    defaultValues: { name: editContent.name, time: editContent.time },
  });

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setReps((prev) => prev.includes(val) ? prev.filter((r) => r !== val) : [...prev, val]);
  };

  const saveNotes = async () => {
    const promise = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/notes`, { notes })
      .then(() => { setEditNotes([]); setNewNotes([]); });
    toast.promise(promise, { loading: "Updating notes...", success: "Notes updated!", error: "Notes were not saved due to an unknown error." });
  };

  const saveAllianceInfo = async () => {
    const filteredTheirReps = theirReps.filter((r) => r.trim());
    const promise = Promise.all([
      axios.post(`/api/workspace/${id}/allies/${ally.id}/update`, { discordServer: discordServer.trim(), ourReps: reps, theirReps: filteredTheirReps }),
      axios.patch(`/api/workspace/${id}/allies/${ally.id}/reps`, { reps }),
    ]).then(() => { setIsEditingInfo(false); router.reload(); });
    toast.promise(promise, { loading: "Updating alliance information...", success: "Alliance information updated!", error: "Alliance information was not saved due to an unknown error." });
  };

  const createNote = () => {
    const idx = notes.length;
    setNotes((prev) => [...prev, ""]);
    setEditNotes((prev) => [...prev, idx]);
    setNewNotes((prev) => [...prev, idx]);
  };

  const deleteNote = async (index: number) => {
    const updated = notes.filter((_, i) => i !== index);
    setNotes(updated);
    setNewNotes((prev) => prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i)));
    const promise = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/notes`, { notes: updated })
      .then(() => setEditNotes([]));
    toast.promise(promise, { loading: "Deleting note...", success: "Note deleted!", error: "Note was not deleted due to an unknown error." });
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
    setNotes((prev) => { const n = [...prev]; n[index] = e.target.value; return n; });
  };

  const noteEdit = (index: number) => {
    setEditNotes((prev) => prev.includes(index) ? prev.filter((n) => n !== index) : [...prev, index]);
  };

  const patchStrikes = (next: number, opts?: { strikeReason?: string; onSuccess?: () => void }) => {
    const clamped = Math.min(allianceMaxStrikes, Math.max(0, Math.floor(next)));
    const payload: any = { strikes: clamped };
    if (opts?.strikeReason && clamped > strikesCount) payload.strikeReason = opts.strikeReason.trim();
    const req = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/discipline`, payload)
      .then(() => { opts?.onSuccess?.(); router.reload(); });
    toast.promise(req, { loading: "Saving strikes…", success: "Strike count updated", error: (e: any) => e?.response?.data?.error ?? "Could not update strikes" });
  };

  const submitAddStrike = () => {
    const r = strikeReasonDraft.trim();
    if (r.length < 3) { toast.error("Enter a reason (at least 3 characters)."); return; }
    patchStrikes(strikesCount + 1, { strikeReason: r, onSuccess: () => setStrikeModalOpen(false) });
  };

  const openTerminationModal = () => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    setTermEffective(d.toISOString().slice(0, 16));
    setTermReasonDraft("");
    setTermModalOpen(true);
  };

  const submitTerminationSchedule = () => {
    const req = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/discipline`, {
        termination: { effectiveDate: new Date(termEffective).toISOString(), reason: termReasonDraft.trim() },
      })
      .then(() => { setTermModalOpen(false); router.reload(); });
    toast.promise(req, { loading: "Scheduling termination…", success: "Termination scheduled", error: "Could not schedule termination" });
  };

  const clearTermination = () => {
    const req = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/discipline`, { termination: null })
      .then(() => router.reload());
    toast.promise(req, { loading: "Removing schedule…", success: "Termination schedule cleared", error: "Could not clear termination" });
  };

  const handleCreateVisit: SubmitHandler<VisitForm> = async ({ name, time }) => {
    const promise = axios
      .post(`/api/workspace/${id}/allies/${ally.id}/visits`, { name, time, participants: selectedParticipants })
      .then(() => {});
    toast.promise(promise, {
      loading: "Creating visit...",
      success: () => { setSelectedParticipants([]); router.reload(); return "Visit created!"; },
      error: "Visit was not created due to an unknown error.",
    });
  };

  const openEditVisit = (visitId: any, visitName: any, visitTime: any, visitParticipants?: number[]) => {
    const formattedTime = new Date(visitTime).toISOString().slice(0, 16);
    setEditContent({ name: visitName, time: formattedTime, id: visitId, participants: visitParticipants || [] });
    setEditSelectedParticipants(visitParticipants || []);
    editform.reset({ name: visitName, time: formattedTime });
    setEditVisitOpen(true);
  };

  const updateVisit = async () => {
    const { name, time } = editform.getValues();
    const promise = axios
      .patch(`/api/workspace/${id}/allies/${ally.id}/visits/${editContent.id}`, { name, time, participants: editSelectedParticipants })
      .then(() => {});
    toast.promise(promise, {
      loading: "Updating visit...",
      success: () => { setEditSelectedParticipants([]); router.reload(); return "Visit updated!"; },
      error: "Visit was not updated due to an unknown error.",
    });
  };

  const deleteVisit = async (visitId: any) => {
    const promise = axios.delete(`/api/workspace/${id}/allies/${ally.id}/visits/${visitId}`).then(() => {});
    toast.promise(promise, {
      loading: "Deleting visit...",
      success: () => { router.reload(); return "Visit deleted!"; },
      error: "Visit was not deleted due to an unknown error.",
    });
  };

  const addTheirRep    = () => setTheirReps((prev) => [...prev, ""]);
  const removeTheirRep = (i: number) => setTheirReps((prev) => prev.filter((_, idx) => idx !== i));
  const updateTheirRep = (i: number, value: string) => setTheirReps((prev) => { const u = [...prev]; u[i] = value; return u; });

  return (
    <>
      <CreateVisitModal isOpen={createVisitOpen} onClose={() => setCreateVisitOpen(false)} users={users} selectedParticipants={selectedParticipants} setSelectedParticipants={setSelectedParticipants} onSubmit={handleCreateVisit} />
      <EditVisitModal isOpen={editVisitOpen} onClose={() => setEditVisitOpen(false)} users={users} editSelectedParticipants={editSelectedParticipants} setEditSelectedParticipants={setEditSelectedParticipants} onUpdate={updateVisit} form={editform} />
      <TerminationModal isOpen={termModalOpen} onClose={() => setTermModalOpen(false)} termEffective={termEffective} setTermEffective={setTermEffective} termReasonDraft={termReasonDraft} setTermReasonDraft={setTermReasonDraft} onConfirm={submitTerminationSchedule} />
      <StrikeModal isOpen={strikeModalOpen} onClose={() => setStrikeModalOpen(false)} strikeReasonDraft={strikeReasonDraft} setStrikeReasonDraft={setStrikeReasonDraft} onConfirm={submitAddStrike} />

      <div className="pagePadding">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => router.push(`/workspace/${id}/alliances`)} className="p-2 text-zinc-500 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors">
              <IconArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-medium text-zinc-900 dark:text-white">Alliances</h1>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <img src={ally.icon} className="w-16 h-16 rounded-full" alt={`${ally.name} icon`} />
                <div className="flex-1">
                  <h2 className="text-xl font-medium text-zinc-900 dark:text-white">{ally.name}</h2>
                  <p className="text-sm text-zinc-500 mt-1">Group ID: {ally.groupId}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ally.reps.map((rep: any) => (
                      <Tooltip key={rep.userid} orientation="top" tooltipText={rep.username}>
                        <div className={`w-8 h-8 p-0.5 rounded-full flex items-center justify-center ${getRandomBg(rep.userid)} border-2 ${(props as any).missingReps?.some((m: any) => Number(m.userid) === Number(rep.userid)) ? "border-amber-400 opacity-70" : "border-white"} hover:scale-110 transition-transform`}>
                          <img src={rep.thumbnail} className="w-full h-full rounded-full object-cover" alt={rep.username} style={{ background: "transparent" }} />
                        </div>
                      </Tooltip>
                    ))}
                  </div>
                </div>
                <a href={`https://www.roblox.com/groups/${ally.groupId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border border-zinc-300 bg-white text-xs font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800 whitespace-nowrap self-start">
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
                <div className="bg-primary/10 p-2 rounded-lg shrink-0"><IconBolt className="w-5 h-5 text-primary" stroke={2} /></div>
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Standing & termination</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Track strikes and schedule an end date with a recorded reason.</p>
                </div>
              </div>

              {terminationMoment && (
                <div className={`mt-6 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${terminationMoment.isBefore(moment()) ? "border-red-200 bg-red-50 dark:border-red-500/35 dark:bg-red-950/25" : "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/20"}`}>
                  <div className="flex items-start gap-2.5">
                    <IconAlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${terminationMoment.isBefore(moment()) ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`} stroke={2} />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{terminationMoment.isBefore(moment()) ? "Termination date reached" : "Termination scheduled"}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">Effective <span className="font-medium">{terminationMoment.format("MMM D, YYYY · h:mm A")}</span></p>
                      {ally.terminationReason && <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">"{ally.terminationReason}"</p>}
                    </div>
                  </div>
                  {canManageDiscipline && (
                    <button type="button" onClick={clearTermination} className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">Clear schedule</button>
                  )}
                </div>
              )}

              <div className="mt-6">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Strike meter</p>
                <div className="flex gap-1.5">
                  {Array.from({ length: allianceMaxStrikes }, (_, i) => (
                    <div key={i} className={`h-9 flex-1 rounded-lg transition-colors ${i < meterFilled ? "bg-primary shadow-sm" : "border border-dashed border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/50"}`} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">{strikesCount}</span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    of {allianceMaxStrikes} allowed{strikesCount > allianceMaxStrikes ? " — above workspace cap; remove strikes or raise the limit under Settings → Other." : ""}
                  </span>
                </div>
              </div>

              {canManageDiscipline && (
                <div className="mt-6 flex flex-wrap gap-2 border-t border-zinc-200 pt-5 dark:border-zinc-700">
                  <button type="button" disabled={strikesCount <= 0} onClick={() => patchStrikes(strikesCount - 1)} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">
                    <IconMinus className="h-4 w-4" stroke={2} /> Remove strike
                  </button>
                  <button type="button" disabled={strikesCount >= allianceMaxStrikes} onClick={() => { setStrikeReasonDraft(""); setStrikeModalOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">
                    <IconBolt className="h-4 w-4" stroke={2} /> Add strike
                  </button>
                  {!terminationMoment && (
                    <button type="button" onClick={openTerminationModal} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 transition hover:bg-red-100 dark:border-red-500/40 dark:bg-red-950/35 dark:text-red-200 dark:hover:bg-red-950/50">
                      <IconCalendar className="h-4 w-4" stroke={2} /> Schedule termination
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
                  <div className="bg-primary/10 p-2 rounded-lg"><IconUserCheck className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Alliance Information</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Discord server and representative information</p>
                  </div>
                </div>
                {canEditAllianceDetails && (
                  <button onClick={() => setIsEditingInfo((v) => !v)} className="p-2 text-zinc-400 hover:text-primary transition-colors">
                    <IconEdit className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Discord Server</label>
                {isEditingInfo ? (
                  <input type="text" value={discordServer} onChange={(e) => setDiscordServer(e.target.value)} placeholder="https://discord.gg/..." className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent" />
                ) : (
                  <div className="flex items-center gap-2">
                    {discordServer ? (
                      <>
                        <IconBrandDiscord className="w-5 h-5 text-indigo-500" />
                        <a href={discordServer.startsWith("http") ? discordServer : `https://${discordServer}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 underline">{discordServer}</a>
                      </>
                    ) : <span className="text-zinc-500 dark:text-zinc-400 italic">No Discord server set</span>}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Our Representatives</label>
                {isEditingInfo ? (
                  <>
                    <p className="text-sm text-zinc-500 mb-2">{reps.length} Reps Selected (Minimum 1)</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {users.map((user: any) => (
                        <label key={user.userid} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 cursor-pointer">
                          <input type="checkbox" value={user.userid} checked={reps.includes(user.userid)} onChange={handleCheckboxChange} className="rounded border-gray-300 text-primary focus:ring-primary" />
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRandomBg(user.userid)} overflow-hidden`}>
                            <img src={user.thumbnail} className="w-full h-full object-cover" alt={user.username} style={{ background: "transparent" }} />
                          </div>
                          <span className="text-sm text-zinc-900 dark:text-white">{user.username}</span>
                        </label>
                      ))}
                      {(props as any).missingReps?.filter((m: any) => reps.includes(Number(m.userid))).map((m: any) => (
                        <label key={`missing-${m.userid}`} className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 cursor-pointer">
                          <input type="checkbox" value={m.userid} checked={reps.includes(Number(m.userid))} onChange={handleCheckboxChange} className="rounded border-gray-300 text-primary focus:ring-primary" />
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRandomBg(String(m.userid))} overflow-hidden opacity-70`}>
                            <img src={m.thumbnail || "/default-avatar.jpg"} className="w-full h-full object-cover" alt={m.username} style={{ background: "transparent" }} onError={(e) => (e.currentTarget.src = "/default-avatar.jpg")} />
                          </div>
                          <span className="text-sm text-zinc-900 dark:text-white">{m.username}<span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(not in workspace)</span></span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    {ally.reps?.length > 0
                      ? ally.reps.map((rep: any, i: number) => (
                          <div key={`rep-${i}`} className="text-sm text-zinc-700 dark:text-zinc-300">
                            • {rep.username}
                            {(props as any).missingReps?.some((m: any) => Number(m.userid) === Number(rep.userid)) && <span className="ml-2 text-xs text-amber-500">(not in workspace)</span>}
                          </div>
                        ))
                      : <span className="text-zinc-500 dark:text-zinc-400 italic">No representatives assigned</span>}
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Their Representatives</label>
                  {isEditingInfo && <button onClick={addTheirRep} className="text-primary hover:text-primary/80"><IconPlus className="w-4 h-4" /></button>}
                </div>
                {isEditingInfo ? (
                  <div className="space-y-2">
                    {theirReps.map((rep, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" value={rep} onChange={(e) => updateTheirRep(i, e.target.value)} placeholder="Roblox username" className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent" />
                        <button onClick={() => removeTheirRep(i)} className="p-2 text-red-400 hover:text-red-500"><IconTrash className="w-4 h-4" /></button>
                      </div>
                    ))}
                    {theirReps.length === 0 && (
                      <button onClick={addTheirRep} className="w-full py-2 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-500 dark:text-zinc-400 hover:border-primary hover:text-primary transition-colors">Add their representative</button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {theirReps.filter((r) => r.trim()).length > 0
                      ? theirReps.filter((r) => r.trim()).map((rep, i) => <div key={i} className="text-sm text-zinc-700 dark:text-zinc-300">• {rep}</div>)
                      : <span className="text-zinc-500 dark:text-zinc-400 italic">No representatives listed</span>}
                  </div>
                )}
              </div>

              {isEditingInfo && (
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <button onClick={() => { setIsEditingInfo(false); setDiscordServer(ally.discordServer || ""); setTheirReps(ally.theirReps || [""]); setReps(ally.reps.map((r: any) => r.userid)); }} className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors">Cancel</button>
                  <button onClick={saveAllianceInfo} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors">Save Changes</button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg"><IconClipboardList className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Notes</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Keep track of additional information</p>
                  </div>
                </div>
                {canAddNotes && (
                  <button onClick={createNote} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                    <IconPlus className="w-4 h-4" /><span className="text-sm font-medium">Add Note</span>
                  </button>
                )}
              </div>
              {notes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-zinc-50 dark:bg-zinc-700 rounded-xl p-6 max-w-md mx-auto">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3"><IconClipboardList className="w-6 h-6 text-primary" /></div>
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">No Notes</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">You haven't added any notes yet</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note, index) => (
                    <div key={index} className="bg-zinc-50 dark:bg-zinc-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        {!editNotes.includes(index) && <p className="text-sm text-zinc-700 dark:text-white">{note}</p>}
                        {(canEditNotes || (canAddNotes && newNotes.includes(index)) || canDeleteNotes) && (
                          <div className="flex items-center gap-2">
                            {(canEditNotes || (canAddNotes && newNotes.includes(index))) && (
                              <button onClick={() => noteEdit(index)} className="p-1 text-zinc-400 hover:text-primary transition-colors"><IconPencil className="w-4 h-4" /></button>
                            )}
                            {canDeleteNotes && (
                              <button onClick={() => deleteNote(index)} className="p-1 text-zinc-400 hover:text-red-500 transition-colors"><IconTrash className="w-4 h-4" /></button>
                            )}
                          </div>
                        )}
                      </div>
                      {editNotes.includes(index) && (
                        <textarea className="w-full p-3 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none" value={note} onChange={(e) => handleNoteChange(e, index)} rows={3} placeholder="Enter your note here..." />
                      )}
                    </div>
                  ))}
                  {(canAddNotes || canEditNotes) && (
                    <button onClick={saveNotes} className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">Save Notes</button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg"><IconCalendar className="w-5 h-5 text-primary" /></div>
                  <div>
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Visits</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Schedule and manage alliance visits</p>
                  </div>
                </div>
                {canAddVisits && (
                  <button onClick={() => setCreateVisitOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                    <IconPlus className="w-4 h-4" /><span className="text-sm font-medium">New Visit</span>
                  </button>
                )}
              </div>
              {visits.length === 0 ? (
                <div className="text-center py-8">
                  <div className="rounded-xl p-6 max-w-md mx-auto">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3"><IconCalendar className="w-6 h-6 text-primary" /></div>
                    <h3 className="text-sm font-medium text-zinc-900 mb-1 dark:text-white">No Visits</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">You haven't scheduled any visits yet</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {visits.map((visit: any) => (
                    <div key={visit.id} className="bg-zinc-50 dark:bg-zinc-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-medium dark:text-white text-zinc-900">{visit.name}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            <div className={`w-6 h-6 p-0.5 rounded-full flex items-center justify-center ${getRandomBg(visit.hostId)} border-2 border-white`}>
                              <img src={visit.hostThumbnail} className="w-full h-full rounded-full object-cover" alt={visit.hostUsername} style={{ background: "transparent" }} />
                            </div>
                            <p className="text-xs dark:text-zinc-400 text-zinc-500">Hosted by {visit.hostUsername}</p>
                          </div>
                          <p className="text-xs dark:text-zinc-400 text-zinc-500 mt-1">
                            {new Date(visit.time).toLocaleDateString()} at {String(new Date(visit.time).getHours()).padStart(2, "0")}:{String(new Date(visit.time).getMinutes()).padStart(2, "0")}
                          </p>
                          {visit.participants?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Participants ({visit.participants.length})</p>
                              <div className="flex flex-wrap gap-1">
                                {visit.participants.slice(0, 5).map((pid: number) => {
                                  const p = users.find((u: any) => Number(u.userid) === pid);
                                  return p ? <span key={pid} className="text-xs bg-zinc-200 dark:bg-zinc-600 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded">{p.username}</span> : null;
                                })}
                                {visit.participants.length > 5 && <span className="text-xs text-zinc-500 dark:text-zinc-400">+{visit.participants.length - 5} more</span>}
                              </div>
                            </div>
                          )}
                        </div>
                        {(canEditVisits || canDeleteVisits) && (
                          <div className="flex items-center gap-1">
                            {canEditVisits && <button onClick={() => openEditVisit(visit.id, visit.name, visit.time, visit.participants)} className="p-1 text-zinc-400 hover:text-primary transition-colors"><IconPencil className="w-4 h-4" /></button>}
                            {canDeleteVisits && <button onClick={() => deleteVisit(visit.id)} className="p-1 text-zinc-400 hover:text-red-500 transition-colors"><IconTrash className="w-4 h-4" /></button>}
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
}

const ManageAlly: pageWithLayout<AllyPageProps> = (props) => {
  if (!props.infoAlly) return null;
  return <ManageAllyInner {...props} ally={props.infoAlly as any} />;
};

ManageAlly.layout = workspace;
export default ManageAlly;