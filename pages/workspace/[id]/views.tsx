import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import { Fragment, useEffect, useState } from "react";
import { Dialog, Popover, Transition } from "@headlessui/react";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { getThumbnail } from "@/utils/userinfoEngine";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import noblox from "noblox.js";
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
import Button from "@/components/button";
import {
  inactivityNotice,
  Session,
  user,
  userBook,
  wallPost,
} from "@prisma/client";
import Checkbox from "@/components/checkbox";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { useRouter } from "next/router";
import moment from "moment";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { getConfig } from "@/utils/configEngine";
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
    const workspaceGroupId = parseInt(params?.id as string);
    const currentUserId = req.session?.userid;
    const currentUser = await prisma.user.findFirst({
      where: { userid: BigInt(currentUserId) },
      include: {
        workspaceMemberships: {
          where: { workspaceGroupId },
        },
        roles: {
          where: { workspaceGroupId },
        },
      },
    });
    
    const membership = currentUser?.workspaceMemberships?.[0];
    const isAdmin = membership?.isAdmin || false;
    const userRole = currentUser?.roles?.[0];
    const hasManageViewsPerm = userRole?.permissions?.includes("edit_views") || false;
    const hasCreateViewsPerm = userRole?.permissions?.includes("create_views") || false;
    const hasDeleteViewsPerm = userRole?.permissions?.includes("delete_views") || false;
    const hasUseSavedViewsPerm = userRole?.permissions?.includes("use_views") || false;
    const hasViewMemberProfiles = isAdmin || userRole?.permissions?.includes("view_member_profiles") || false;

    const departments = await prisma.department.findMany({
      where: { workspaceGroupId },
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      props: {
        isAdmin: isAdmin,
        hasManageViewsPerm: hasManageViewsPerm,
        hasCreateViewsPerm: hasCreateViewsPerm,
        hasDeleteViewsPerm: hasDeleteViewsPerm,
        hasUseSavedViewsPerm: hasUseSavedViewsPerm,
        hasViewMemberProfiles: hasViewMemberProfiles,
        departments: JSON.parse(JSON.stringify(departments)),
      },
    };
  },
  "view_members"
);

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
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getRandomBg(
                row.getValue().userId.toString()
              )}`}
            >
              <img
                src={row.getValue().picture!}
                className="w-10 h-10 rounded-full object-cover border-2 border-white"
                style={{ background: "transparent" }}
              />
            </div>
            <p
              title={row.getValue().username || undefined}
              className="leading-5 my-auto px-2 font-semibold dark:text-white truncate"
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
  
  // Reset to page 0 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [colFilters]);

  useEffect(() => {
    const fetchStaffData = async () => {
      if (!router.query.id) return;
      
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
  }, [router.query.id, pagination.pageIndex, pagination.pageSize, colFilters]);

  const applySavedView = (view: any) => {
    if (!view) return;
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
        name: saveName || `View ${new Date().toISOString()}`,
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

  useEffect(() => {
  }, [colFilters]);

  const massAction = () => {
    const selected = table.getSelectedRowModel().flatRows;
    const promises: any[] = [];
    for (const select of selected) {
      const data = select.original;

      if (type == "add") {
        promises.push(
          axios.post(`/api/workspace/${router.query.id}/activity/add`, {
            userId: data.info.userId,
            minutes,
          })
        );
      } else {
        promises.push(
          axios.post(
            `/api/workspace/${router.query.id}/userbook/${data.info.userId}/new`,
            { notes: message, type }
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50 dark:from-zinc-900 dark:via-zinc-950 dark:to-zinc-900">
      <Toaster position="bottom-center" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4">
            <div className="bg-gradient-to-br from-[#ff0099]/20 to-[#ff0099]/10 p-3 rounded-lg flex-shrink-0">
              <IconUsers className="w-6 h-6 text-[#ff0099]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                Staff Management
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                View and manage your staff members
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {hasUseSavedViews() && (
            <aside className="w-64 hidden md:block">
              <div className="sticky top-8">
                <div className="bg-white dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Saved Views
                    </h4>
                    {hasCreateViews() && (
                      <button
                        onClick={openSaveDialog}
                        className="p-1.5 rounded-md text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                      >
                        <IconPlus className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {savedViews.length === 0 && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        No saved views
                      </p>
                    )}
                    {savedViews.map((v) => (
                    <div
                      key={v.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md ${
                        selectedViewId === v.id
                          ? "bg-zinc-50 dark:bg-zinc-800/40 border-l-4 border-[#ff0099]"
                          : "hover:bg-zinc-50 dark:hover:bg-zinc-700/40"
                      }`}
                      style={{ minWidth: 0 }}
                    >
                      <button
                        onClick={() => {
                          if (selectedViewId === v.id) {
                            resetToDefault();
                          } else {
                            setSelectedViewId(v.id);
                            applySavedView(v);
                          }
                        }}
                        className="flex items-center gap-3 text-left w-full"
                      >
                        <span
                          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: v.color || "#e5e7eb" }}
                        >
                          {v.icon ? (
                            renderIcon(
                              v.icon,
                              "w-4 h-4 text-zinc-900 dark:text-zinc-700"
                            )
                          ) : (
                            <span className="text-sm font-medium text-zinc-900 dark:text-white">
                              {(v.name || "").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>

                        <span className="text-sm font-medium truncate text-zinc-900 dark:text-white">
                          {v.name}
                        </span>
                      </button>

                      <div className="flex items-center gap-1">
                        {hasDeleteViews() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewToDelete(v.id);
                              setShowDeleteModal(true);
                            }}
                            className="p-1.5 rounded-md text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                            title="Delete View"
                          >
                            <IconX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </aside>
          )}

          {hasUseSavedViews() && (
            <div className="md:hidden w-full mb-4">
              <div className="bg-white dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-md flex items-center justify-center bg-zinc-100 dark:bg-zinc-700/30 text-zinc-700 dark:text-zinc-200">
                    <IconUsers className="w-4 h-4" />
                  </span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {savedViews.find((s) => s.id === selectedViewId)?.name ||
                      "Views"}
                  </span>
                </div>

                {hasCreateViews() && (
                  <button
                    onClick={openSaveDialog}
                    title="Create View"
                    className="p-1.5 rounded-md text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                  >
                    <IconPlus className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2 mt-3">
                {savedViews.length === 0 && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No saved views
                  </p>
                )}
                {savedViews.map((v) => (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-md ${
                      selectedViewId === v.id
                        ? "bg-zinc-50 dark:bg-zinc-800/40 border-l-4 border-[#ff0099]"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-700/40"
                    }`}
                    style={{ minWidth: 0 }}
                  >
                    <button
                      onClick={() => {
                        if (selectedViewId === v.id) resetToDefault();
                        else {
                          setSelectedViewId(v.id);
                          applySavedView(v);
                        }
                      }}
                      className="flex items-center gap-3 text-left w-full"
                    >
                      <span
                        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: v.color || "#e5e7eb" }}
                      >
                        {v.icon ? (
                          renderIcon(
                            v.icon,
                            "w-4 h-4 text-zinc-900 dark:text-white"
                          )
                        ) : (
                          <span className="text-sm font-medium text-zinc-900 dark:text-white">
                            {(v.name || "").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>

                      <span className="text-sm font-medium truncate text-zinc-900 dark:text-white">
                        {v.name}
                      </span>
                    </button>

                    <div className="flex items-center gap-1">
                      {hasDeleteViews() && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewToDelete(v.id);
                            setShowDeleteModal(true);
                          }}
                          className="p-1.5 rounded-md text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition"
                          title="Delete View"
                        >
                          <IconX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          )}

          <div className="flex-1">
            <div className="bg-white dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700/50 rounded-lg p-4 mb-6 relative z-10 overflow-visible">
              <div className="flex flex-col md:flex-row gap-3 relative z-20">
                <div className="flex gap-2">
                  <Popover className="relative z-20">
                    {({ open }) => (
                      <>
                        <Popover.Button
                          disabled={selectedViewId !== null && !isEditMode}
                          className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                            selectedViewId !== null && !isEditMode
                              ? "bg-zinc-100 dark:bg-zinc-700/50 border-zinc-200 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                              : open
                              ? "bg-zinc-100 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white ring-2 ring-[#ff0099]/50"
                              : "bg-zinc-50 dark:bg-zinc-700/50 border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                          }`}
                        >
                          <IconFilter className="w-4 h-4" />
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
                          <Popover.Panel className="absolute left-0 z-50 mt-2 w-72 origin-top-left rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xl p-4 top-full">
                            <div className="space-y-3">
                              <button
                                onClick={newfilter}
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-white bg-[#ff0099] hover:bg-[#ff0099]/90 transition-all"
                              >
                                <IconPlus className="w-4 h-4" />
                                Add Filter
                              </button>

                              {colFilters.map((filter) => (
                                <div
                                  key={filter.id}
                                  className="p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900/50"
                                >
                                  <Filter
                                    ranks={ranks}
                                    departments={departments}
                                    updateFilter={(col, op, value) =>
                                      updateFilter(filter.id, col, op, value)
                                    }
                                    deleteFilter={() => removeFilter(filter.id)}
                                    data={filter}
                                  />
                                </div>
                              ))}
                              {colFilters.length === 0 && (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-2">
                                  No filters added yet
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
                          className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                            selectedViewId !== null && !isEditMode
                              ? "bg-zinc-100 dark:bg-zinc-700/50 border-zinc-200 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                              : open
                              ? "bg-zinc-100 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white ring-2 ring-[#ff0099]/50"
                              : "bg-zinc-50 dark:bg-zinc-700/50 border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                          }`}
                        >
                          <IconUsers className="w-4 h-4" />
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
                          <Popover.Panel className="absolute left-0 z-50 mt-2 w-56 origin-top-left rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xl p-4 top-full">
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
                      className="block w-full pl-10 pr-3 py-[6px] border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-200 placeholder-zinc-500 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff0099]/50 focus:border-transparent transition-all"
                      placeholder="Search staff..."
                    />
                  </div>

                  {searchOpen && (
                    <div className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl">
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
                              className="w-6 h-6 rounded-full bg-[#ff0099]"
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
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700 flex flex-wrap gap-2">
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
                      setType("fire");
                      setIsOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-white bg-red-600/80 hover:bg-red-600 transition-all"
                  >
                    <IconShieldX className="w-4 h-4" />
                    Terminate
                  </button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="bg-white dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700/50 rounded-lg p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading staff data...</p>
                </div>
              </div>
            ) : (
            <div className="bg-white dark:bg-zinc-800/50 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700/50 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full table-auto md:table-fixed divide-y divide-zinc-200 dark:divide-zinc-700">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-700">
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
                            className={
                              `px-4 py-3 text-left text-xs font-semibold text-zinc-900 dark:text-zinc-300 uppercase tracking-widest cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors` +
                              (header.column.id === "info"
                                ? " md:w-1/4 min-w-[90px]"
                                : header.column.id === "select"
                                ? " w-12 text-center px-2"
                                : "")
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {header.isPlaceholder ? null : (
                              <div className="flex items-center space-x-2 text-zinc-900 dark:text-zinc-300">
                                <span>
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                </span>
                                <span className="text-zinc-500 dark:text-zinc-400">
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
                  <tbody className="bg-white dark:bg-zinc-900/20 divide-y divide-zinc-200 dark:divide-zinc-700">
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-zinc-100 dark:hover:bg-zinc-700/30 transition-colors border-b border-zinc-200 dark:border-zinc-700 last:border-b-0"
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

              <div className="bg-white dark:bg-zinc-800/50 px-4 py-3 flex items-center justify-center border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex gap-2">
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-700/30 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-400 dark:disabled:text-zinc-500 transition-all"
                  >
                    Previous
                  </button>
                  <span className="inline-flex items-center px-4 py-2 bg-zinc-100 dark:bg-zinc-700/50 border border-zinc-300 dark:border-zinc-600 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Page {table.getState().pagination.pageIndex + 1} of{" "}
                    {table.getPageCount()}
                  </span>
                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-700/30 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed disabled:text-zinc-400 dark:disabled:text-zinc-500 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
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
                        className="inline-flex justify-center px-3 py-1.5 text-sm font-medium text-zinc-700 bg-white dark:text-white dark:bg-zinc-800 border border-gray-300 rounded-md hover:bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
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
                        Save View
                      </h3>
                      <button
                        onClick={() => setIsSaveOpen(false)}
                        className="text-zinc-400 hover:text-zinc-500"
                      >
                        <IconX className="w-5 h-5" />
                      </button>
                    </Dialog.Title>
                    <div className="mt-3 space-y-3">
                      <Input
                        name="save-name"
                        label="Name"
                        value={saveName}
                        onChange={(e) => {
                          setSaveName(e.target.value);
                          return Promise.resolve();
                        }}
                        onBlur={() => Promise.resolve()}
                      />

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-2">
                          Color
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "#fef2f2",
                            "#fef3c7",
                            "#ecfeff",
                            "#fff7ed",
                            "#f5f3ff",
                            "#fff2c0ff",
                            "#d1fae5",
                            "#e0f2fe",
                            "#fee2e2",
                            "#fee7f6",
                            "#fcd7d7ff",
                            "#f8e494ff",
                            "#c1fcffff",
                            "#fdd6a6ff",
                            "#b7a9ffff",
                            "#fde68a",
                            "#aaffd3ff",
                            "#e0f2fe",
                            "#ffbcbcff",
                            "#ffbce8ff",
                          ].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setSaveColor(c)}
                              title={c}
                              className={`w-8 h-8 rounded-md border dark:border-zinc-600 ${
                                saveColor === c
                                  ? "ring-2 ring-offset-1 ring-[#ff0099] dark:ring-white/30"
                                  : ""
                              }`}
                              style={{ background: c }}
                            />
                          ))}
                        </div>

                        <div className="mt-3">
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200 mb-2">
                            Icon
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {ICON_OPTIONS.map((opt) => {
                              const IconComp = opt.Icon;
                              return (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => setSaveIcon(opt.key)}
                                  title={opt.title || opt.key}
                                  className={`w-9 h-9 rounded-md flex items-center justify-center text-lg border dark:border-zinc-600 ${
                                    saveIcon === opt.key
                                      ? "ring-2 ring-offset-1 ring-[#ff0099] dark:ring-white/30"
                                      : ""
                                  }`}
                                >
                                  <IconComp className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex justify-center px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-white bg-white dark:bg-zinc-800 border border-gray-300 rounded-md hover:bg-zinc-50"
                        onClick={() => setIsSaveOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="inline-flex justify-center px-3 py-1.5 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90"
                        onClick={saveCurrentView}
                      >
                        Save
                      </button>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
                Confirm Deletion
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6">
                Are you sure you want to delete this saved view? This action
                cannot be undone.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setViewToDelete(null);
                  }}
                  className="px-4 py-2 rounded-md bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-800 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSavedView}
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

  const { register, handleSubmit, getValues } = methods;

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
      <div className="space-y-4">
        <button
          onClick={deleteFilter}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-zinc-700 dark:text-white bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          Delete Filter
        </button>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-white">
            Column
          </label>
          <select
            {...register("col")}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          >
            {Object.keys(filters).map((filter) => (
              <option value={filter} key={filter}>
                {filter}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-zinc-700 dark:text-white">
            Operation
          </label>
          <select
            {...register("op")}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          >
            {filters[methods.getValues().col].map((filter) => (
              <option value={filter} key={filter}>
                {filterNames[filter]}
              </option>
            ))}
          </select>
        </div>

        {getValues("col") !== "rank" && getValues("col") !== "registered" && getValues("col") !== "quota" && getValues("col") !== "department" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-white">
              Value
            </label>
            <Input {...register("value")} />
          </div>
        )}

        {getValues("col") === "rank" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-white">
              Value
            </label>
            <select
              {...register("value")}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              {ranks.map((rank) => (
                <option value={rank.rank} key={rank.id}>
                  {rank.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {getValues("col") === "registered" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-white">
              Value
            </label>
            <select
              {...register("value")}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              <option value="true">✅</option>
              <option value="false">❌</option>
            </select>
          </div>
        )}

        {getValues("col") === "quota" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-white">
              Value
            </label>
            <select
              {...register("value")}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              <option value="true">✅</option>
              <option value="false">❌</option>
            </select>
          </div>
        )}

        {getValues("col") === "department" && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-white">
              Value
            </label>
            <select
              {...register("value")}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
            >
              {departments.map((dept) => (
                <option value={dept.id} key={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </FormProvider>
  );
};

Views.layout = workspace;
export default Views;