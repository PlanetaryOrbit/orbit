import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
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
import {
  AlliancesPageShell,
  AlliancesPageHeader,
  AlliancesPanel,
  AlliancesEmptyState,
  AlliancesSectionBar,
  AlliancesFormInset,
  alliancePrimaryButtonClass,
  allianceSecondaryButtonClass,
  allianceFormInputOverride,
  allianceFormInputClass,
  allianceFormLabelClass,
  allianceDangerOutlineButtonClass,
  allianceWarningButtonClass,
  allianceDangerButtonClass,
  alliancesPanelShadow,
} from "@/components/alliances/shell";

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
              <Dialog.Panel className={`w-full max-w-md overflow-hidden rounded-2xl bg-white p-5 text-left align-middle transition-all dark:bg-zinc-900 sm:p-6 ${alliancesPanelShadow}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <IconCalendar className="h-5 w-5 text-primary" stroke={1.75} />
                  </div>
                  <div>
                    <Dialog.Title as="h3" className="text-base font-semibold text-zinc-900 dark:text-white">Create New Visit</Dialog.Title>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">Schedule an alliance visit with your team</p>
                  </div>
                </div>
                <div className="mt-5">
                <FormProvider {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                      <Input label="Visit Title" classoverride={allianceFormInputOverride} {...form.register("name", { required: true })} />
                      <Input label="Visit Time" type="datetime-local" classoverride={allianceFormInputOverride} {...form.register("time", { required: true })} />
                      <div>
                        <label className={allianceFormLabelClass}>Participants</label>
                        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-zinc-50/80 p-2 dark:bg-zinc-800/40">
                          {users.map((user: any) => (
                            <label key={user.userid} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
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
                </div>
                <div className="mt-6 flex gap-3">
                  <button type="button" className={`${allianceSecondaryButtonClass} flex-1 justify-center`} onClick={onClose}>Cancel</button>
                  <button type="button" className={`${alliancePrimaryButtonClass} flex-1 justify-center`} onClick={form.handleSubmit(onSubmit)}>Create Visit</button>
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
              <Dialog.Panel className={`w-full max-w-md overflow-hidden rounded-2xl bg-white p-5 text-left align-middle transition-all dark:bg-zinc-900 sm:p-6 ${alliancesPanelShadow}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <IconPencil className="h-5 w-5 text-primary" stroke={1.75} />
                  </div>
                  <div>
                    <Dialog.Title as="h3" className="text-base font-semibold text-zinc-900 dark:text-white">Edit Visit</Dialog.Title>
                  </div>
                </div>
                <div className="mt-5">
                <FormProvider {...form}>
                  <form>
                    <div className="space-y-4">
                      <Input label="Visit Title" classoverride={allianceFormInputOverride} {...form.register("name")} />
                      <Input label="Visit Time" type="datetime-local" classoverride={allianceFormInputOverride} {...form.register("time")} />
                      <div>
                        <label className={allianceFormLabelClass}>Participants</label>
                        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-zinc-50/80 p-2 dark:bg-zinc-800/40">
                          {users.map((user: any) => (
                            <label key={user.userid} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
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
                </div>
                <div className="mt-6 flex gap-3">
                  <button type="button" className={`${allianceSecondaryButtonClass} flex-1 justify-center`} onClick={onClose}>Cancel</button>
                  <button type="button" className={`${alliancePrimaryButtonClass} flex-1 justify-center`} onClick={onUpdate}>Update Visit</button>
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
              <Dialog.Panel className={`w-full max-w-md overflow-hidden rounded-2xl bg-white p-5 text-left transition-all dark:bg-zinc-900 sm:p-6 ${alliancesPanelShadow}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-500/15">
                    <IconCalendar className="h-5 w-5 text-red-600 dark:text-red-400" stroke={1.75} />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-white">Schedule alliance termination</Dialog.Title>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Choose when this alliance ends and record why. Your workspace leads can clear this later if plans change.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <label className={allianceFormLabelClass}>Effective date & time</label>
                    <input type="datetime-local" value={termEffective} onChange={(e) => setTermEffective(e.target.value)} className={allianceFormInputClass} />
                  </div>
                  <div>
                    <label className={allianceFormLabelClass}>Reason</label>
                    <textarea value={termReasonDraft} onChange={(e) => setTermReasonDraft(e.target.value)} rows={4} placeholder="Explain why this alliance is ending…" className={`${allianceFormInputClass} resize-none`} />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button type="button" className={`${allianceSecondaryButtonClass} flex-1 justify-center`} onClick={onClose}>Cancel</button>
                  <button type="button" className={`${allianceDangerButtonClass} flex-1 justify-center`} onClick={onConfirm}>Confirm schedule</button>
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
              <Dialog.Panel className={`w-full max-w-md overflow-hidden rounded-2xl bg-white p-5 text-left transition-all dark:bg-zinc-900 sm:p-6 ${alliancesPanelShadow}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/15">
                    <IconAlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" stroke={1.75} />
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-white">Add strike</Dialog.Title>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">You must give a reason. An automatic note will be appended to this alliance&apos;s notes when you confirm.</p>
                  </div>
                </div>
                <div className="mt-5">
                  <label className={allianceFormLabelClass}>Reason</label>
                  <textarea value={strikeReasonDraft} onChange={(e) => setStrikeReasonDraft(e.target.value)} rows={4} placeholder="Explain why this strike is being issued…" className={`${allianceFormInputClass} resize-none`} />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">At least 3 characters required.</p>
                </div>
                <div className="mt-6 flex gap-3">
                  <button type="button" className={`${allianceSecondaryButtonClass} flex-1 justify-center`} onClick={onClose}>Cancel</button>
                  <button type="button" className={`${allianceWarningButtonClass} flex-1 justify-center`} onClick={onConfirm}>Confirm strike</button>
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
  const [workspace] = useRecoilState(workspacestate);
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

      <AlliancesPageShell>
        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/workspace/${id}/alliances`)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            aria-label="Back to alliances"
          >
            <IconArrowLeft className="h-5 w-5" stroke={1.75} />
          </button>
        </div>

        <AlliancesPageHeader
          title={ally.name}
          subtitle={`Group ID ${ally.groupId}`}
          workspaceLabel={workspace.customName || workspace.groupName}
          action={
            <a
              href={`https://www.roblox.com/groups/${ally.groupId}`}
              target="_blank"
              rel="noreferrer"
              className={allianceSecondaryButtonClass}
            >
              <IconExternalLink className="h-4 w-4" />
              View on Roblox
            </a>
          }
        />

        <div className="mb-5 flex items-center gap-4">
          <img
            src={ally.icon}
            alt=""
            className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-zinc-100 dark:ring-zinc-800"
          />
          {ally.reps?.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Reps</span>
              {ally.reps.map((rep: any) => (
                <Tooltip key={rep.userid} orientation="top" tooltipText={rep.username}>
                  <div
                    className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full ring-2 ring-white dark:ring-zinc-900 ${getRandomBg(rep.userid)} ${(props as any).missingReps?.some((m: any) => Number(m.userid) === Number(rep.userid)) ? "opacity-70 ring-amber-400" : ""}`}
                  >
                    <img src={rep.thumbnail} className="h-full w-full object-cover" alt={rep.username} style={{ background: "transparent" }} />
                  </div>
                </Tooltip>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <AlliancesPanel className="p-5 sm:p-6">
            <AlliancesSectionBar
              icon={IconBolt}
              title="Standing & termination"
              subtitle="Track strikes and schedule an end date with a recorded reason"
            />

            {terminationMoment && (
              <AlliancesFormInset
                className={`mb-5 ${terminationMoment.isBefore(moment()) ? "border border-red-200/80 bg-red-50/80 dark:border-red-500/35 dark:bg-red-950/25" : "border border-amber-200/80 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-950/20"}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2.5">
                    <IconAlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${terminationMoment.isBefore(moment()) ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`} stroke={1.75} />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{terminationMoment.isBefore(moment()) ? "Termination date reached" : "Termination scheduled"}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">Effective <span className="font-medium">{terminationMoment.format("MMM D, YYYY · h:mm A")}</span></p>
                      {ally.terminationReason && <p className="mt-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">&ldquo;{ally.terminationReason}&rdquo;</p>}
                    </div>
                  </div>
                  {canManageDiscipline && (
                    <button type="button" onClick={clearTermination} className={`${allianceSecondaryButtonClass} shrink-0 text-xs`}>Clear schedule</button>
                  )}
                </div>
              </AlliancesFormInset>
            )}

            <div>
              <p className={allianceFormLabelClass}>Strike meter</p>
              <div className="mt-2 flex gap-1.5">
                {Array.from({ length: allianceMaxStrikes }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 flex-1 rounded-full transition-colors ${i < meterFilled ? "bg-primary" : "bg-zinc-200 dark:bg-zinc-700"}`}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">{strikesCount}</span>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  of {allianceMaxStrikes} allowed{strikesCount > allianceMaxStrikes ? " — above workspace cap" : ""}
                </span>
              </div>
            </div>

            {canManageDiscipline && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                <button type="button" disabled={strikesCount <= 0} onClick={() => patchStrikes(strikesCount - 1)} className={`${allianceSecondaryButtonClass} disabled:opacity-40`}>
                  <IconMinus className="h-4 w-4" stroke={2} /> Remove strike
                </button>
                <button type="button" disabled={strikesCount >= allianceMaxStrikes} onClick={() => { setStrikeReasonDraft(""); setStrikeModalOpen(true); }} className={`${alliancePrimaryButtonClass} disabled:opacity-40`}>
                  <IconBolt className="h-4 w-4" stroke={2} /> Add strike
                </button>
                {!terminationMoment && (
                  <button type="button" onClick={openTerminationModal} className={allianceDangerOutlineButtonClass}>
                    <IconCalendar className="h-4 w-4" stroke={2} /> Schedule termination
                  </button>
                )}
              </div>
            )}
          </AlliancesPanel>

          <AlliancesPanel className="p-5 sm:p-6">
            <AlliancesSectionBar
              icon={IconUserCheck}
              title="Alliance information"
              subtitle="Discord server and representative information"
              action={
                canEditAllianceDetails ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingInfo((v) => !v)}
                    className={`${allianceSecondaryButtonClass} !px-3 !py-2`}
                    aria-label={isEditingInfo ? "Cancel editing" : "Edit alliance information"}
                  >
                    <IconEdit className="h-4 w-4" stroke={1.75} />
                    {isEditingInfo ? "Cancel" : "Edit"}
                  </button>
                ) : undefined
              }
            />

            <div className="space-y-5">
              <div>
                <label className={allianceFormLabelClass}>Discord server</label>
                {isEditingInfo ? (
                  <input type="text" value={discordServer} onChange={(e) => setDiscordServer(e.target.value)} placeholder="https://discord.gg/..." className={allianceFormInputClass} />
                ) : (
                  <AlliancesFormInset className="mt-1">
                    {discordServer ? (
                      <a href={discordServer.startsWith("http") ? discordServer : `https://${discordServer}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80">
                        <IconBrandDiscord className="h-4 w-4 text-indigo-500" />
                        {discordServer}
                      </a>
                    ) : (
                      <span className="text-sm italic text-zinc-500 dark:text-zinc-400">No Discord server set</span>
                    )}
                  </AlliancesFormInset>
                )}
              </div>

              <div>
                <label className={allianceFormLabelClass}>Our representatives</label>
                {isEditingInfo ? (
                  <AlliancesFormInset className="mt-1">
                    <p className="mb-2 text-xs text-zinc-500">{reps.length} selected (minimum 1)</p>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                      {users.map((user: any) => (
                        <label key={user.userid} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
                          <input type="checkbox" value={user.userid} checked={reps.includes(user.userid)} onChange={handleCheckboxChange} className="rounded border-zinc-300 text-primary focus:ring-primary" />
                          <div className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ${getRandomBg(user.userid)}`}>
                            <img src={user.thumbnail} className="h-full w-full object-cover" alt={user.username} style={{ background: "transparent" }} />
                          </div>
                          <span className="text-sm text-zinc-900 dark:text-white">{user.username}</span>
                        </label>
                      ))}
                      {(props as any).missingReps?.filter((m: any) => reps.includes(Number(m.userid))).map((m: any) => (
                        <label key={`missing-${m.userid}`} className="flex cursor-pointer items-center gap-3 rounded-lg border border-amber-200/80 bg-amber-50/50 p-2 dark:border-amber-800 dark:bg-amber-900/20">
                          <input type="checkbox" value={m.userid} checked={reps.includes(Number(m.userid))} onChange={handleCheckboxChange} className="rounded border-zinc-300 text-primary focus:ring-primary" />
                          <div className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full opacity-70 ${getRandomBg(String(m.userid))}`}>
                            <img src={m.thumbnail || "/default-avatar.jpg"} className="h-full w-full object-cover" alt={m.username} style={{ background: "transparent" }} onError={(e) => (e.currentTarget.src = "/default-avatar.jpg")} />
                          </div>
                          <span className="text-sm text-zinc-900 dark:text-white">{m.username}<span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(not in workspace)</span></span>
                        </label>
                      ))}
                    </div>
                  </AlliancesFormInset>
                ) : (
                  <AlliancesFormInset className="mt-1 space-y-1">
                    {ally.reps?.length > 0
                      ? ally.reps.map((rep: any, i: number) => (
                          <div key={`rep-${i}`} className="text-sm text-zinc-700 dark:text-zinc-300">
                            {rep.username}
                            {(props as any).missingReps?.some((m: any) => Number(m.userid) === Number(rep.userid)) && <span className="ml-2 text-xs text-amber-500">(not in workspace)</span>}
                          </div>
                        ))
                      : <span className="text-sm italic text-zinc-500 dark:text-zinc-400">No representatives assigned</span>}
                  </AlliancesFormInset>
                )}
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className={allianceFormLabelClass}>Their representatives</label>
                  {isEditingInfo && (
                    <button type="button" onClick={addTheirRep} className="text-primary hover:text-primary/80">
                      <IconPlus className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {isEditingInfo ? (
                  <div className="space-y-2">
                    {theirReps.map((rep, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" value={rep} onChange={(e) => updateTheirRep(i, e.target.value)} placeholder="Roblox username" className={allianceFormInputClass} />
                        <button type="button" onClick={() => removeTheirRep(i)} className="rounded-xl p-2 text-red-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><IconTrash className="h-4 w-4" /></button>
                      </div>
                    ))}
                    {theirReps.length === 0 && (
                      <button type="button" onClick={addTheirRep} className="w-full rounded-xl border border-dashed border-zinc-200 py-2.5 text-sm text-zinc-500 transition hover:border-primary hover:text-primary dark:border-zinc-700">Add their representative</button>
                    )}
                  </div>
                ) : (
                  <AlliancesFormInset className="mt-1 space-y-1">
                    {theirReps.filter((r) => r.trim()).length > 0
                      ? theirReps.filter((r) => r.trim()).map((rep, i) => <div key={i} className="text-sm text-zinc-700 dark:text-zinc-300">{rep}</div>)
                      : <span className="text-sm italic text-zinc-500 dark:text-zinc-400">No representatives listed</span>}
                  </AlliancesFormInset>
                )}
              </div>
            </div>

            {isEditingInfo && (
              <div className="mt-5 flex justify-end gap-2 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                <button type="button" onClick={() => { setIsEditingInfo(false); setDiscordServer(ally.discordServer || ""); setTheirReps(ally.theirReps || [""]); setReps(ally.reps.map((r: any) => r.userid)); }} className={allianceSecondaryButtonClass}>Cancel</button>
                <button type="button" onClick={saveAllianceInfo} className={alliancePrimaryButtonClass}>Save changes</button>
              </div>
            )}
          </AlliancesPanel>

          <AlliancesPanel className="p-5 sm:p-6">
            <AlliancesSectionBar
              icon={IconClipboardList}
              title="Notes"
              subtitle="Keep track of additional information"
              action={
                canAddNotes ? (
                  <button type="button" onClick={createNote} className={alliancePrimaryButtonClass}>
                    <IconPlus className="h-4 w-4" /> Add note
                  </button>
                ) : undefined
              }
            />

            {notes.length === 0 ? (
              <AlliancesEmptyState
                icon={IconClipboardList}
                title="No notes"
                description="You haven't added any notes yet."
                action={
                  canAddNotes ? (
                    <button type="button" onClick={createNote} className={alliancePrimaryButtonClass}>
                      <IconPlus className="h-4 w-4" /> Add note
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {notes.map((note, index) => (
                  <AlliancesFormInset key={index}>
                    <div className="flex items-start justify-between gap-3">
                      {!editNotes.includes(index) && (
                        <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">{note || <span className="italic text-zinc-400">This note is empty</span>}</p>
                      )}
                      {(canEditNotes || (canAddNotes && newNotes.includes(index)) || canDeleteNotes) && (
                        <div className="flex shrink-0 items-center gap-1">
                          {(canEditNotes || (canAddNotes && newNotes.includes(index))) && (
                            <button type="button" onClick={() => noteEdit(index)} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-primary dark:hover:bg-zinc-800"><IconPencil className="h-4 w-4" /></button>
                          )}
                          {canDeleteNotes && (
                            <button type="button" onClick={() => deleteNote(index)} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><IconTrash className="h-4 w-4" /></button>
                          )}
                        </div>
                      )}
                    </div>
                    {editNotes.includes(index) && (
                      <textarea className={`${allianceFormInputClass} mt-2 resize-none`} value={note} onChange={(e) => handleNoteChange(e, index)} rows={3} placeholder="Enter your note here..." />
                    )}
                  </AlliancesFormInset>
                ))}
                {(canAddNotes || canEditNotes) && (
                  <button type="button" onClick={saveNotes} className={`${alliancePrimaryButtonClass} w-full justify-center`}>Save notes</button>
                )}
              </div>
            )}
          </AlliancesPanel>

          <AlliancesPanel className="p-5 sm:p-6">
            <AlliancesSectionBar
              icon={IconCalendar}
              title="Visits"
              subtitle="Schedule and manage alliance visits"
              action={
                canAddVisits ? (
                  <button type="button" onClick={() => setCreateVisitOpen(true)} className={alliancePrimaryButtonClass}>
                    <IconPlus className="h-4 w-4" /> New visit
                  </button>
                ) : undefined
              }
            />

            {visits.length === 0 ? (
              <AlliancesEmptyState
                icon={IconCalendar}
                title="No visits"
                description="You haven't scheduled any visits yet."
                action={
                  canAddVisits ? (
                    <button type="button" onClick={() => setCreateVisitOpen(true)} className={alliancePrimaryButtonClass}>
                      <IconPlus className="h-4 w-4" /> New visit
                    </button>
                  ) : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {visits.map((visit: any) => (
                  <AlliancesFormInset key={visit.id} className="!p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{visit.name}</h3>
                        <div className="mt-2 flex items-center gap-2">
                          <div className={`flex h-6 w-6 items-center justify-center overflow-hidden rounded-full ring-2 ring-white dark:ring-zinc-900 ${getRandomBg(visit.hostId)}`}>
                            <img src={visit.hostThumbnail} className="h-full w-full object-cover" alt={visit.hostUsername} style={{ background: "transparent" }} />
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">Hosted by {visit.hostUsername}</p>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {new Date(visit.time).toLocaleDateString()} at {String(new Date(visit.time).getHours()).padStart(2, "0")}:{String(new Date(visit.time).getMinutes()).padStart(2, "0")}
                        </p>
                        {visit.participants?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {visit.participants.slice(0, 5).map((pid: number) => {
                              const p = users.find((u: any) => Number(u.userid) === pid);
                              return p ? <span key={pid} className="rounded-lg bg-zinc-200/80 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">{p.username}</span> : null;
                            })}
                            {visit.participants.length > 5 && <span className="text-xs text-zinc-500">+{visit.participants.length - 5} more</span>}
                          </div>
                        )}
                      </div>
                      {(canEditVisits || canDeleteVisits) && (
                        <div className="flex shrink-0 items-center gap-1">
                          {canEditVisits && <button type="button" onClick={() => openEditVisit(visit.id, visit.name, visit.time, visit.participants)} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-primary dark:hover:bg-zinc-800"><IconPencil className="h-4 w-4" /></button>}
                          {canDeleteVisits && <button type="button" onClick={() => deleteVisit(visit.id)} className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"><IconTrash className="h-4 w-4" /></button>}
                        </div>
                      )}
                    </div>
                  </AlliancesFormInset>
                ))}
              </div>
            )}
          </AlliancesPanel>
        </div>
      </AlliancesPageShell>
    </>
  );
}

const ManageAlly: pageWithLayout<AllyPageProps> = (props) => {
  if (!props.infoAlly) return null;
  return <ManageAllyInner {...props} ally={props.infoAlly as any} />;
};

ManageAlly.layout = workspace;
export default ManageAlly;