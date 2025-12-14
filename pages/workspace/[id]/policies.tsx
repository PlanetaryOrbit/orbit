import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useRouter } from "next/router";
import React, { useMemo, useState, useEffect } from "react";
import prisma, { document } from "@/utils/database";
import { GetServerSideProps } from "next";
import randomText from "@/utils/randomText";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import {
  IconFileText,
  IconPlus,
  IconClock,
  IconUser,
  IconArrowLeft,
  IconAlertTriangle,
  IconExternalLink,
  IconLink,
  IconShield,
  IconChartBar,
  IconDownload,
  IconCheck,
  IconX,
  IconRefresh,
  IconCopy,
  IconShare,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import clsx from "clsx";
import { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import PolicyLinkManager from "@/components/PolicyLinkManager";
import UserPolicyDashboard from "@/components/UserPolicyDashboard";

const BG_COLORS = [
  "bg-rose-200",
  "bg-lime-200",
  "bg-sky-200",
  "bg-amber-200",
  "bg-violet-200",
  "bg-fuchsia-200",
  "bg-emerald-200",
  "bg-indigo-200",
  "bg-pink-200",
  "bg-cyan-200",
  "bg-red-200",
  "bg-green-200",
  "bg-blue-200",
  "bg-yellow-200",
  "bg-teal-200",
  "bg-orange-200",
];

function getRandomBg(userid: string, username?: string) {
  const key = `${userid ?? ""}:${username ?? ""}`;
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 33) ^ key.charCodeAt(i);
  }
  const index = (hash >>> 0) % BG_COLORS.length;
  return BG_COLORS[index];
}

