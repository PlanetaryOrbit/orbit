import { useEffect, useState } from "react";
import Router from "next/router";
import { IconKeyOff } from "@tabler/icons-react";

export default function DatabaseErrorPage() {
  const [missingvars, setMissingVars] = useState<string[]>([]);

  useEffect(() => {
    try {
      fetch("/api/admin/env")
        .then((res) => res.json())
        .then((data) => {
          if (data.missing.length === 0) {
            Router.replace("/");
          } else {
            setMissingVars(data.missing);
          }
        });
    } catch (error) {
      console.error("Error fetching environment variables:", error);
    }
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-zinc-900 text-center px-4">
      <div className="w-32 h-32 rounded-full bg-blue-100 dark:bg-blue-800/20 flex items-center justify-center mx-auto mb-4 border border-blue-500 dark:border-blue-4000">
        <IconKeyOff
          className="w-16 h-16 text-blue-600 dark:text-blue-500"
          stroke={1.5}
        />
      </div>
      <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-500 mb-4">
        Environment Variables Not Configured
      </h1>
      <p className="text-zinc-700 dark:text-zinc-300">
        Please set the required environment variables in your deployment, the
        missing variables are: {missingvars.map((v, i) => {
          return (
            <code key={i} className="font-mono bg-zinc-200 dark:bg-white/5 dark:border dark:border-white/10 px-1 py-0.5 rounded ml-2">{v}</code>
          );
        })}.
      </p>
    </div>
  );
}
