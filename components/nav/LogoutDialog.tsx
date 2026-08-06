"use client";

import {
  Dialog,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";

import Button from "../Button";

import {
  ArrowRightStartOnRectangleIcon,
  XMarkIcon,
  NoSymbolIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

interface LogoutDialogProps {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export default function LogoutDialog({
  open,
  setOpen,
}: LogoutDialogProps) {
  function logout() {
    console.log("logout");
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onClose={setOpen}
      className="relative z-100"
    >
      <div
        className="
          fixed
          inset-0
          bg-black/50
          backdrop-blur-sm
          transition-opacity
        "
        aria-hidden="true"
      />

      <div
        className="
          fixed
          inset-0
          flex
          items-center
          justify-center
          overflow-y-auto
          p-4
          sm:p-6
        "
      >
        <DialogPanel
          className="
            w-full
            max-w-md
            rounded-3xl
            border
            border-ctp-surface0
            bg-ctp-mantle/95
            p-5
            shadow-2xl
            backdrop-blur-xl
            sm:p-6
          "
        >
          <div className="flex items-start gap-4">
            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-ctp-red/15
                text-ctp-red
              "
            >
              <ArrowRightStartOnRectangleIcon className="h-6 w-6" />
            </div>

            <div className="flex-1">
              <DialogTitle
                className="
                  text-lg
                  font-semibold
                  text-ctp-text
                "
              >
                Log Out
              </DialogTitle>

              <p
                className="
                  mt-1.5
                  text-sm
                  leading-relaxed
                  text-ctp-subtext0
                "
              >
                Are you sure you want to log out?
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={XMarkIcon}
              onClick={() => setOpen(false)}
              aria-label="Close logout dialog"
            />
          </div>

          <div
            className="
              mt-6
              flex
              items-start
              gap-3
              rounded-2xl
              border
              border-ctp-yellow/20
              bg-ctp-yellow/10
              p-4
              text-sm
              text-ctp-yellow
            "
          >
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-medium">
                Authentication required
              </p>

              <p className="mt-1 text-ctp-yellow/80">
                You will need to sign back in to access your account.
              </p>
            </div>
          </div>

          <div
            className="
              mt-6
              flex
              flex-col
              gap-3
              sm:flex-row
            "
          >
            <Button
              variant="ghost"
              size="md"
              icon={NoSymbolIcon}
              onClick={() => setOpen(false)}
              className="w-full"
            >
              Cancel
            </Button>

            <Button
              variant="danger"
              size="md"
              icon={ArrowRightStartOnRectangleIcon}
              onClick={logout}
              className="w-full"
            >
              Log out
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
