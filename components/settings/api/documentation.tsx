"use client"

import { IconCopy, IconApi } from "@tabler/icons-react";

export const ApiDocumentation = ({ triggerToast }: { triggerToast: any }) => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    triggerToast.success("Copied to clipboard")
  }

  return (
    <>
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white">API Documentation</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Learn how to use the Orbit public API to access your workspace data
          </p>
        </div>

        <div className="space-y-4">
          {/* Base URL */}
          <div className="bg-white dark:bg-zinc-700 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-zinc-600">
              <div className="bg-primary/10 p-2 rounded-lg">
                <IconApi className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-medium text-zinc-900 dark:text-white">Base URL</h2>
            </div>
            <div className="p-4">
              <div className="relative">
                <pre className="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-lg text-sm overflow-x-auto">
                  <code className="text-zinc-700 dark:text-zinc-300">{baseUrl}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(baseUrl)}
                  className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <IconCopy size={16} />
                </button>
              </div>
              {/* Documentation link */}
              <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
                Check out the{" "}
                <a
                  href="https://docs.planetaryapp.cloud/api-references/introduction"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:opacity-80"
                >
                  Orbit API Documentation
                </a>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

ApiDocumentation.title = "API Documentation"