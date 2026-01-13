import React, { FC, Fragment, useMemo } from "react";
import { Disclosure, Transition, Listbox, Dialog } from "@headlessui/react";
import {
  IconCheck,
  IconChevronDown,
  IconPlus,
  IconUser,
  IconCircleMinus,
  IconAlertCircle,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { loginState, workspacestate } from "@/state";

import { useForm, FormProvider } from "react-hook-form";
import { role } from "@/utils/database";
import type toast from "react-hot-toast";

import { useRecoilState } from "recoil";
import Input from "@/components/input";
import axios from "axios";
import clsx from "clsx";

type Props = {
  users: any[];
  roles: role[];
};

type form = {
  username: string;
};

const USERS_PER_PAGE = 25;

const Button: FC<Props> = (props) => {
  const [workspace, setWorkspace] = useRecoilState(workspacestate);
  const [users, setUsers] = React.useState(props.users);
  const [login, setLogin] = useRecoilState(loginState);
  const [showRemoveModal, setShowRemoveModal] = React.useState(false);
  const [userToRemove, setUserToRemove] = React.useState<number | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPages, setCurrentPages] = React.useState<Record<string, number>>({});

  const userForm = useForm<form>();
  const { roles } = props;
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user: any) =>
        user.username?.toLowerCase().includes(query) ||
        user.displayName?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const getPageForRole = (roleId: string) => currentPages[roleId] || 1;
  
  const setPageForRole = (roleId: string, page: number) => {
    setCurrentPages((prev) => ({ ...prev, [roleId]: page }));
  };

  const getUsersForRole = (roleId: string) => {
    const roleUsers = filteredUsers.filter((user: any) => user.roles[0]?.id === roleId);
    const page = getPageForRole(roleId);
    const start = (page - 1) * USERS_PER_PAGE;
    const end = start + USERS_PER_PAGE;
    return {
      users: roleUsers.slice(start, end),
      total: roleUsers.length,
      totalPages: Math.ceil(roleUsers.length / USERS_PER_PAGE),
      currentPage: page,
    };
  };

  const updateRole = async (id: number, roleid: string) => {
    const userIndex = users.findIndex((user: any) => user.userid === id);
    if (userIndex === -1) return;
    const usi = users;
    const role = roles.find((role: any) => role.id === roleid);
    if (!role) return;
    usi[userIndex].roles = [role];
    setUsers([...usi]);
    await axios.post(
      `/api/workspace/${workspace.groupId}/settings/users/${id}/update`,
      { role: role.id }
    );
  };

  const removeUser = async (id: number) => {
    if (id === login.userId) {
      if (typeof window !== "undefined") {
        const toast = (await import("react-hot-toast")).default;
        toast.error("You cannot remove yourself.");
      }
      return;
    }
    const user = users.find((user: any) => user.userid === id);
    if (!user) return;
    setUsers(users.filter((user: any) => user.userid !== id));
    await axios.delete(
      `/api/workspace/${workspace.groupId}/settings/users/${id}/remove`
    );
    if (typeof window !== "undefined") {
      const toast = (await import("react-hot-toast")).default;
      toast.success("User removed successfully.");
    }
  };

  const addUser = async () => {
    const user = await axios
      .post(`/api/workspace/${workspace.groupId}/settings/users/add`, {
        username: userForm.getValues().username,
      })
      .catch((err) => {
        userForm.setError("username", {
          type: "custom",
          message: err.response.data.error,
        });
      });
    if (!user) return;
    userForm.clearErrors();
    setUsers([...users, user.data.user]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
          Users
        </h3>
        <div className="flex items-center space-x-3">
          <FormProvider {...userForm}>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <input
                  {...userForm.register("username")}
                  placeholder="Enter username"
                  className={clsx(
                    "w-full sm:w-48 px-3 py-1.5 text-sm rounded-lg border bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-white focus:ring-primary focus:border-primary transition focus-visible:outline-none",
                    userForm.formState.errors.username
                      ? "border-red-500"
                      : "border-gray-300 dark:border-zinc-600"
                  )}
                />
                {userForm.formState.errors.username && (
                  <p className="absolute top-full left-0 mt-1 text-xs text-red-500 whitespace-nowrap">
                    {userForm.formState.errors.username.message as string}
                  </p>
                )}
              </div>
              <button
                onClick={addUser}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                <IconPlus size={16} className="mr-1.5" />
                Add User
              </button>
            </div>
          </FormProvider>
        </div>
      </div>

      {/* Search box */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <IconSearch size={18} className="text-zinc-400" />
        </div>
        <input
          type="text"
          placeholder="Search users by username or display name..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPages({});
          }}
          className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 text-zinc-600 dark:text-white focus:ring-primary focus:border-primary transition focus-visible:outline-none"
        />
      </div>

      <div className="space-y-3">
        {roles.map((role) => {
          const { users: roleUsers, total, totalPages, currentPage } = getUsersForRole(role.id);
          const allRoleUsers = filteredUsers.filter((user: any) => user.roles[0]?.id === role.id);
          
          return (
            <Disclosure
              as="div"
              key={role.id}
              className="bg-white dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700 shadow-sm"
            >
              {({ open }) => (
                <>
                  <Disclosure.Button className="w-full px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-zinc-900 dark:text-white">
                          {role.name}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          ({total} user{total !== 1 ? "s" : ""})
                        </span>
                      </div>
                      <IconChevronDown
                        className={clsx(
                          "w-5 h-5 text-zinc-500 transition-transform",
                          open ? "transform rotate-180" : ""
                        )}
                      />
                    </div>
                  </Disclosure.Button>

                  <Transition
                    enter="transition duration-100 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                  >
                    <Disclosure.Panel className="px-4 pb-4">
                      {total === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          {searchQuery ? "No users match your search" : "No users in this role"}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {roleUsers.map((user: any) => (
                            <div
                              key={user.userid}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-gray-200 dark:border-zinc-700"
                            >
                              <div className="flex items-center space-x-3">
                                <img
                                  src={user.thumbnail}
                                  alt={user.displayName}
                                  className="w-10 h-10 rounded-full flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center space-x-2 flex-wrap">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                      {user.displayName}
                                    </p>
                                    {user.workspaceMemberships?.[0]?.isAdmin && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                        Admin
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                    @{user.username}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 w-full sm:w-auto sm:ml-auto">
                                <Listbox
                                  value={user.roles[0].id}
                                  onChange={(value) =>
                                    updateRole(user.userid, value)
                                  }
                                >
                                  <div className="relative flex-1 sm:flex-none">
                                    <Listbox.Button
                                      className="relative w-full sm:w-40 py-1.5 pl-3 pr-10 text-left bg-white dark:text-white dark:bg-zinc-700 rounded-lg border border-gray-300 dark:border-zinc-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                      <span className="block truncate text-sm">
                                        {user.roles[0].name}
                                      </span>
                                      <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                                        <IconChevronDown className="w-5 h-5 text-zinc-400" />
                                      </span>
                                    </Listbox.Button>
                                    <Transition
                                      as={React.Fragment}
                                      leave="transition ease-in duration-100"
                                      leaveFrom="opacity-100"
                                      leaveTo="opacity-0"
                                    >
                                      <Listbox.Options className="absolute z-10 w-full py-1 mt-1 overflow-auto text-base bg-white dark:bg-zinc-700 rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none">
                                        {workspace.roles
                                          .filter((role) => !role.isOwnerRole)
                                          .map((role) => (
                                            <Listbox.Option
                                              key={role.id}
                                              value={role.id}
                                              className={({ active }) =>
                                                clsx(
                                                  "relative cursor-pointer select-none py-2 pl-10 pr-4",
                                                  active
                                                    ? "bg-primary/10 text-primary"
                                                    : "text-zinc-900 dark:text-zinc-100"
                                                )
                                              }
                                            >
                                              {({ selected }) => (
                                                <>
                                                  <span className="block truncate text-sm">
                                                    {role.name}
                                                  </span>
                                                  {selected ? (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                                                      <IconCheck className="w-5 h-5" />
                                                    </span>
                                                  ) : null}
                                                </>
                                              )}
                                            </Listbox.Option>
                                          ))}
                                      </Listbox.Options>
                                    </Transition>
                                  </div>
                                </Listbox>
                                <button
                                  onClick={() => {
                                    setUserToRemove(user.userid);
                                    setShowRemoveModal(true);
                                  }}
                                  disabled={user.workspaceMemberships?.[0]?.isAdmin}
                                  className={clsx(
                                    "inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md text-white transition-colors whitespace-nowrap flex-shrink-0",
                                    user.workspaceMemberships?.[0]?.isAdmin
                                      ? "bg-red-600/50 cursor-not-allowed opacity-60"
                                      : "bg-red-600 hover:bg-red-700"
                                  )}
                                >
                                  <IconCircleMinus
                                    width={16}
                                    height={16}
                                    className="sm:mr-1.5"
                                  />
                                  <span className="hidden sm:inline">Remove</span>
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-zinc-700 mt-4">
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Showing {((currentPage - 1) * USERS_PER_PAGE) + 1}-{Math.min(currentPage * USERS_PER_PAGE, total)} of {total} users
                              </p>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPageForRole(role.id, currentPage - 1);
                                  }}
                                  disabled={currentPage === 1}
                                  className={clsx(
                                    "p-1.5 rounded-md transition-colors",
                                    currentPage === 1
                                      ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                  )}
                                >
                                  <IconChevronLeft size={18} />
                                </button>
                                <span className="text-sm text-zinc-600 dark:text-zinc-300">
                                  Page {currentPage} of {totalPages}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPageForRole(role.id, currentPage + 1);
                                  }}
                                  disabled={currentPage === totalPages}
                                  className={clsx(
                                    "p-1.5 rounded-md transition-colors",
                                    currentPage === totalPages
                                      ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                                  )}
                                >
                                  <IconChevronRight size={18} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Disclosure.Panel>
                  </Transition>
                </>
              )}
            </Disclosure>
          );
        })}
      </div>

      <Transition appear show={showRemoveModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setShowRemoveModal(false)}
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
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="mx-auto max-w-md rounded-lg bg-white dark:bg-zinc-800 p-6 shadow-xl">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <IconAlertCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium text-zinc-900 dark:text-white"
                    >
                      Remove User
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        Are you sure you want to remove this user from the
                        workspace? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    onClick={() => setShowRemoveModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    onClick={async () => {
                      if (userToRemove) {
                        await removeUser(userToRemove);
                        setShowRemoveModal(false);
                        setUserToRemove(null);
                      }
                    }}
                  >
                    Remove
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default Button;