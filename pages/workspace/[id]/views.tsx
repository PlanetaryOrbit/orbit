import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import { Fragment, useEffect, useState } from "react";
import { Dialog, Popover, Transition } from "@headlessui/react";
import { GetServerSidePropsContext } from "next";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import Input from "@/components/input";
import { v4 as uuidv4 } from "uuid";
import prisma from "@/utils/database";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { FormProvider, useForm } from "react-hook-form";
import {
  inactivityNotice,
  userBook,
  wallPost,
} from "@prisma/client";
import Checkbox from "@/components/checkbox";
import toast from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/router";
import moment from "moment";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { getConfig } from "@/utils/configEngine";
import { SAVED_VIEW_NAME_MAX_LENGTH } from "@/utils/savedViewLimits";
import StaffOrgChart from "@/components/views/StaffOrgChart";
import type { OrgChartEdge, OrgChartNode } from "@/components/views/StaffOrgChart";
import clsx from "clsx";
import {
  ViewsPageShell,
  ViewsPageHeader,
  ViewsPanel,
  viewsPanelShadow,
} from "@/components/views/shell";
import {
  IconArrowLeft,
  IconFilter,
  IconPlus,
  IconSearch,
  IconUsers,
  IconX,
  IconUserCheck,
  IconAlertCircle,
  IconShieldX,
  IconBriefcase,
  IconFile,
  IconFolder,
  IconBox,
  IconId,
  IconTools,
  IconTag,
  IconPin,
  IconStar,
  IconSparkles,
  IconBell,
  IconLock,
  IconArrowUp,
  IconArrowDown,
  IconAlertTriangle,
  IconCoffee,
  IconSchool,
  IconTarget,
  IconCalendarWeekFilled,
  IconSpeakerphone,
  IconPencil,
  IconDeviceFloppy,
  IconTrash,
  IconSitemap,
} from "@tabler/icons-react";

type User = {
  info: {
    userId: BigInt;
    username: string | null;
    picture: string | null;
  };
  book: userBook[];
  wallPosts: wallPost[];
  inactivityNotices: inactivityNotice[];
  sessions: any[];
  rankID: number;
  rankName: string | null;
  minutes: number;
  idleMinutes: number;
  hostedSessions: { length: number };
  sessionsAttended: number;
  allianceVisits: number;
  messages: number;
  registered: boolean;
  quota: boolean;
  departments?: string[];
};

export const getServerSideProps = withPermissionCheckSsr(
  async ({ params, req }: GetServerSidePropsContext) => {
    const workspaceGroupId = parseInt(params?.id as string)

    const currentUserId = (req as any).auth?.userId as bigint

    const currentUser = await prisma.user.findFirst({
      where: { userid: currentUserId },
      include: {
        workspaceMemberships: { where: { workspaceGroupId } },
        roles: { where: { workspaceGroupId } },
      },
    })

    const membership = currentUser?.workspaceMemberships?.[0]
    const isAdmin = membership?.isAdmin || false
    const userRole = currentUser?.roles?.[0]
    const hasManageViewsPerm = userRole?.permissions?.includes("edit_views") || false
    const hasCreateViewsPerm = userRole?.permissions?.includes("create_views") || false
    const hasDeleteViewsPerm = userRole?.permissions?.includes("delete_views") || false
    const hasUseSavedViewsPerm = userRole?.permissions?.includes("use_views") || false
    const hasViewMemberProfiles = isAdmin || userRole?.permissions?.includes("view_member_profiles") || false

    const departments = await prisma.department.findMany({
      where: { workspaceGroupId },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    })

    return {
      props: {
        isAdmin,
        hasManageViewsPerm,
        hasCreateViewsPerm,
        hasDeleteViewsPerm,
        hasUseSavedViewsPerm,
        hasViewMemberProfiles,
        departments: JSON.parse(JSON.stringify(departments)),
      },
    }
  },
  "view_members"
)

const filters: {
  [key: string]: string[];
} = {
  username: ["equal", "notEqual", "contains"],
  minutes: ["equal", "greaterThan", "lessThan"],
  idle: ["equal", "greaterThan", "lessThan"],
  rank: ["equal", "notEqual", "greaterThan", "lessThan"],
  sessions: ["equal", "notEqual", "greaterThan", "lessThan"],
  hosted: ["equal", "notEqual", "greaterThan", "lessThan"],
  warnings: ["equal", "notEqual", "greaterThan", "lessThan"],
  messages: ["equal", "notEqual", "greaterThan", "lessThan"],
  notices: ["equal", "greaterThan", "lessThan"],
  registered: ["equal", "notEqual"],
  quota: ["equal", "notEqual"],
  department: ["equal", "notEqual"],
};

const filterNames: {
  [key: string]: string;
} = {
  equal: "Equals",
  notEqual: "Does not equal",
  contains: "Contains",
  greaterThan: "Greater than",
  lessThan: "Less than",
};

function normalizeSavedViewName(input: string): string {
  const t = input.trim();
  if (t.length > 0) return t.slice(0, SAVED_VIEW_NAME_MAX_LENGTH);
  return `View ${new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`.slice(0, SAVED_VIEW_NAME_MAX_LENGTH);
}

