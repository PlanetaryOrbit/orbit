"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  Button,
  MenuItems,
  MenuItem,
  Transition,
} from "@headlessui/react";
import LogoutDialog from "./LogoutDialog";
import { useState } from "react";
import {
  ChevronDownIcon,
  UserCircleIcon,
  KeyIcon,
  ArrowRightStartOnRectangleIcon,
  TrashIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";

interface UserDropdownProps {
  user: {
    username: string;
    isOwner: boolean;
    roblox?: {
      avatarUrl?: string | null;
    } | null;
  };
}

export default function UserDropdown({ user }: UserDropdownProps) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  return (
    <Menu as="div" className="relative">
      <Menu.Button as={Button} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-ctp-surface0">
        <Image
          src={user.roblox?.avatarUrl ?? "/favicon.png"}
          alt={user.username}
          width={40}
          height={40}
          className="rounded-full border border-ctp-surface1 bg-ctp-surface0"
        />

        <span className="hidden text-sm font-medium sm:block">
          {user.username}
        </span>

        <ChevronDownIcon className="h-5 w-5 text-ctp-subtext0 transition-transform ui-open:rotate-180" />
      </Menu.Button>

      <Transition
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 translate-y-1 scale-95"
        enterTo="opacity-100 translate-y-0 scale-100"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 translate-y-0 scale-100"
        leaveTo="opacity-0 translate-y-1 scale-95"
      >
        <MenuItems
          anchor="bottom end"
          className="mt-3 w-60 rounded-2xl border border-ctp-surface0 bg-ctp-crust/80 p-2 shadow-2xl backdrop-blur-xl outline-none"
        >
          <div className="mb-2 border-b border-ctp-surface0 px-3 py-2">
            <p className="text-sm font-semibold text-ctp-text">
              {user.username}
            </p>

            <p className="text-xs text-ctp-subtext0">
              {user.isOwner ? "Owner" : "Member"}
            </p>
          </div>

          <MenuItem>
            {({ focus }) => (
              <Link
                href="/profile"
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                  focus
                    ? "bg-ctp-surface0 text-ctp-text"
                    : "text-ctp-subtext1"
                }`}
              >
                <UserCircleIcon className="h-5 w-5" />
                Profile
              </Link>
            )}
          </MenuItem>

          {user.isOwner && (
            <MenuItem>
              {({ focus }) => (
                <Link
                  href="/settings/instance"
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                    focus
                      ? "bg-ctp-surface0 text-ctp-text"
                      : "text-ctp-subtext1"
                  }`}
                >
                  <WrenchScrewdriverIcon className="h-5 w-5" />
                  Instance Settings
                </Link>
              )}
            </MenuItem>
          )}

          <MenuItem>
            {({ focus }) => (
              <Link
                href="/settings/sessions"
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                  focus
                    ? "bg-ctp-surface0 text-ctp-text"
                    : "text-ctp-subtext1"
                }`}
              >
                <KeyIcon className="h-5 w-5" />
                Sessions
              </Link>
            )}
          </MenuItem>

          <div className="my-2 h-px bg-ctp-surface0" />

          <MenuItem>
            {({ focus }) => (
              <button
                onClick={() => setLogoutOpen(true)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ctp-red transition ${
                  focus ? "bg-ctp-red/10" : ""
                }`}
              >
                <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
                Logout
              </button>
            )}
          </MenuItem>

          {!user.isOwner && (
            <>
              <div className="my-2 h-px bg-ctp-surface0" />

              <MenuItem>
                {({ focus }) => (
                  <Button
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ctp-red ${
                      focus ? "bg-ctp-red/10" : ""
                    }`}
                  >
                    <TrashIcon className="h-5 w-5" />
                    Delete Account
                  </Button>
                )}
              </MenuItem>
            </>
          )}
        </MenuItems>
      </Transition>
      <LogoutDialog open={logoutOpen} setOpen={setLogoutOpen} />
    </Menu>
  );
}
