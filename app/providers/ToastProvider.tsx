"use client";

import { Toaster } from "react-hot-toast";
import CustomToast from "@/components/Toast";

export default function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      containerStyle={{
        bottom: 24,
        right: 24,
      }}
    >
      {(t) => (
        <CustomToast
          t={t}
          message={String(t.message)}
          type={
            t.type === "success"
              ? "success"
              : t.type === "error"
                ? "error"
                : "info"
          }
        />
      )}
    </Toaster>
  );
}