export const getServerSideProps = withPermissionCheckSsr(
  async (context: any) => {
    const { id } = context.query;
    const userid = context.req.session.userid;
    if (!userid) {
      return {
        redirect: {
          destination: "/login",
        },
      };
    }
    if (!id) {
      return {
        notFound: true,
      };
    }

    const user = await prisma.user.findFirst({
      where: {
        userid: userid,
      },
      include: {
        roles: {
          where: {
            workspaceGroupId: parseInt(id as string),
          },
        },
      },
    });
    if (!user) {
      return {
        redirect: {
          destination: "/login",
        },
      };
    }

    const config = await prisma.config.findFirst({
      where: {
        workspaceGroupId: parseInt(id as string),
        key: "policies",
      },
    });

    let policiesEnabled = false;
    if (config?.value) {
      let val = config.value;
      if (typeof val === "string") {
        try {
          val = JSON.parse(val);
        } catch {
          val = {};
        }
      }
      policiesEnabled =
        typeof val === "object" && val !== null && "enabled" in val
          ? (val as { enabled?: boolean }).enabled ?? false
          : false;
    }

    if (!policiesEnabled) {
      return { notFound: true };
    }

    const canManagePolicies = (user.roles || []).some(
      (r: any) =>
        (r.permissions || []).includes("manage_policies") || r.isOwnerRole
    );

    if (!canManagePolicies) {
      return {
        props: {
          isUserView: true,
        },
      };
    }

    const documents = await prisma.document.findMany({
      where: {
        workspaceGroupId: parseInt(id as string),
        requiresAcknowledgment: true,
      },
      include: {
        owner: {
          select: {
            username: true,
            picture: true,
          },
        },
        roles: {
          select: {
            id: true,
            name: true,
          },
        },
        acknowledgments: {
          include: {
            user: {
              select: {
                userid: true,
                username: true,
                picture: true,
              },
            },
          },
        },
      },
    });

    const roles = await prisma.role.findMany({
      where: {
        workspaceGroupId: parseInt(id as string),
      },
      select: {
        id: true,
        name: true,
        isOwnerRole: true,
      },
    });

    return {
      props: {
        isUserView: false,
        documents: JSON.parse(
          JSON.stringify(documents, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
        roles: JSON.parse(
          JSON.stringify(roles, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        ),
      },
    };
  }
);

type pageProps = {
  isUserView?: boolean;
  documents?: (document & {
    owner: { username: string; picture: string };
    roles: Array<{ id: string; name: string }>;
    acknowledgments: Array<{
      user: { userid: string; username: string; picture: string };
      acknowledgedAt: string;
    }>;
  })[];
  roles?: Array<{ id: string; name: string }>;
};

const PoliciesPage: pageWithLayout<pageProps> = ({
  isUserView: initialUserView,
  documents = [],
  roles = [],
}) => {
  const [login, setLogin] = useRecoilState(loginState);
  const router = useRouter();
  const { id } = router.query;
  const [workspace] = useRecoilState(workspacestate);

  const [viewMode, setViewMode] = useState<"user" | "admin">("user");
  const [complianceData, setComplianceData] = useState<any>(null);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [selectedPolicyForModal, setSelectedPolicyForModal] =
    useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "pending" | "acknowledged"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(20);
  const [selectedView, setSelectedView] = useState<
    "overview" | "compliance" | "create" | "edit"
  >("overview");
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [isCreatingPolicy, setIsCreatingPolicy] = useState(false);
  const [showLinkManager, setShowLinkManager] = useState(false);
  const [selectedDocumentForLink, setSelectedDocumentForLink] =
    useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<{id: string, name: string} | null>(null);
  const [policyMode, setPolicyMode] = useState<"internal" | "external">(
    "internal"
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [newPolicy, setNewPolicy] = useState({
    name: "",
    content: "",
    externalUrl: "",
    requiresAcknowledgment: true,
    acknowledgmentDeadline: "",
    acknowledgmentMethod: "signature" as
      | "signature"
      | "checkbox"
      | "type_username"
      | "type_word",
    acknowledgmentWord: "",
    isTrainingDocument: false,
    assignToEveryone: false,
    roles: [] as string[],
  });
  const [editPolicy, setEditPolicy] = useState({
    id: "",
    name: "",
    content: "",
    externalUrl: "",
    requiresAcknowledgment: true,
    acknowledgmentDeadline: "",
    acknowledgmentMethod: "signature" as
      | "signature"
      | "checkbox"
      | "type_username"
      | "type_word",
    acknowledgmentWord: "",
    isTrainingDocument: false,
    assignToEveryone: false,
    roles: [] as string[],
  });
  const [memberRoleCounts, setMemberRoleCounts] = useState<{
    [roleId: string]: number;
  }>({});
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchComplianceData = async () => {
    try {
      const response = await axios.get(
        `/api/workspace/${router.query.id}/policies/compliance-report`
      );
      setComplianceData(response.data.report);
    } catch (error) {
      toast.error("Failed to load compliance data");
    }
  };

  useEffect(() => {
    if (selectedView === "compliance") {
      fetchComplianceData();
    }
  }, [selectedView, router.query.id]);

  useEffect(() => {
    const fetchRoleCounts = async () => {
      setIsLoadingStats(true);
      try {
        const response = await axios.get(
          `/api/workspace/${router.query.id}/policies/compliance-stats`
        );
        if (response.data.success) {
          const roleCounts: { [roleId: string]: number } = {};
          response.data.stats.memberCompliance.forEach((member: any) => {});
          const policyRequiredCounts: { [policyId: string]: number } = {};
          response.data.stats.policyBreakdown.forEach((policy: any) => {
            policyRequiredCounts[policy.id] = policy.totalRequired;
          });
          setMemberRoleCounts(policyRequiredCounts);
        }
      } catch (error) {
        console.error("Failed to fetch role counts:", error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (router.query.id) {
      fetchRoleCounts();
    }
  }, [router.query.id]);
  const canManagePolicies = 
    workspace.yourPermission?.includes("manage_policies") || 
    workspace.yourPermission?.includes("admin") || 
    false;

  const createPolicy = async () => {
    if (
      !newPolicy.name.trim() ||
      (!newPolicy.assignToEveryone && newPolicy.roles.length === 0)
    ) {
      toast.error("Please fill in policy name and assign to roles or everyone");
      return;
    }

    if (policyMode === "internal" && !newPolicy.content.trim()) {
      toast.error("Please enter policy content");
      return;
    }

    if (policyMode === "external" && !newPolicy.externalUrl.trim()) {
      toast.error("Please enter an external URL");
      return;
    }

    if (
      policyMode === "external" &&
      !newPolicy.externalUrl.startsWith("https://")
    ) {
      toast.error("External URL must use HTTPS");
      return;
    }

    if (
      newPolicy.acknowledgmentMethod === "type_word" &&
      !newPolicy.acknowledgmentWord.trim()
    ) {
      toast.error("Please enter a confirmation word/phrase for users to type");
      return;
    }

    setIsCreatingPolicy(true);
    try {
      const policyData = {
        ...newPolicy,
        content:
          policyMode === "external"
            ? {
                external: true,
                url: newPolicy.externalUrl.trim(),
              }
            : newPolicy.content,
      };
      await axios.post(
        `/api/workspace/${router.query.id}/policies/create`,
        policyData
      );
      setNewPolicy({
        name: "",
        content: "",
        externalUrl: "",
        requiresAcknowledgment: true,
        acknowledgmentDeadline: "",
        acknowledgmentMethod: "signature",
        acknowledgmentWord: "",
        isTrainingDocument: false,
        assignToEveryone: false,
        roles: [],
      });
      setPolicyMode("internal");
      setCurrentStep(1);
      toast.success("Policy created successfully");
      router.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create policy");
    } finally {
      setIsCreatingPolicy(false);
    }
  };

  const handleDeletePolicy = async (documentId: string, documentName: string) => {
    setPolicyToDelete({ id: documentId, name: documentName });
    setShowDeleteModal(true);
  };

  const confirmDeletePolicy = async () => {
    if (!policyToDelete) return;

    try {
      await axios.delete(
        `/api/workspace/${router.query.id}/policies/${policyToDelete.id}`
      );
      toast.success("Policy deleted successfully");
      setShowDeleteModal(false);
      setPolicyToDelete(null);
      router.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete policy");
    }
  };

  const startEditPolicy = (document: any) => {
    const isExternal =
      document.content &&
      typeof document.content === "object" &&
      document.content.external;

    setEditPolicy({
      id: document.id,
      name: document.name,
      content: isExternal
        ? ""
        : typeof document.content === "string"
        ? document.content
        : JSON.stringify(document.content, null, 2),
      externalUrl: isExternal ? document.content.url : "",
      requiresAcknowledgment: document.requiresAcknowledgment,
      acknowledgmentDeadline: document.acknowledgmentDeadline
        ? new Date(document.acknowledgmentDeadline).toISOString().split("T")[0]
        : "",
      acknowledgmentMethod: document.acknowledgmentMethod || "signature",
      acknowledgmentWord: document.acknowledgmentWord || "",
      isTrainingDocument: document.isTrainingDocument,
      assignToEveryone: document.assignToEveryone,
      roles: document.roles ? document.roles.map((role: any) => role.id) : [],
    });

    setPolicyMode(isExternal ? "external" : "internal");
    setCurrentStep(1);
    setSelectedView("edit");
  };

  const updatePolicy = async () => {
    if (
      !editPolicy.name.trim() ||
      (!editPolicy.assignToEveryone && editPolicy.roles.length === 0)
    ) {
      toast.error("Please fill in policy name and assign to roles or everyone");
      return;
    }

    if (policyMode === "internal" && !editPolicy.content.trim()) {
      toast.error("Please enter policy content");
      return;
    }

    if (policyMode === "external" && !editPolicy.externalUrl.trim()) {
      toast.error("Please enter an external URL");
      return;
    }

    if (
      policyMode === "external" &&
      !editPolicy.externalUrl.startsWith("https://")
    ) {
      toast.error("External URL must use HTTPS");
      return;
    }

    setIsCreatingPolicy(true);
    try {
      const policyData = {
        name: editPolicy.name,
        content:
          policyMode === "external"
            ? { external: true, url: editPolicy.externalUrl }
            : editPolicy.content,
        requiresAcknowledgment: editPolicy.requiresAcknowledgment,
        acknowledgmentDeadline: editPolicy.acknowledgmentDeadline || null,
        acknowledgmentMethod: editPolicy.acknowledgmentMethod,
        acknowledgmentWord: editPolicy.acknowledgmentWord || null,
        isTrainingDocument: editPolicy.isTrainingDocument,
        assignToEveryone: editPolicy.assignToEveryone,
        roles: editPolicy.assignToEveryone ? [] : editPolicy.roles,
      };

      await axios.put(
        `/api/workspace/${router.query.id}/policies/${editPolicy.id}/update`,
        policyData
      );
      toast.success("Policy updated successfully");
      setEditPolicy({
        id: "",
        name: "",
        content: "",
        externalUrl: "",
        requiresAcknowledgment: true,
        acknowledgmentDeadline: "",
        acknowledgmentMethod: "signature",
        acknowledgmentWord: "",
        isTrainingDocument: false,
        assignToEveryone: false,
        roles: [],
      });
      setCurrentStep(1);
      setSelectedView("overview");
      router.reload();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update policy");
    } finally {
      setIsCreatingPolicy(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNextStep = () => {
    const currentPolicy = selectedView === "edit" ? editPolicy : newPolicy;

    switch (currentStep) {
      case 1: // Basic Info
        return currentPolicy.name.trim().length > 0;
      case 2: // Content
        if (policyMode === "internal") {
          return currentPolicy.content.trim().length > 0;
        } else {
          return (
            currentPolicy.externalUrl.trim().length > 0 &&
            currentPolicy.externalUrl.startsWith("https://")
          );
        }
      case 3: // Acknowledgment
        if (currentPolicy.acknowledgmentMethod === "type_word") {
          return currentPolicy.acknowledgmentWord.trim().length > 0;
        }
        return true;
      case 4: // Assignment
        return currentPolicy.assignToEveryone || currentPolicy.roles.length > 0;
      case 5: // Review - can't proceed beyond this
        return true;
      default:
        return true;
    }
  };

  const calculatePolicyStats = (doc: any) => {
    const currentVersionAcks = doc.acknowledgments;
    const totalRequired = memberRoleCounts[doc.id] || 0;
    const acknowledged = currentVersionAcks.length;
    const complianceRate =
      totalRequired > 0 ? (acknowledged / totalRequired) * 100 : 100;

    return { acknowledged, totalRequired, complianceRate };
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Toaster position="bottom-center" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Policies
            </h1>
            <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
              BETA
            </span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-4">
            {viewMode === "user"
              ? "Review and acknowledge required policies"
              : "Manage workspace policies and track acknowledgments"}
          </p>
          <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
            <button
              onClick={() => setViewMode("user")}
              className={clsx(
                "px-4 py-2 text-sm font-medium transition-colors relative",
                viewMode === "user"
                  ? "text-primary border-b-2 border-primary"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <div className="flex items-center gap-2">
                <IconUser className="w-4 h-4" />
                <span>My Policies</span>
              </div>
            </button>
            {canManagePolicies && (
              <button
                onClick={() => setViewMode("admin")}
                className={clsx(
                  "px-4 py-2 text-sm font-medium transition-colors relative",
                  viewMode === "admin"
                    ? "text-primary border-b-2 border-primary"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                <div className="flex items-center gap-2">
                  <IconSettings className="w-4 h-4" />
                  <span>Manage Policies</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {viewMode === "user" && (
          <UserPolicyDashboard
            workspaceId={id as string}
            currentUsername={login.username}
          />
        )}
        {viewMode === "admin" && canManagePolicies && (
          <>
            <div className="flex items-center space-x-2 mb-6">
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setSelectedView("overview")}
                  className={clsx(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    selectedView === "overview"
                      ? "bg-primary text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  )}
                >
                  Overview
                </button>
                <button
                  onClick={() => setSelectedView("compliance")}
                  className={clsx(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    selectedView === "compliance"
                      ? "bg-primary text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  )}
                >
                  Compliance
                </button>
                <button
                  onClick={() => setSelectedView("create")}
                  className={clsx(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    selectedView === "create"
                      ? "bg-primary text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  )}
                >
                  Create Policy
                </button>
              </div>
            </div>
            {selectedView === "overview" && (
              <div>
                {isLoadingStats ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-zinc-500 dark:text-zinc-400">
                        Loading policy statistics...
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <IconFileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              Total Policies
                            </p>
                            <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
                              {documents.length}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <IconCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              Compliant Policies
                            </p>
                            <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
                              {
                                documents.filter(
                                  (doc) =>
                                    calculatePolicyStats(doc).complianceRate ===
                                    100
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                            <IconClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                              Overdue
                            </p>
                            <p className="text-2xl font-semibold text-zinc-900 dark:text-white">
                              {
                                documents.filter(
                                  (doc) =>
                                    doc.acknowledgmentDeadline &&
                                    new Date() >
                                      new Date(doc.acknowledgmentDeadline)
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {documents.map((document) => {
                        const stats = calculatePolicyStats(document);
                        const isOverdue =
                          document.acknowledgmentDeadline &&
                          new Date() >
                            new Date(document.acknowledgmentDeadline);

                        return (
                          <div
                            key={document.id}
                            className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <IconShield className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                                      {document.name}
                                    </h3>
                                    {document.isTrainingDocument && (
                                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                                        Training
                                      </span>
                                    )}
                                    {isOverdue && (
                                      <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
                                        Overdue
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex items-center space-x-4 text-sm text-zinc-500 dark:text-zinc-400">
                                    <span>
                                      {(document as any).assignToEveryone
                                        ? "Everyone"
                                        : document.roles
                                            .map((r) => r.name)
                                            .join(", ")}
                                    </span>
                                    {document.acknowledgmentDeadline && (
                                      <>
                                        <span>•</span>
                                        <span>
                                          Due:{" "}
                                          {new Date(
                                            document.acknowledgmentDeadline
                                          ).toLocaleDateString()}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <div className="mt-2">
                                    <div className="flex items-center space-x-2">
                                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                          className={clsx(
                                            "h-2 rounded-full transition-all",
                                            stats.complianceRate === 100
                                              ? "bg-green-500"
                                              : stats.complianceRate >= 75
                                              ? "bg-yellow-500"
                                              : "bg-red-500"
                                          )}
                                          style={{
                                            width: `${stats.complianceRate}%`,
                                          }}
                                        />
                                      </div>
                                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                        {stats.acknowledged}/
                                        {stats.totalRequired} (
                                        {Math.round(stats.complianceRate)}%)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedDocumentForLink(document);
                                    setShowLinkManager(true);
                                  }}
                                  className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
                                  title="Generate Shareable Link"
                                >
                                  <IconShare className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => startEditPolicy(document)}
                                  className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
                                  title="Edit Policy"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                  >
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeletePolicy(document.id, document.name)
                                  }
                                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                  title="Delete Policy"
                                >
                                  <IconTrash className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {documents.length === 0 && (
                        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-8 text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                            <IconShield className="w-8 h-8 text-primary" />
                          </div>
                          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-1">
                            No policies yet
                          </h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-4">
                            Create your first policy to get started
                          </p>
                          <button
                            onClick={() => setSelectedView("create")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary/90 transition-colors"
                          >
                            <IconPlus className="w-4 h-4" />
                            Create Policy
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {selectedView === "compliance" && (
              <div>
                {complianceData ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white dark:bg-zinc-800 rounded-lg p-4">
                        <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                          {complianceData.overallStats.averageComplianceRate}%
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          Average Compliance
                        </div>
                      </div>
                      <div className="bg-white dark:bg-zinc-800 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {complianceData.overallStats.fullyCompliantCount}
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          Fully Compliant
                        </div>
                      </div>
                      <div className="bg-white dark:bg-zinc-800 rounded-lg p-4">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                          {complianceData.overallStats.overdueCount}
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          Overdue
                        </div>
                      </div>
                      <div className="bg-white dark:bg-zinc-800 rounded-lg p-4">
                        <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                          {complianceData.totalPolicies}
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          Total Policies
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                            Detailed Compliance Report
                          </h3>
                          <button
                            onClick={fetchComplianceData}
                            className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
                          >
                            <IconRefresh className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-zinc-50 dark:bg-zinc-900">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Policy
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Compliance Rate
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Users
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Details
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                            {complianceData.policies.map((policy: any) => (
                              <React.Fragment key={policy.id}>
                                <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center">
                                      <div>
                                        <div className="text-sm font-medium text-zinc-900 dark:text-white">
                                          {policy.name}
                                        </div>
                                        {policy.acknowledgmentDeadline && (
                                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                            Due:{" "}
                                            {new Date(
                                              policy.acknowledgmentDeadline
                                            ).toLocaleDateString()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-2">
                                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-20">
                                        <div
                                          className={clsx(
                                            "h-2 rounded-full",
                                            policy.complianceRate === 100
                                              ? "bg-green-500"
                                              : policy.complianceRate >= 75
                                              ? "bg-yellow-500"
                                              : "bg-red-500"
                                          )}
                                          style={{
                                            width: `${policy.complianceRate}%`,
                                          }}
                                        />
                                      </div>
                                      <span className="text-sm text-zinc-600 dark:text-zinc-400 min-w-[3rem]">
                                        {policy.complianceRate}%
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    {policy.isOverdue ? (
                                      <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
                                        Overdue
                                      </span>
                                    ) : policy.complianceRate === 100 ? (
                                      <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                                        Complete
                                      </span>
                                    ) : (
                                      <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full">
                                        Pending
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                    <div className="flex items-center space-x-4">
                                      <div className="text-green-600 dark:text-green-400">
                                        ✓ {policy.totalAcknowledged}
                                      </div>
                                      {policy.pendingUsers.length > 0 && (
                                        <div className="text-orange-600 dark:text-orange-400">
                                          ⏳ {policy.pendingUsers.length}
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => {
                                        setSelectedPolicyForModal(policy);
                                        setShowComplianceModal(true);
                                        setSearchTerm("");
                                        setFilterStatus("all");
                                        setCurrentPage(1);
                                      }}
                                      className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                                    >
                                      <IconUsers className="w-3 h-3" />
                                      <span>View Details</span>
                                    </button>
                                  </td>
                                </tr>
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-zinc-500 dark:text-zinc-400">
                        Loading compliance data...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedView === "create" && (
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                        Create New Policy
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Step {currentStep} of 5
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedView("overview");
                        setCurrentStep(1);
                        setNewPolicy({
                          name: "",
                          content: "",
                          externalUrl: "",
                          requiresAcknowledgment: true,
                          acknowledgmentDeadline: "",
                          acknowledgmentMethod: "signature",
                          acknowledgmentWord: "",
                          isTrainingDocument: false,
                          assignToEveryone: false,
                          roles: [],
                        });
                      }}
                      className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
                    >
                      <IconX className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-700 -translate-y-1/2" />
                      <div
                        className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-300 ease-out"
                        style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                      />

                      {[
                        { step: 1, label: "Basic Info", icon: IconFileText },
                        { step: 2, label: "Content", icon: IconFileText },
                        {
                          step: 3,
                          label: "Acknowledgment",
                          icon: IconSettings,
                        },
                        { step: 4, label: "Assignment", icon: IconUsers },
                        { step: 5, label: "Review", icon: IconCheck },
                      ].map(({ step, label, icon: StepIcon }) => (
                        <div
                          key={step}
                          className="flex flex-col items-center relative z-10"
                        >
                          <div
                            className={clsx(
                              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 border-2",
                              currentStep > step
                                ? "bg-green-500 border-green-500 text-white shadow-sm"
                                : currentStep === step
                                ? "bg-primary border-primary text-white shadow-lg"
                                : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500"
                            )}
                          >
                            {currentStep > step ? (
                              <IconCheck className="w-5 h-5" />
                            ) : (
                              <StepIcon className="w-5 h-5" />
                            )}
                          </div>
                          <div className="mt-2 text-center">
                            <span
                              className={clsx(
                                "text-xs font-medium",
                                currentStep >= step
                                  ? "text-zinc-900 dark:text-white"
                                  : "text-zinc-500 dark:text-zinc-400"
                              )}
                            >
                              {label}
                            </span>
                            <div
                              className={clsx(
                                "text-xs mt-0.5",
                                currentStep >= step
                                  ? "text-zinc-600 dark:text-zinc-300"
                                  : "text-zinc-400 dark:text-zinc-500"
                              )}
                            >
                              Step {step}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                          Policy Type & Basic Information
                        </h4>
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                            Policy Type *
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setPolicyMode("internal")}
                              className={clsx(
                                "p-4 rounded-lg border-2 text-left transition-colors",
                                policyMode === "internal"
                                  ? "border-primary bg-primary/5"
                                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                              )}
                            >
                              <div className="flex items-center space-x-3">
                                <IconFileText
                                  className={clsx(
                                    "w-5 h-5",
                                    policyMode === "internal"
                                      ? "text-primary"
                                      : "text-zinc-400"
                                  )}
                                />
                                <div>
                                  <div className="font-medium text-zinc-900 dark:text-white">
                                    Internal Policy
                                  </div>
                                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Create policy content directly
                                  </div>
                                </div>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPolicyMode("external")}
                              className={clsx(
                                "p-4 rounded-lg border-2 text-left transition-colors",
                                policyMode === "external"
                                  ? "border-primary bg-primary/5"
                                  : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                              )}
                            >
                              <div className="flex items-center space-x-3">
                                <IconExternalLink
                                  className={clsx(
                                    "w-5 h-5",
                                    policyMode === "external"
                                      ? "text-primary"
                                      : "text-zinc-400"
                                  )}
                                />
                                <div>
                                  <div className="font-medium text-zinc-900 dark:text-white">
                                    External Link
                                  </div>
                                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Link to an external document
                                  </div>
                                </div>
                              </div>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Policy Name *
                          </label>
                          <input
                            type="text"
                            value={newPolicy.name}
                            onChange={(e) =>
                              setNewPolicy({
                                ...newPolicy,
                                name: e.target.value,
                              })
                            }
                            placeholder="Enter policy name"
                            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                          {policyMode === "internal"
                            ? "Policy Content"
                            : "External Document"}
                        </h4>

                        {policyMode === "internal" ? (
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Policy Content *
                            </label>
                            <textarea
                              value={newPolicy.content}
                              onChange={(e) =>
                                setNewPolicy({
                                  ...newPolicy,
                                  content: e.target.value,
                                })
                              }
                              placeholder="Enter policy content"
                              rows={12}
                              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              Write the policy content that users need to
                              acknowledge.
                            </p>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              External URL *
                            </label>
                            <input
                              type="url"
                              value={newPolicy.externalUrl}
                              onChange={(e) =>
                                setNewPolicy({
                                  ...newPolicy,
                                  externalUrl: e.target.value,
                                })
                              }
                              placeholder="https://example.com/policy-document"
                              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              URL must use HTTPS. Users will be required to
                              visit this link before acknowledging.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                          Acknowledgment Settings
                        </h4>
                        <div className="mb-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newPolicy.requiresAcknowledgment}
                              onChange={(e) =>
                                setNewPolicy({
                                  ...newPolicy,
                                  requiresAcknowledgment: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                            />
                            <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                              Require user acknowledgment
                            </span>
                          </label>
                        </div>
                        {newPolicy.requiresAcknowledgment && (
                          <>
                            <div className="mb-6">
                              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                                Acknowledgment Method *
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex items-center p-3 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="acknowledgmentMethod"
                                    value="signature"
                                    checked={
                                      newPolicy.acknowledgmentMethod ===
                                      "signature"
                                    }
                                    onChange={(e) =>
                                      setNewPolicy({
                                        ...newPolicy,
                                        acknowledgmentMethod: e.target
                                          .value as any,
                                      })
                                    }
                                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
                                  />
                                  <div className="ml-3">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                      Digital Signature
                                    </span>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      Draw signature on canvas
                                    </p>
                                  </div>
                                </label>
                                <label className="flex items-center p-3 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="acknowledgmentMethod"
                                    value="type_username"
                                    checked={
                                      newPolicy.acknowledgmentMethod ===
                                      "type_username"
                                    }
                                    onChange={(e) =>
                                      setNewPolicy({
                                        ...newPolicy,
                                        acknowledgmentMethod: e.target
                                          .value as any,
                                      })
                                    }
                                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
                                  />
                                  <div className="ml-3">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                      Type Username
                                    </span>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      Type their username
                                    </p>
                                  </div>
                                </label>
                                <label className="flex items-center p-3 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="acknowledgmentMethod"
                                    value="checkbox"
                                    checked={
                                      newPolicy.acknowledgmentMethod ===
                                      "checkbox"
                                    }
                                    onChange={(e) =>
                                      setNewPolicy({
                                        ...newPolicy,
                                        acknowledgmentMethod: e.target
                                          .value as any,
                                      })
                                    }
                                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
                                  />
                                  <div className="ml-3">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                      Simple Checkbox
                                    </span>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      Click to acknowledge
                                    </p>
                                  </div>
                                </label>
                                <label className="flex items-center p-3 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="acknowledgmentMethod"
                                    value="type_word"
                                    checked={
                                      newPolicy.acknowledgmentMethod ===
                                      "type_word"
                                    }
                                    onChange={(e) =>
                                      setNewPolicy({
                                        ...newPolicy,
                                        acknowledgmentMethod: e.target
                                          .value as any,
                                      })
                                    }
                                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
                                  />
                                  <div className="ml-3">
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                      Type Word to Confirm
                                    </span>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                      Users must type a specific word
                                    </p>
                                  </div>
                                </label>
                              </div>
                              {newPolicy.acknowledgmentMethod ===
                                "type_word" && (
                                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Confirmation Word/Phrase *
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="e.g., UNDERSTOOD, AGREE, or a custom phrase"
                                    value={newPolicy.acknowledgmentWord}
                                    onChange={(e) =>
                                      setNewPolicy({
                                        ...newPolicy,
                                        acknowledgmentWord: e.target.value,
                                      })
                                    }
                                    className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                    required
                                  />
                                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                    Users must type this exact word/phrase to
                                    acknowledge the policy.
                                  </p>
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Acknowledgment Deadline (Optional)
                              </label>
                              <input
                                type="date"
                                value={newPolicy.acknowledgmentDeadline}
                                onChange={(e) =>
                                  setNewPolicy({
                                    ...newPolicy,
                                    acknowledgmentDeadline: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                              />
                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Optional deadline for users to acknowledge the
                                policy
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                          Assignment & Settings
                        </h4>
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Assign to Roles *
                          </label>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            <label className="flex items-center p-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-zinc-50 dark:bg-zinc-800">
                              <input
                                type="checkbox"
                                checked={newPolicy.assignToEveryone}
                                onChange={(e) => {
                                  setNewPolicy({
                                    ...newPolicy,
                                    assignToEveryone: e.target.checked,
                                    roles: e.target.checked
                                      ? []
                                      : newPolicy.roles,
                                  });
                                }}
                                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                              />
                              <span className="ml-2 text-sm font-medium text-zinc-900 dark:text-white">
                                📢 Everyone
                              </span>
                            </label>

                            {newPolicy.assignToEveryone && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                                This policy will be assigned to all current
                                roles in the workspace.
                              </p>
                            )}
                            {!newPolicy.assignToEveryone &&
                              roles.filter((role: any) => !role.isOwnerRole).map((role) => (
                                <label
                                  key={role.id}
                                  className="flex items-center"
                                >
                                  <input
                                    type="checkbox"
                                    checked={newPolicy.roles.includes(role.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNewPolicy({
                                          ...newPolicy,
                                          roles: [...newPolicy.roles, role.id],
                                        });
                                      } else {
                                        setNewPolicy({
                                          ...newPolicy,
                                          roles: newPolicy.roles.filter(
                                            (r) => r !== role.id
                                          ),
                                        });
                                      }
                                    }}
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                                  />
                                  <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                                    {role.name}
                                  </span>
                                </label>
                              ))}
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newPolicy.isTrainingDocument}
                              onChange={(e) =>
                                setNewPolicy({
                                  ...newPolicy,
                                  isTrainingDocument: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                            />
                            <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                              Create Document
                            </span>
                          </label>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Create a Document but require an acknowledgment
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 5 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                          Review & Create
                        </h4>

                        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 space-y-4">
                          <div>
                            <h5 className="font-medium text-zinc-900 dark:text-white">
                              Policy Overview
                            </h5>
                            <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                              <p>
                                <strong>Type:</strong>{" "}
                                {policyMode === "internal"
                                  ? "Internal Policy"
                                  : "External Link"}
                              </p>
                              <p>
                                <strong>Name:</strong>{" "}
                                {newPolicy.name || "No name specified"}
                              </p>
                              {newPolicy.isTrainingDocument && (
                                <p>
                                  <strong>Training Document:</strong> Yes
                                </p>
                              )}
                            </div>
                          </div>

                          {newPolicy.requiresAcknowledgment && (
                            <div>
                              <h5 className="font-medium text-zinc-900 dark:text-white">
                                Acknowledgment Settings
                              </h5>
                              <div className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                                <p>
                                  <strong>Method:</strong>{" "}
                                  {newPolicy.acknowledgmentMethod ===
                                  "signature"
                                    ? "Digital Signature"
                                    : newPolicy.acknowledgmentMethod ===
                                      "type_username"
                                    ? "Type Username"
                                    : newPolicy.acknowledgmentMethod ===
                                      "type_word"
                                    ? "Type Word to Confirm"
                                    : "Simple Checkbox"}
                                </p>
                                {newPolicy.acknowledgmentMethod ===
                                  "type_word" &&
                                  newPolicy.acknowledgmentWord && (
                                    <p>
                                      <strong>Required Word:</strong> "
                                      {newPolicy.acknowledgmentWord}"
                                    </p>
                                  )}
                                {newPolicy.acknowledgmentDeadline && (
                                  <p>
                                    <strong>Deadline:</strong>{" "}
                                    {new Date(
                                      newPolicy.acknowledgmentDeadline
                                    ).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <div>
                            <h5 className="font-medium text-zinc-900 dark:text-white">
                              Assignment
                            </h5>
                            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                              {newPolicy.assignToEveryone ? (
                                <p>
                                  📢 <strong>Everyone</strong> (Entire
                                  Workspace)
                                </p>
                              ) : newPolicy.roles.length > 0 ? (
                                <p>
                                  <strong>Roles:</strong>{" "}
                                  {roles
                                    .filter((r) =>
                                      newPolicy.roles.includes(r.id)
                                    )
                                    .map((r) => r.name)
                                    .join(", ")}
                                </p>
                              ) : (
                                <p className="text-red-500">
                                  No roles assigned
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                  <div className="flex space-x-2">
                    {currentStep > 1 && (
                      <button
                        onClick={prevStep}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        <IconChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </button>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    {currentStep < 5 ? (
                      <button
                        onClick={nextStep}
                        disabled={!canProceedToNextStep()}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                        <IconChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    ) : (
                      <button
                        onClick={createPolicy}
                        disabled={isCreatingPolicy || !canProceedToNextStep()}
                        className="inline-flex items-center px-6 py-2 text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isCreatingPolicy ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <IconPlus className="w-4 h-4 mr-2" />
                            Create Policy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedView === "edit" && (
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                        Edit Policy
                      </h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Step {currentStep} of 5
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedView("overview");
                        setCurrentStep(1);
                        setEditPolicy({
                          id: "",
                          name: "",
                          content: "",
                          externalUrl: "",
                          requiresAcknowledgment: true,
                          acknowledgmentDeadline: "",
                          acknowledgmentMethod: "signature",
                          acknowledgmentWord: "",
                          isTrainingDocument: false,
                          assignToEveryone: false,
                          roles: [],
                        });
                      }}
                      className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md"
                    >
                      <IconX className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-700 -translate-y-1/2" />
                      <div
                        className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-300 ease-out"
                        style={{ width: `${((currentStep - 1) / 4) * 100}%` }}
                      />
                      {[
                        { step: 1, label: "Basic Info", icon: IconFileText },
                        { step: 2, label: "Content", icon: IconFileText },
                        {
                          step: 3,
                          label: "Acknowledgment",
                          icon: IconSettings,
                        },
                        { step: 4, label: "Assignment", icon: IconUsers },
                        { step: 5, label: "Review", icon: IconCheck },
                      ].map(({ step, label, icon: StepIcon }) => (
                        <div
                          key={step}
                          className="flex flex-col items-center relative z-10"
                        >
                          <div
                            className={clsx(
                              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 border-2",
                              currentStep > step
                                ? "bg-green-500 border-green-500 text-white shadow-sm"
                                : currentStep === step
                                ? "bg-primary border-primary text-white shadow-lg"
                                : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500"
                            )}
                          >
                            {currentStep > step ? (
                              <IconCheck className="w-5 h-5" />
                            ) : (
                              <StepIcon className="w-5 h-5" />
                            )}
                          </div>
                          <div className="mt-2 text-center">
                            <span
                              className={clsx(
                                "text-xs font-medium",
                                currentStep >= step
                                  ? "text-zinc-900 dark:text-white"
                                  : "text-zinc-500 dark:text-zinc-400"
                              )}
                            >
                              {label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-6">
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                          Policy Information
                        </h4>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Policy Name *
                            </label>
                            <input
                              type="text"
                              value={editPolicy.name}
                              onChange={(e) =>
                                setEditPolicy({
                                  ...editPolicy,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Enter policy name"
                              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Policy Type *
                            </label>
                            <div className="flex space-x-4">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="policyType"
                                  value="internal"
                                  checked={policyMode === "internal"}
                                  onChange={(e) =>
                                    setPolicyMode(
                                      e.target.value as "internal" | "external"
                                    )
                                  }
                                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
                                />
                                <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                                  Internal Document
                                </span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="policyType"
                                  value="external"
                                  checked={policyMode === "external"}
                                  onChange={(e) =>
                                    setPolicyMode(
                                      e.target.value as "internal" | "external"
                                    )
                                  }
                                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
                                />
                                <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                                  External Link
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                          {policyMode === "internal"
                            ? "Policy Content"
                            : "External Document"}
                        </h4>

                        {policyMode === "internal" ? (
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Policy Content *
                            </label>
                            <textarea
                              value={editPolicy.content}
                              onChange={(e) =>
                                setEditPolicy({
                                  ...editPolicy,
                                  content: e.target.value,
                                })
                              }
                              placeholder="Enter policy content"
                              rows={12}
                              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              Write the policy content that users need to
                              acknowledge.
                            </p>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              External URL *
                            </label>
                            <input
                              type="url"
                              value={editPolicy.externalUrl}
                              onChange={(e) =>
                                setEditPolicy({
                                  ...editPolicy,
                                  externalUrl: e.target.value,
                                })
                              }
                              placeholder="https://example.com/policy-document"
                              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                            />
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              URL must use HTTPS. Users will be required to
                              visit this link before acknowledging.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                          Acknowledgment Settings
                        </h4>

                        <div className="mb-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editPolicy.requiresAcknowledgment}
                              onChange={(e) =>
                                setEditPolicy({
                                  ...editPolicy,
                                  requiresAcknowledgment: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                            />
                            <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                              Require user acknowledgment
                            </span>
                          </label>
                        </div>

                        {editPolicy.requiresAcknowledgment && (
                          <>
                            <div className="mb-6">
                              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                                Acknowledgment Method *
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <label className="flex items-center p-3 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="editAcknowledgmentMethod"
                                    value="signature"
                                    checked={
                                      editPolicy.acknowledgmentMethod ===
                                      "signature"
                                    }
                                    onChange={(e) =>
                                      setEditPolicy({
                                        ...editPolicy,
                                        acknowledgmentMethod: e.target
                                          .value as any,
                                      })
                                    }
                                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
                                  />
                                  <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                                    Digital Signature
                                  </span>
                                </label>
                                <label className="flex items-center p-3 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="editAcknowledgmentMethod"
                                    value="checkbox"
                                    checked={
                                      editPolicy.acknowledgmentMethod ===
                                      "checkbox"
                                    }
                                    onChange={(e) =>
                                      setEditPolicy({
                                        ...editPolicy,
                                        acknowledgmentMethod: e.target
                                          .value as any,
                                      })
                                    }
                                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
                                  />
                                  <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                                    Checkbox
                                  </span>
                                </label>
                                <label className="flex items-center p-3 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="editAcknowledgmentMethod"
                                    value="type_username"
                                    checked={
                                      editPolicy.acknowledgmentMethod ===
                                      "type_username"
                                    }
                                    onChange={(e) =>
                                      setEditPolicy({
                                        ...editPolicy,
                                        acknowledgmentMethod: e.target
                                          .value as any,
                                      })
                                    }
                                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
                                  />
                                  <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                                    Type Username
                                  </span>
                                </label>
                                <label className="flex items-center p-3 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                                  <input
                                    type="radio"
                                    name="editAcknowledgmentMethod"
                                    value="type_word"
                                    checked={
                                      editPolicy.acknowledgmentMethod ===
                                      "type_word"
                                    }
                                    onChange={(e) =>
                                      setEditPolicy({
                                        ...editPolicy,
                                        acknowledgmentMethod: e.target
                                          .value as any,
                                      })
                                    }
                                    className="w-4 h-4 text-primary border-gray-300 focus:ring-primary/50"
                                  />
                                  <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                                    Type Word
                                  </span>
                                </label>
                              </div>
                            </div>

                            {editPolicy.acknowledgmentMethod ===
                              "type_word" && (
                              <div className="mb-6">
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                  Required Word *
                                </label>
                                <input
                                  type="text"
                                  value={editPolicy.acknowledgmentWord}
                                  onChange={(e) =>
                                    setEditPolicy({
                                      ...editPolicy,
                                      acknowledgmentWord: e.target.value,
                                    })
                                  }
                                  placeholder="Enter word users must type"
                                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                />
                              </div>
                            )}

                            <div className="mb-6">
                              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Acknowledgment Deadline (Optional)
                              </label>
                              <input
                                type="date"
                                value={editPolicy.acknowledgmentDeadline}
                                onChange={(e) =>
                                  setEditPolicy({
                                    ...editPolicy,
                                    acknowledgmentDeadline: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                              />
                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Set a deadline by when users must acknowledge
                                this policy.
                              </p>
                            </div>
                          </>
                        )}

                        <div className="mb-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={editPolicy.isTrainingDocument}
                              onChange={(e) =>
                                setEditPolicy({
                                  ...editPolicy,
                                  isTrainingDocument: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                            />
                            <span className="ml-2 text-sm text-zinc-700 dark:text-zinc-300">
                              Mark as training document
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                          Policy Assignment
                        </h4>

                        <div className="mb-6">
                          <label className="flex items-center p-4 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editPolicy.assignToEveryone}
                              onChange={(e) =>
                                setEditPolicy({
                                  ...editPolicy,
                                  assignToEveryone: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                            />
                            <span className="ml-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              Assign to everyone in the workspace
                            </span>
                          </label>
                        </div>

                        {!editPolicy.assignToEveryone && (
                          <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                              Select Roles *
                            </label>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {roles.filter((role: any) => !role.isOwnerRole).map((role) => (
                                <label
                                  key={role.id}
                                  className="flex items-center p-3 border border-gray-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={editPolicy.roles.includes(role.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setEditPolicy({
                                          ...editPolicy,
                                          roles: [...editPolicy.roles, role.id],
                                        });
                                      } else {
                                        setEditPolicy({
                                          ...editPolicy,
                                          roles: editPolicy.roles.filter(
                                            (r) => r !== role.id
                                          ),
                                        });
                                      }
                                    }}
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary/50"
                                  />
                                  <span className="ml-3 text-sm text-zinc-700 dark:text-zinc-300">
                                    {role.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 5 && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
                          Review Policy Changes
                        </h4>

                        <div className="space-y-4">
                          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                              Policy Name
                            </h5>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {editPolicy.name}
                            </p>
                          </div>

                          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                              Content Type
                            </h5>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {policyMode === "internal"
                                ? "Internal Document"
                                : `External Link: ${editPolicy.externalUrl}`}
                            </p>
                          </div>

                          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                              Acknowledgment
                            </h5>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {editPolicy.requiresAcknowledgment ? (
                                <>
                                  Required ({editPolicy.acknowledgmentMethod})
                                  {editPolicy.acknowledgmentDeadline &&
                                    ` - Due: ${new Date(
                                      editPolicy.acknowledgmentDeadline
                                    ).toLocaleDateString()}`}
                                </>
                              ) : (
                                "Not required"
                              )}
                            </p>
                          </div>

                          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                              Assignment
                            </h5>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {editPolicy.assignToEveryone
                                ? "Everyone in workspace"
                                : `${editPolicy.roles.length} selected roles`}
                            </p>
                          </div>

                          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-zinc-900 dark:text-white mb-2">
                              Document Type
                            </h5>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                              {editPolicy.isTrainingDocument
                                ? "Training Document"
                                : "Policy Document"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                      onClick={prevStep}
                      disabled={currentStep === 1}
                      className={clsx(
                        "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        currentStep === 1
                          ? "text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                      )}
                    >
                      <IconChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </button>

                    <div className="flex items-center space-x-2">
                      {currentStep < 5 ? (
                        <button
                          onClick={nextStep}
                          disabled={!canProceedToNextStep()}
                          className={clsx(
                            "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                            canProceedToNextStep()
                              ? "bg-primary text-white hover:bg-primary/90"
                              : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                          )}
                        >
                          Continue
                          <IconChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      ) : (
                        <button
                          onClick={updatePolicy}
                          disabled={isCreatingPolicy || !canProceedToNextStep()}
                          className={clsx(
                            "flex items-center px-6 py-2 text-sm font-medium rounded-md transition-colors",
                            canProceedToNextStep() && !isCreatingPolicy
                              ? "bg-green-600 text-white hover:bg-green-700"
                              : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                          )}
                        >
                          {isCreatingPolicy ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <IconCheck className="w-4 h-4 mr-2" />
                              Update Policy
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {showComplianceModal && selectedPolicyForModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      {selectedPolicyForModal.name} - Compliance Details
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      {selectedPolicyForModal.pendingUsers.length +
                        selectedPolicyForModal.totalAcknowledged}{" "}
                      total users
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowComplianceModal(false);
                      setSelectedPolicyForModal(null);
                      setSearchTerm("");
                      setFilterStatus("all");
                      setCurrentPage(1);
                    }}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
                  >
                    <IconX className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/30">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full pl-10 pr-4 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 dark:placeholder-zinc-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <IconUser className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                    </div>
                  </div>

                  <div className="sm:w-48">
                    <select
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(
                          e.target.value as "all" | "pending" | "acknowledged"
                        );
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Users</option>
                      <option value="pending">Pending Only</option>
                      <option value="acknowledged">Acknowledged Only</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {(() => {
                  const pendingUsers = selectedPolicyForModal.pendingUsers.map(
                    (user: any) => ({
                      ...user,
                      status: "pending" as const,
                    })
                  );

                  const acknowledgedUsers =
                    selectedPolicyForModal.recentAcknowledgments?.map(
                      (ack: any) => ({
                        userid: ack.user.userid,
                        username: ack.user.username,
                        picture: ack.user.picture,
                        status: "acknowledged" as const,
                        acknowledgedAt: ack.acknowledgedAt,
                      })
                    ) || [];

                  const allUsers = [...pendingUsers, ...acknowledgedUsers];

                  const filteredUsers = allUsers.filter((user) => {
                    const matchesSearch =
                      searchTerm === "" ||
                      (user.username &&
                        user.username
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase()));

                    const matchesStatus =
                      filterStatus === "all" || user.status === filterStatus;

                    return matchesSearch && matchesStatus;
                  });

                  const totalUsers = filteredUsers.length;
                  const totalPages = Math.ceil(totalUsers / usersPerPage);
                  const startIndex = (currentPage - 1) * usersPerPage;
                  const endIndex = startIndex + usersPerPage;
                  const currentUsers = filteredUsers.slice(
                    startIndex,
                    endIndex
                  );

                  if (filteredUsers.length === 0) {
                    return (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <IconUser className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                          <p className="text-zinc-500 dark:text-zinc-400">
                            {searchTerm || filterStatus !== "all"
                              ? "No users match your search criteria"
                              : "No users found"}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="p-6">
                        <div className="space-y-3">
                          {currentUsers.map((user, index) => (
                            <div
                              key={`${user.userid}-${user.status}`}
                              className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                            >
                              <div className="flex items-center space-x-3">
                                {user.picture ? (
                                  <img
                                    src={user.picture}
                                    alt={user.username || `User ${user.userid}`}
                                    className="w-8 h-8 rounded-full"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-zinc-300 dark:bg-zinc-600 rounded-full flex items-center justify-center">
                                    <IconUser className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-medium text-zinc-900 dark:text-white">
                                    {user.username || `User ${user.userid}`}
                                  </div>
                                  {user.status === "acknowledged" &&
                                    user.acknowledgedAt && (
                                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                        Acknowledged on{" "}
                                        {new Date(
                                          user.acknowledgedAt
                                        ).toLocaleDateString()}{" "}
                                        at{" "}
                                        {new Date(
                                          user.acknowledgedAt
                                        ).toLocaleTimeString()}
                                      </div>
                                    )}
                                </div>
                              </div>
                              <div className="flex items-center">
                                {user.status === "pending" ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mr-1.5"></span>
                                    Pending
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                    <IconCheck className="w-3 h-3 mr-1" />
                                    Acknowledged
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/30">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                              Showing {startIndex + 1} to{" "}
                              {Math.min(endIndex, totalUsers)} of {totalUsers}{" "}
                              users
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() =>
                                  setCurrentPage(Math.max(1, currentPage - 1))
                                }
                                disabled={currentPage === 1}
                                className={clsx(
                                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                                  currentPage === 1
                                    ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                                    : "bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                )}
                              >
                                <IconChevronLeft className="w-4 h-4" />
                              </button>

                              <span className="text-sm text-zinc-700 dark:text-zinc-300 px-2">
                                {currentPage} of {totalPages}
                              </span>

                              <button
                                onClick={() =>
                                  setCurrentPage(
                                    Math.min(totalPages, currentPage + 1)
                                  )
                                }
                                disabled={currentPage === totalPages}
                                className={clsx(
                                  "px-3 py-1.5 text-sm rounded-md transition-colors",
                                  currentPage === totalPages
                                    ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                                    : "bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                )}
                              >
                                <IconChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {selectedDocumentForLink && (
          <PolicyLinkManager
            isOpen={showLinkManager}
            onClose={() => {
              setShowLinkManager(false);
              setSelectedDocumentForLink(null);
            }}
            document={selectedDocumentForLink}
            workspaceId={router.query.id as string}
          />
        )}

        {showDeleteModal && policyToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                Confirm Deletion
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
                Are you sure you want to delete <strong>{policyToDelete.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPolicyToDelete(null);
                  }}
                  className="px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeletePolicy}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

PoliciesPage.layout = Workspace;

export default PoliciesPage;
