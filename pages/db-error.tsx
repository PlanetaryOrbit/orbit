import { useEffect } from "react";
import Router from "next/router";
import { IconDatabaseExclamation } from "@tabler/icons-react";

export default function DatabaseErrorPage() {
  const isDbConfigured = process.env.NEXT_PUBLIC_DATABASE_CHECK === "true";

  useEffect(() => {
    if (isDbConfigured) {
      Router.replace("/"); // Redirect back to homepage
    }
  }, [isDbConfigured]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-zinc-900 text-center px-4">
      <div className="w-32 h-32 rounded-full bg-red-100 dark:bg-red-800/20 flex items-center justify-center mx-auto mb-4 border border-red-500 dark:border-red-4000">
        <IconDatabaseExclamation className="w-16 h-16 text-red-600 dark:text-red-500" stroke={1.5} />
      </div>
      <h1 className="text-3xl font-bold text-red-600 dark:text-red-500 mb-4">Database Not Configured</h1>
      <p className="text-zinc-700 dark:text-zinc-300">
        Please set the <code className="font-mono bg-zinc-200 dark:bg-white/5 dark:border dark:border-white/10 px-1 py-0.5 rounded">DATABASE_URL</code> environment variable in your deployment.
      </p>
    </div>
  );
}