type pageProps = {
  isAdmin: boolean;
  hasManageViewsPerm: boolean;
  hasCreateViewsPerm: boolean;
  hasDeleteViewsPerm: boolean;
  hasUseSavedViewsPerm: boolean;
  hasViewMemberProfiles: boolean;
  departments: Array<{ id: string; name: string; color: string | null }>;
};
const Views: pageWithLayout<pageProps> = ({ isAdmin, hasManageViewsPerm, hasCreateViewsPerm, hasDeleteViewsPerm, hasUseSavedViewsPerm, hasViewMemberProfiles, departments }) => {
  const [login, setLogin] = useRecoilState(loginState);
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const router = useRouter();
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [viewToDelete, setViewToDelete] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("");
  const [minutes, setMinutes] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [ranks, setRanks] = useState<{ id: number; rank: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [colFilters, setColFilters] = useState<
    {
      id: string;
      column: string;
      filter: string;
      value: string;
    }[]
  >([]);
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveColor, setSaveColor] = useState("");
  const [saveIcon, setSaveIcon] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalViewConfig, setOriginalViewConfig] = useState<any>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [totalUsers, setTotalUsers] = useState(0);
  const [mainPanelMode, setMainPanelMode] = useState<"table" | "orgChart">("table");
  const [orgChartData, setOrgChartData] = useState<{
    nodes: OrgChartNode[];
    edges: OrgChartEdge[];
  } | null>(null);
  const [orgChartLoading, setOrgChartLoading] = useState(false);

  const ICON_OPTIONS: { key: string; Icon: any; title?: string }[] = [
    { key: "star", Icon: IconStar, title: "Star" },
    { key: "sparkles", Icon: IconSparkles, title: "Sparkles" },
    { key: "briefcase", Icon: IconBriefcase, title: "Briefcase" },
    { key: "target", Icon: IconTarget, title: "Target" },
    { key: "alert", Icon: IconAlertTriangle, title: "Warning" },
    { key: "calendar", Icon: IconCalendarWeekFilled, title: "Calendar" },
    { key: "speakerphone", Icon: IconSpeakerphone, title: "Speakerphone" },
    { key: "file", Icon: IconFile, title: "File" },
    { key: "folder", Icon: IconFolder, title: "Folder" },
    { key: "box", Icon: IconBox, title: "Box" },
    { key: "id", Icon: IconId, title: "ID" },
    { key: "tools", Icon: IconTools, title: "Tools" },
    { key: "tag", Icon: IconTag, title: "Tag" },
    { key: "pin", Icon: IconPin, title: "Pin" },
    { key: "bell", Icon: IconBell, title: "Bell" },
    { key: "lock", Icon: IconLock, title: "Lock" },
    { key: "coffee", Icon: IconCoffee, title: "Coffee" },
    { key: "school", Icon: IconSchool, title: "School" },
  ];

  const renderIcon = (key: string, className = "w-5 h-5") => {
    const found = ICON_OPTIONS.find((i) => i.key === key);
    if (!found) return null;
    const C = found.Icon;
    return <C className={className} />;
  };

  const hasManageViews = () => {
    return isAdmin || hasManageViewsPerm;
  };

  const hasCreateViews = () => {
    return isAdmin || hasCreateViewsPerm;
  };

  const hasDeleteViews = () => {
    return isAdmin || hasDeleteViewsPerm;
  };

  const hasUseSavedViews = () => {
    return isAdmin || hasUseSavedViewsPerm;
  };

  const columnHelper = createColumnHelper<User>();

  const updateUsers = async (query: string) => {};

  const columns = [
    {
      id: "select",
      header: ({ table }: any) => (
        <Checkbox
          {...{
            checked: table.getIsAllRowsSelected(),
            indeterminate: table.getIsSomeRowsSelected(),
            onChange: table.getToggleAllRowsSelectedHandler(),
          }}
        />
      ),
      cell: ({ row }: any) => (
        <Checkbox
          {...{
            checked: row.getIsSelected(),
            indeterminate: row.getIsSomeSelected(),
            onChange: row.getToggleSelectedHandler(),
          }}
        />
      ),
    },
    columnHelper.accessor("info", {
      header: "User",
      cell: (row) => {
        return (
          <div
            className={`flex flex-row ${hasViewMemberProfiles ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => {
              if (hasViewMemberProfiles) {
                router.push(
                  `/workspace/${router.query.id}/profile/${row.getValue().userId}`
                );
              }
            }}
          >
            <div
              className={clsx(
                "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full",
                getRandomBg(row.getValue().userId.toString(), row.getValue().username ?? undefined)
              )}
            >
              <img
                src={`/api/user/${row.getValue().userId}/avatar`}
                className="h-10 w-10 rounded-full border-2 border-white object-cover dark:border-zinc-900"
                style={{ background: "transparent" }}
                alt=""
              />
            </div>
            <p
              title={row.getValue().username || undefined}
              className="my-auto truncate px-2 text-sm font-semibold text-zinc-900 dark:text-white"
            >
              {row.getValue().username}
            </p>
          </div>
        );
      },
    }),
    columnHelper.accessor("rankName", {
      header: "Rank",
      cell: (row) => {
        return (
          <p className="dark:text-white">
            {row.getValue() || "Guest"}
          </p>
        );
      },
    }),
    columnHelper.accessor("hostedSessions", {
      header: "Hosted sessions",
      cell: (row) => {
        const hosted = row.getValue() as any;
        const len =
          hosted && typeof hosted.length === "number" ? hosted.length : 0;
        return <p className="dark:text-white">{len}</p>;
      },
    }),
    columnHelper.accessor("sessionsAttended", {
      header: "Sessions Attended",
      cell: (row) => {
        return <p className="dark:text-white">{row.getValue()}</p>;
      },
    }),
    columnHelper.accessor("allianceVisits", {
      header: "Alliance Visits",
      cell: (row) => {
        return <p className="dark:text-white">{row.getValue()}</p>;
      },
    }),
    columnHelper.accessor("book", {
      header: "Warnings",
      cell: (row) => {
        const book = row.getValue() as any[];
        const warnings = Array.isArray(book)
          ? book.filter((b) => b.type === "warning").length
          : 0;
        return <p className="dark:text-white">{warnings}</p>;
      },
    }),
    columnHelper.accessor("inactivityNotices", {
      header: "Inactivity notices",
      cell: (row) => {
        return <p className="dark:text-white">{row.getValue().length}</p>;
      },
    }),
    columnHelper.accessor("minutes", {
      header: "Minutes",
      cell: (row) => {
        return <p className="dark:text-white">{row.getValue()}</p>;
      },
    }),
    columnHelper.accessor("idleMinutes", {
      header: "Idle minutes",
      cell: (row) => {
        return <p className="dark:text-white">{row.getValue()}</p>;
      },
    }),
    columnHelper.accessor("messages", {
      header: "Messages",
      cell: (row) => {
        return <p className="dark:text-white">{row.getValue()}</p>;
      },
    }),
    columnHelper.accessor("registered", {
      header: "Registered",
      cell: (row) => {
        return <p>{row.getValue() ? "✅" : "❌"}</p>;
      },
    }),
    columnHelper.accessor("quota", {
      header: "Quota Complete",
      cell: (row) => {
        return <p>{row.getValue() ? "✅" : "❌"}</p>;
      },
    }),
  ];

  const [columnVisibility, setColumnVisibility] = useState({
    info: true,
    rankID: true,
    book: true,
    minutes: true,
    idleMinutes: true,
    select: true,
    hostedSessions: false,
    sessionsAttended: false,
    allianceVisits: false,
    inactivityNotices: false,
    messages: false,
    registered: false,
    quota: false,
  });

  const table = useReactTable({
    columns,
    data: users,
    state: {
      sorting,
      rowSelection,
      // @ts-ignore
      columnVisibility,
      pagination,
    },
    // @ts-ignore
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalUsers / pagination.pageSize),
  });

  const newfilter = () => {
    setColFilters([
      ...colFilters,
      { id: uuidv4(), column: "username", filter: "equal", value: "" },
    ]);
  };
  const removeFilter = (id: string) => {
    setColFilters(colFilters.filter((filter) => filter.id !== id));
  };
  const updateFilter = (
    id: string,
    column: string,
    filter: string,
    value: string
  ) => {
    const OBJ = Object.assign([] as typeof colFilters, colFilters);
    const index = OBJ.findIndex((filter) => filter.id === id);
    OBJ[index] = { id, column, filter, value };
    setColFilters(OBJ);
  };

  const loadSavedViews = async () => {
    try {
      const res = await axios.get(`/api/workspace/${router.query.id}/views`);
      if (res.data && res.data.views) setSavedViews(res.data.views || []);
    } catch (e) {
      console.error("Failed to load saved views", e);
    }
  };

  useEffect(() => {
    if (router.query.id && hasUseSavedViews()) loadSavedViews();
  }, [router.query.id]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [colFilters]);

  useEffect(() => {
    const fetchStaffData = async () => {
      if (!router.query.id || mainPanelMode !== "table") return;

      setIsLoading(true);
      try {
        const res = await axios.get(
          `/api/workspace/${router.query.id}/views/staff`,
          {
            params: {
              page: pagination.pageIndex,
              pageSize: pagination.pageSize,
              filters: JSON.stringify(colFilters),
            },
          }
        );

        if (res.data) {
          setUsers(res.data.users || []);
          setRanks(res.data.ranks || []);
          setTotalUsers(res.data.pagination?.totalUsers || 0);
        }
      } catch (error) {
        console.error("Failed to fetch staff data:", error);
        toast.error("Failed to load staff data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaffData();
  }, [
    router.query.id,
    pagination.pageIndex,
    pagination.pageSize,
    colFilters,
    mainPanelMode,
  ]);

  useEffect(() => {
    if (!router.query.id || mainPanelMode !== "orgChart") return;

    let cancelled = false;
    setOrgChartLoading(true);
    axios
      .get(`/api/workspace/${router.query.id}/views/org-chart`)
      .then((res) => {
        if (!cancelled && res.data) {
          setOrgChartData({
            nodes: res.data.nodes || [],
            edges: res.data.edges || [],
          });
        }
      })
      .catch((err) => {
        console.error("Failed to load org chart:", err);
        if (!cancelled) {
          toast.error("Failed to load org chart");
          setOrgChartData({ nodes: [], edges: [] });
        }
      })
      .finally(() => {
        if (!cancelled) setOrgChartLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router.query.id, mainPanelMode]);

  const applySavedView = (view: any) => {
    if (!view) return;
    setMainPanelMode("table");
    const filtersField = view.filters;
    if (Array.isArray(filtersField)) {
      setColFilters(filtersField || []);
    } else if (filtersField && typeof filtersField === "object") {
      setColFilters(filtersField.filters || []);
      if (filtersField.sorting && Array.isArray(filtersField.sorting)) {
        try {
          setSorting(filtersField.sorting);
        } catch (e) {
          console.error("Failed to apply saved sorting", e);
        }
      } else {
        setSorting([]);
      }
    } else {
      setColFilters([]);
    }

    setColumnVisibility(view.columnVisibility || {});
    setOriginalViewConfig({
      filters: JSON.parse(JSON.stringify(filtersField)),
      columnVisibility: JSON.parse(JSON.stringify(view.columnVisibility || {})),
      sorting: JSON.parse(JSON.stringify(filtersField?.sorting || [])),
    });
    setIsEditMode(false);
  };

  const resetToDefault = () => {
    setMainPanelMode("table");
    setSelectedViewId(null);
    setColFilters([]);
    setColumnVisibility({
      info: true,
      rankID: true,
      book: true,
      minutes: true,
      idleMinutes: true,
      select: true,
      hostedSessions: false,
      sessionsAttended: false,
      allianceVisits: false,
      inactivityNotices: false,
      messages: false,
      registered: false,
      quota: false,
    });
    setSorting([]);
    setIsEditMode(false);
    setOriginalViewConfig(null);
  };

  const openSaveDialog = () => {
    setSaveName("");
    setSaveColor("");
    setSaveIcon("");
    setIsSaveOpen(true);
  };

  const saveCurrentView = async () => {
    try {
      const filtersPayload: any = {
        filters: colFilters,
      };

      if (sorting && Array.isArray(sorting) && sorting.length > 0) {
        filtersPayload.sorting = sorting;
      }

      const payload = {
        name: normalizeSavedViewName(saveName),
        color: saveColor || null,
        icon: saveIcon || null,
        filters: filtersPayload,
        columnVisibility,
      };
      const res = await axios.post(
        `/api/workspace/${router.query.id}/views`,
        payload
      );
      if (res.data && res.data.view) {
        setSavedViews((prev) => [...prev, res.data.view]);
      }
      setIsSaveOpen(false);
      toast.success("View created!");
    } catch (e) {
      toast.error("Failed to create view.");
    }
  };

  const deleteSavedView = async (id: string) => {
    try {
      await axios.delete(`/api/workspace/${router.query.id}/views/${id}`);
      setSavedViews((prev) => prev.filter((v) => v.id !== id));
      toast.success("View deleted!");
    } catch (e) {
      toast.error("Failed to delete view.");
    }
  };

  const confirmDeleteSavedView = async () => {
    if (!viewToDelete) return;
    try {
      await deleteSavedView(viewToDelete);
      if (selectedViewId === viewToDelete) {
        setMainPanelMode("table");
        setSelectedViewId(null);
        setColFilters([]);
        setColumnVisibility({
          info: true,
          rankID: true,
          book: true,
          minutes: true,
          idleMinutes: true,
          select: true,
          hostedSessions: false,
          sessionsAttended: false,
          allianceVisits: false,
          inactivityNotices: false,
          messages: false,
          registered: false,
          quota: false,
        });
        setSorting([]);
      }
    } catch (e) {
      console.error(e);
    }
    setShowDeleteModal(false);
    setViewToDelete(null);
  };

  const hasUnsavedChanges = () => {
    if (!isEditMode || !originalViewConfig) return false;

    const currentFilters = {
      filters: colFilters,
      sorting: sorting,
    };

    const filtersChanged =
      JSON.stringify(currentFilters) !==
      JSON.stringify(originalViewConfig.filters);
    const columnsChanged =
      JSON.stringify(columnVisibility) !==
      JSON.stringify(originalViewConfig.columnVisibility);

    return filtersChanged || columnsChanged;
  };

  const handleEditOrSaveView = async () => {
    if (!selectedViewId) return;

    if (isEditMode && hasUnsavedChanges()) {
      try {
        const filtersPayload: any = {
          filters: colFilters,
        };

        if (sorting && Array.isArray(sorting) && sorting.length > 0) {
          filtersPayload.sorting = sorting;
        }

        const payload = {
          filters: filtersPayload,
          columnVisibility,
        };

        await axios.patch(
          `/api/workspace/${router.query.id}/views/${selectedViewId}`,
          payload
        );

        setSavedViews((prev) =>
          prev.map((v) =>
            v.id === selectedViewId
              ? { ...v, filters: filtersPayload, columnVisibility }
              : v
          )
        );

        setOriginalViewConfig({
          filters: JSON.parse(JSON.stringify(filtersPayload)),
          columnVisibility: JSON.parse(JSON.stringify(columnVisibility)),
          sorting: JSON.parse(JSON.stringify(sorting)),
        });

        setIsEditMode(false);
        toast.success("View updated!");
      } catch (e) {
        toast.error("Failed to update view.");
      }
    } else {
      setIsEditMode(true);
    }
  };

  const getSafeWorkspaceId = (id: string | string[] | undefined) => {
    if (typeof id !== "string") return null;
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
    return id;
  };

  useEffect(() => {
  }, [colFilters]);

  const massAction = () => {
    const workspaceId = getSafeWorkspaceId(router.query.id);
    if (!workspaceId) {
      toast.error("Invalid workspace id.");
      return;
    }

    const selected = table.getSelectedRowModel().flatRows;
    const promises: any[] = [];
    for (const select of selected) {
      const data = select.original;

      if (type == "add") {
        promises.push(
          axios.post(`/api/workspace/${workspaceId}/activity/add`, {
            userId: data.info.userId,
            minutes,
          })
        );
      } else {
        promises.push(
          axios.post(
            `/api/workspace/${workspaceId}/userbook/${data.info.userId}/new`,
            { notes: message.length > 0 ? message : "Not provided.", type }
          )
        );
      }
    }

    toast.promise(Promise.all(promises), {
      loading: "Actions in progress...",
      success: () => {
        setIsOpen(false);
        return "Actions applied!";
      },
      error: "Could not perform actions.",
    });

    setIsOpen(false);
    setMessage("");
    setType("");
  };

  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const updateSearchQuery = (query: any) => {
    setSearchQuery(query);
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (query.trim() === "") {
      setSearchOpen(false);
      setColFilters([]);
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        setSearchOpen(true);
        const userRequest = await axios.get(
          `/api/workspace/${router.query.id}/staff/search/${query.trim()}`
        );
        const userList = userRequest.data.users;
        setSearchResults(userList);
      } catch (error: any) {
        if (error.response?.status === 429) {
          toast.error("Please wait before searching again");
        }
        setSearchResults([]);
      }
    }, 2000);
    
    setSearchTimeout(timeout);
  };

  const updateSearchFilter = async (username: string) => {
    setSearchQuery(username);
    setSearchOpen(false);
    setColFilters([
      { id: uuidv4(), column: "username", filter: "equal", value: username },
    ]);
  };

  const getSelectionName = (columnId: string) => {
    if (columnId == "sessionsAttended") {
      return "Sessions Attended";
    } else if (columnId == "hostedSessions") {
      return "Hosted Sessions";
    } else if (columnId == "allianceVisits") {
      return "Alliance Visits";
    } else if (columnId == "book") {
      return "Warnings";
    } else if (columnId == "wallPosts") {
      return "Wall Posts";
    } else if (columnId == "rankName" || columnId == "rankID") {
      return "Rank";
    } else if (columnId == "inactivityNotices") {
      return "Inactivity notices";
    } else if (columnId == "minutes") {
      return "Minutes";
    } else if (columnId == "idleMinutes") {
      return "Idle minutes";
    } else if (columnId == "messages") {
      return "Messages";
    } else if (columnId == "registered") {
      return "Registered";
    } else if (columnId == "quota") {
      return "Quota Complete";
    }
  };

  const workspaceLabel = workspace.customName || workspace.groupName;

  return (
    <ViewsPageShell>
      <ViewsPageHeader
        title="Staff Management"
        subtitle="View and manage your staff members"
        workspaceLabel={workspaceLabel}
      />

      <div className="flex flex-col gap-5 md:flex-row md:gap-6">
        <div className="w-full shrink-0 md:w-56">
          <ViewsPanel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-3 dark:border-zinc-800">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Views
              </span>
              {hasUseSavedViews() && hasCreateViews() && (
                <button
                  type="button"
                  onClick={openSaveDialog}
                  title="Create View"
                  className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  <IconPlus className="h-3.5 w-3.5" stroke={2} />
                </button>
              )}
            </div>

            <div className="space-y-0.5 p-1.5">
                <div
                  className={`group flex items-center justify-between gap-1 rounded-lg transition-colors ${
                    mainPanelMode === "table" && selectedViewId === null
                      ? "bg-primary/8 dark:bg-primary/10"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-700/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      resetToDefault();
                    }}
                    className="flex w-full min-w-0 items-center gap-2.5 px-2 py-1.5 text-left"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      <IconUsers className="h-3.5 w-3.5" stroke={1.75} />
                    </span>
                    <span
                      className={`truncate text-sm font-medium ${
                        mainPanelMode === "table" && selectedViewId === null
                          ? "text-primary"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      Staff table
                    </span>
                  </button>
                </div>

                <div
                  className={`group flex items-center justify-between gap-1 rounded-lg transition-colors ${
                    mainPanelMode === "orgChart"
                      ? "bg-primary/8 dark:bg-primary/10"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-700/40"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedViewId(null);
                      setIsEditMode(false);
                      setMainPanelMode("orgChart");
                    }}
                    className="flex w-full min-w-0 items-center gap-2.5 px-2 py-1.5 text-left"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      <IconSitemap className="h-3.5 w-3.5" stroke={1.75} />
                    </span>
                    <span
                      className={`truncate text-sm font-medium ${
                        mainPanelMode === "orgChart"
                          ? "text-primary"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      Org chart
                    </span>
                  </button>
                </div>

                {hasUseSavedViews() && (
                  <>
                    {savedViews.length === 0 && (
                      <p className="px-2 py-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
                        No saved views
                      </p>
                    )}
                    {savedViews.map((v) => (
                    <div
                      key={v.id}
                      className={`group flex items-center justify-between gap-1 rounded-lg transition-colors ${
                        selectedViewId === v.id
                          ? "bg-primary/8 dark:bg-primary/10"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-700/40"
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (selectedViewId === v.id) resetToDefault();
                          else {
                            setSelectedViewId(v.id);
                            applySavedView(v);
                          }
                        }}
                        className="flex items-center gap-2.5 text-left w-full px-2 py-1.5 min-w-0"
                      >
                        <span
                          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-zinc-800"
                          style={{ background: v.color || "#e5e7eb" }}
                        >
                          {v.icon ? (
                            renderIcon(v.icon, "w-3.5 h-3.5")
                          ) : (
                            <span className="text-xs font-semibold">
                              {(v.name || "").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className={`text-sm truncate font-medium ${
                          selectedViewId === v.id
                            ? "text-primary"
                            : "text-zinc-700 dark:text-zinc-300"
                        }`}>
                          {v.name}
                        </span>
                      </button>

                      {hasDeleteViews() && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewToDelete(v.id);
                            setShowDeleteModal(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 mr-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition flex-shrink-0"
                          title="Delete View"
                        >
                          <IconX className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    ))}
                  </>
                )}
              </div>
          </ViewsPanel>
        </div>

        <div className="min-w-0 flex-1">
          {mainPanelMode === "table" && (
            <ViewsPanel className="relative z-10 mb-4 overflow-visible p-4">
              <div className="flex flex-col md:flex-row gap-3 relative z-20">
                <div className="flex gap-2">
                  <Popover className="relative z-20">
                    {({ open }) => (
                      <>
                        <Popover.Button
                          disabled={selectedViewId !== null && !isEditMode}
                          className={clsx(
                            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                            selectedViewId !== null && !isEditMode
                              ? "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                              : open
                              ? "bg-primary/10 text-primary"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                          )}
                        >
                          <IconFilter className="h-4 w-4" stroke={1.75} />
                          <span>Filters</span>
                        </Popover.Button>

                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-200"
                          enterFrom="opacity-0 translate-y-1"
                          enterTo="opacity-100 translate-y-0"
                          leave="transition ease-in duration-150"
                          leaveFrom="opacity-100 translate-y-0"
                          leaveTo="opacity-0 translate-y-1"
                        >
                          <Popover.Panel className="absolute left-0 top-full z-50 mt-2 w-72 origin-top-left rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                            <div className="space-y-3">
                              <button
                                type="button"
                                onClick={newfilter}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                              >
                                <IconPlus className="h-4 w-4" stroke={2} />
                                Add filter
                              </button>

                              {colFilters.map((filter) => (
                                <Filter
                                  key={filter.id}
                                  ranks={ranks}
                                  departments={departments}
                                  updateFilter={(col, op, value) =>
                                    updateFilter(filter.id, col, op, value)
                                  }
                                  deleteFilter={() => removeFilter(filter.id)}
                                  data={filter}
                                />
                              ))}
                              {colFilters.length === 0 && (
                                <p className="py-3 text-center text-xs text-zinc-400">
                                  No filters yet
                                </p>
                              )}
                            </div>
                          </Popover.Panel>
                        </Transition>
                      </>
                    )}
                  </Popover>

                  <Popover className="relative z-20">
                    {({ open }) => (
                      <>
                        <Popover.Button
                          disabled={selectedViewId !== null && !isEditMode}
                          className={clsx(
                            "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                            selectedViewId !== null && !isEditMode
                              ? "cursor-not-allowed bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                              : open
                              ? "bg-primary/10 text-primary"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                          )}
                        >
                          <IconUsers className="h-4 w-4" stroke={1.75} />
                          <span>Columns</span>
                        </Popover.Button>

                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-200"
                          enterFrom="opacity-0 translate-y-1"
                          enterTo="opacity-100 translate-y-0"
                          leave="transition ease-in duration-150"
                          leaveFrom="opacity-100 translate-y-0"
                          leaveTo="opacity-0 translate-y-1"
                        >
                          <Popover.Panel className="absolute left-0 top-full z-50 mt-2 w-56 origin-top-left rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                            <div className="space-y-2">
                              {table.getAllLeafColumns().map((column: any) => {
                                if (
                                  column.id !== "select" &&
                                  column.id !== "info"
                                ) {
                                  return (
                                    <label
                                      key={column.id}
                                      className="flex items-center space-x-2 cursor-pointer group"
                                    >
                                      <Checkbox
                                        checked={column.getIsVisible()}
                                        onChange={column.getToggleVisibilityHandler()}
                                      />
                                      <span className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                                        {getSelectionName(column.id)}
                                      </span>
                                    </label>
                                  );
                                }
                              })}
                            </div>
                          </Popover.Panel>
                        </Transition>
                      </>
                    )}
                  </Popover>
                </div>

                <div className="relative flex-1 md:flex-none md:w-56">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <IconSearch className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => updateSearchQuery(e.target.value)}
                      className="block w-full rounded-xl border-0 bg-zinc-100 py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-zinc-200 dark:placeholder-zinc-500"
                      placeholder="Search staff..."
                    />
                  </div>

                  {searchOpen && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-zinc-200/80 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                      <div className="py-1 max-h-48 overflow-y-auto">
                        {searchResults.length === 0 && (
                          <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                            No results found
                          </div>
                        )}
                        {searchResults.map((u: any) => (
                          <button
                            key={u.username}
                            onClick={() => updateSearchFilter(u.username)}
                            className="w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center space-x-2 transition-colors group"
                          >
                            <img
                              src={u.thumbnail}
                              alt={u.username}
                              className="w-6 h-6 rounded-full bg-primary"
                            />
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                              {u.username}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedViewId !== null && hasManageViews() && (
                  <button
                    onClick={handleEditOrSaveView}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all bg-zinc-50 dark:bg-zinc-700/50 border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                  >
                    {hasUnsavedChanges() ? (
                      <>
                        <IconDeviceFloppy className="w-4 h-4" />
                        <span>Save</span>
                      </>
                    ) : (
                      <>
                        <IconPencil className="w-4 h-4" />
                        <span>Edit</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {table.getSelectedRowModel().flatRows.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 py-2">
                    {table.getSelectedRowModel().flatRows.length} selected
                  </span>
                  <button
                    onClick={() => {
                      setType("promotion");
                      setIsOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600/80 hover:bg-emerald-600 transition-all"
                  >
                    <IconUserCheck className="w-4 h-4" />
                    Promote
                  </button>
                  <button
                    onClick={() => {
                      setType("warning");
                      setIsOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-white bg-amber-600/80 hover:bg-amber-600 transition-all"
                  >
                    <IconAlertCircle className="w-4 h-4" />
                    Warn
                  </button>
                  <button
                    onClick={() => {
                      setType("termination");
                      setIsOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-white bg-red-600/80 hover:bg-red-600 transition-all"
                  >
                    <IconShieldX className="w-4 h-4" />
                    Terminate
                  </button>
                </div>
              )}
            </ViewsPanel>
          )}

            {mainPanelMode === "table" ? (
              isLoading ? (
              <ViewsPanel className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-primary dark:border-zinc-700" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading staff data…</p>
                </div>
              </ViewsPanel>
            ) : (
            <ViewsPanel className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-auto md:table-fixed">
                  <thead className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-800/40">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            scope="col"
                            aria-sort={
                              header.column.getIsSorted?.() === "asc"
                                ? "ascending"
                                : header.column.getIsSorted?.() === "desc"
                                ? "descending"
                                : "none"
                            }
                            className={clsx(
                              "cursor-pointer px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300",
                              header.column.id === "info" && "md:w-1/4 min-w-[90px]",
                              header.column.id === "select" && "w-12 px-2 text-center"
                            )}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {header.isPlaceholder ? null : (
                              <div className="flex items-center space-x-1.5">
                                <span>
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                </span>
                                <span className="text-zinc-400">
                                  {header.column.getIsSorted?.() === "asc" ? (
                                    <IconArrowUp className="w-3 h-3" />
                                  ) : header.column.getIsSorted?.() ===
                                    "desc" ? (
                                    <IconArrowDown className="w-3 h-3" />
                                  ) : null}
                                </span>
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className={
                              cell.column.id === "info"
                                ? "pl-1 pr-2 py-3 text-sm text-zinc-700 dark:text-zinc-300 overflow-hidden"
                                : cell.column.id === "select"
                                ? "px-2 py-3 text-sm text-zinc-700 dark:text-zinc-300 overflow-hidden text-center"
                                : "px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 overflow-hidden"
                            }
                            style={
                              cell.column.id === "info"
                                ? {
                                    minWidth: 90,
                                    maxWidth: "30%",
                                    minHeight: 44,
                                  }
                                : cell.column.id === "select"
                                ? { width: 48 }
                                : { maxWidth: 0 }
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-center border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    Previous
                  </button>
                  <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-zinc-500">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                  </span>
                  <button
                    type="button"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  >
                    Next
                  </button>
                </div>
              </div>
            </ViewsPanel>
            )
            )
            : orgChartLoading ? (
              <ViewsPanel className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="mb-4 h-10 w-10 animate-spin rounded-full border-2 border-zinc-200 border-t-primary dark:border-zinc-700" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading org chart…</p>
                </div>
              </ViewsPanel>
            ) : (
              <ViewsPanel className="p-4 sm:p-6">
                <StaffOrgChart
                  workspaceId={String(router.query.id)}
                  nodes={orgChartData?.nodes ?? []}
                  edges={orgChartData?.edges ?? []}
                  hasViewMemberProfiles={hasViewMemberProfiles}
                />
              </ViewsPanel>
            )}
        </div>
      </div>

        <Transition appear show={isOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50"
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
              <div className="fixed inset-0 bg-black bg-opacity-25" />
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
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-800 p-5 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title
                      as="div"
                      className="flex items-center justify-between mb-3"
                    >
                      <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
                        Mass {type} {type === "add" ? "minutes" : ""}
                      </h3>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="text-zinc-400 hover:text-zinc-500"
                      >
                        <IconX className="w-5 h-5" />
                      </button>
                    </Dialog.Title>

                    <FormProvider
                      {...useForm({
                        defaultValues: {
                          value: type === "add" ? minutes.toString() : message,
                        },
                      })}
                    >
                      <div className="mt-3">
                        <Input
                          type={type === "add" ? "number" : "text"}
                          placeholder={type === "add" ? "Minutes" : "Message"}
                          value={type === "add" ? minutes.toString() : message}
                          name="value"
                          id="value"
                          onBlur={async () => true}
                          onChange={async (e) => {
                            if (type === "add") {
                              setMinutes(parseInt(e.target.value) || 0);
                            } else {
                              setMessage(e.target.value);
                            }
                            return true;
                          }}
                        />
                      </div>
                    </FormProvider>

                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex justify-center px-3 py-1.5 text-sm font-medium text-zinc-700 bg-white dark:text-white dark:bg-zinc-800 border border-gray-300 rounded-md hover:bg-zinc-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                        onClick={() => setIsOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center px-3 py-1.5 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
                        onClick={massAction}
                      >
                        Confirm
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>

        <Transition appear show={isSaveOpen} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-50"
            onClose={() => setIsSaveOpen(false)}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-200"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-150"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel
                    className={clsx(
                      "w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-5 text-left align-middle transition-all dark:bg-zinc-900/95 sm:p-6",
                      viewsPanelShadow
                    )}
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <Dialog.Title className="text-base font-semibold text-zinc-900 dark:text-white">
                          Save view
                        </Dialog.Title>
                        <p className="mt-0.5 text-xs text-zinc-400">
                          Name this view and pick a color and icon
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsSaveOpen(false)}
                        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        <IconX className="h-5 w-5" stroke={1.75} />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-zinc-400">
                          Name ({saveName.length}/{SAVED_VIEW_NAME_MAX_LENGTH})
                        </label>
                        <input
                          type="text"
                          name="save-name"
                          maxLength={SAVED_VIEW_NAME_MAX_LENGTH}
                          value={saveName}
                          onChange={(e) =>
                            setSaveName(
                              e.target.value.slice(0, SAVED_VIEW_NAME_MAX_LENGTH)
                            )
                          }
                          placeholder="e.g. Active moderators"
                          className="w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-medium text-zinc-400">
                          Color
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            "#fef2f2",
                            "#fef3c7",
                            "#ecfeff",
                            "#fff7ed",
                            "#f5f3ff",
                            "#fff2c0",
                            "#d1fae5",
                            "#fee2e2",
                            "#fee7f6",
                            "#fcd7d7",
                            "#f8e494",
                            "#c1fcff",
                            "#fdd6a6",
                            "#b7a9ff",
                            "#fde68a",
                            "#aaffd3",
                            "#e0f2fe",
                            "#ffbcbc",
                            "#ffbce8",
                          ].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setSaveColor(c)}
                              title={c}
                              className={clsx(
                                "h-8 w-8 rounded-lg transition-all",
                                saveColor === c
                                  ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-900"
                                  : "hover:scale-105"
                              )}
                              style={{ background: c }}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-[11px] font-medium text-zinc-400">
                          Icon
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {ICON_OPTIONS.map((opt) => {
                            const IconComp = opt.Icon;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => setSaveIcon(opt.key)}
                                title={opt.title || opt.key}
                                className={clsx(
                                  "flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 transition-all dark:bg-zinc-800",
                                  saveIcon === opt.key
                                    ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-900"
                                    : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                )}
                              >
                                <IconComp
                                  className="h-4 w-4 text-zinc-700 dark:text-zinc-200"
                                  stroke={1.75}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-xl px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        onClick={() => setIsSaveOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={saveCurrentView}
                        disabled={!saveName.trim()}
                      >
                        Save view
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm">
              <div className="p-6">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                  <IconTrash className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-white mb-1">
                  Delete view?
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  This saved view will be permanently removed. This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-2 px-6 pb-5">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setViewToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSavedView}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
    </ViewsPageShell>
  );
};

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

const filterInputClass =
  "w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white";

const filterLabelClass = "mb-1 block text-[11px] font-medium text-zinc-400";

const Filter: React.FC<{
  data: {
    column: string;
    filter: string;
    value: string;
  };
  updateFilter: (column: string, op: string, value: string) => void;
  deleteFilter: () => void;
  ranks: {
    id: number;
    name: string;
    rank: number;
  }[];
  departments: Array<{ id: string; name: string; color: string | null }>;
}> = ({ updateFilter, deleteFilter, data, ranks, departments }) => {
  const methods = useForm<{
    col: string;
    op: string;
    value: string;
  }>({
    defaultValues: {
      col: data.column,
      op: data.filter,
      value: data.value,
    },
  });

  const { register } = methods;
  const selectedCol = methods.watch("col");

  useEffect(() => {
    const subscription = methods.watch(() => {
      updateFilter(
        methods.getValues().col,
        methods.getValues().op,
        methods.getValues().value
      );
    });
    return () => subscription.unsubscribe();
  }, [methods.watch]);

  return (
    <FormProvider {...methods}>
      <div className="rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/50">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Filter rule
          </span>
          <button
            type="button"
            onClick={deleteFilter}
            className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-red-500 dark:hover:bg-zinc-700 dark:hover:text-red-400"
            title="Remove filter"
          >
            <IconTrash className="h-3.5 w-3.5" stroke={1.75} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className={filterLabelClass}>Column</label>
            <select {...register("col")} className={filterInputClass}>
              {Object.keys(filters).map((filter) => (
                <option value={filter} key={filter}>
                  {filter}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={filterLabelClass}>Operation</label>
            <select {...register("op")} className={filterInputClass}>
              {(filters[selectedCol] || filters.username).map((filter) => (
                <option value={filter} key={filter}>
                  {filterNames[filter]}
                </option>
              ))}
            </select>
          </div>

          {selectedCol !== "rank" &&
            selectedCol !== "registered" &&
            selectedCol !== "quota" &&
            selectedCol !== "department" && (
              <div>
                <label className={filterLabelClass}>Value</label>
                <input {...register("value")} className={filterInputClass} />
              </div>
            )}

          {selectedCol === "rank" && (
            <div>
              <label className={filterLabelClass}>Value</label>
              <select {...register("value")} className={filterInputClass}>
                {ranks.map((rank) => (
                  <option value={rank.rank} key={rank.id}>
                    {rank.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedCol === "registered" && (
            <div>
              <label className={filterLabelClass}>Value</label>
              <select {...register("value")} className={filterInputClass}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          )}

          {selectedCol === "quota" && (
            <div>
              <label className={filterLabelClass}>Value</label>
              <select {...register("value")} className={filterInputClass}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          )}

          {selectedCol === "department" && (
            <div>
              <label className={filterLabelClass}>Value</label>
              <select {...register("value")} className={filterInputClass}>
                {departments.map((dept) => (
                  <option value={dept.id} key={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </FormProvider>
  );
};

Views.layout = workspace;
export default Views;
