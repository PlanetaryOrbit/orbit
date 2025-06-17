"use client"

import { IconCopy, IconInfoCircle, IconApi, IconChevronDown, IconChevronRight } from "@tabler/icons"
import { useRouter } from "next/router"
import { Fragment, useState } from "react"
import { Dialog, Transition } from "@headlessui/react"

export const ApiDocumentation = ({ triggerToast }: { triggerToast: any }) => {
  const router = useRouter()
  const { id: workspaceId } = router.query
  const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
  const [isOpen, setIsOpen] = useState(false)
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    general: true,
    activity: false,
    sessions: false,
    content: false,
    allies: false,
  })

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    triggerToast.success("Copied to clipboard")
  }

  const endpoints = {
    general: [
      {
        method: "GET",
        path: `/api/public/v1/workspace/${workspaceId}/info`,
        description: "Get workspace information including name, description, and member count",
        response: `{
  "success": true,
  "workspace": {
    "groupId": 14144149,
    "name": "My Workspace",
    "description": "Workspace description",
    "logo": "https://example.com/logo.png",
    "memberCount": 42,
    "roles": [
      {
        "id": "clz1234abcd",
        "name": "Owner",
        "permissions": ["MANAGE_MEMBERS", "MANAGE_ROLES", "MANAGE_SESSIONS"]
      }
    ]
  }
}`,
      },
      {
        method: "GET",
        path: `/api/public/v1/workspace/${workspaceId}/members`,
        description: "Get all workspace members with their roles and permissions",
        queryParams: [
          { name: "page", type: "number", description: "Page number (default: 1)" },
          { name: "limit", type: "number", description: "Items per page (default: 50, max: 100)" },
          { name: "role", type: "string", description: "Filter by role ID" },
        ],
        response: `{
  "success": true,
  "members": [
    {
      "userId": 123456,
      "username": "john_doe",
      "displayName": "John Doe",
      "thumbnail": "https://example.com/avatar.png",
      "role": {
        "id": "clz1234abcd",
        "name": "Owner",
        "permissions": ["MANAGE_MEMBERS", "MANAGE_ROLES", "MANAGE_SESSIONS"]
      }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50,
  "pages": 1
}`,
      },
    ],
    activity: [
      {
        method: "GET",
        path: `/api/public/v1/workspace/${workspaceId}/activity`,
        description: "Get activity sessions with filtering options",
        queryParams: [
          { name: "startDate", type: "ISO 8601", description: "Filter by start date (e.g., 2024-01-01T00:00:00Z)" },
          { name: "endDate", type: "ISO 8601", description: "Filter by end date (e.g., 2024-01-31T23:59:59Z)" },
          { name: "userId", type: "number", description: "Filter by user ID" },
          { name: "page", type: "number", description: "Page number (default: 1)" },
          { name: "limit", type: "number", description: "Items per page (default: 50, max: 100)" },
        ],
        response: `{
  "success": true,
  "sessions": [
    {
      "id": "clz1234abcd",
      "userId": 123456,
      "username": "john_doe",
      "active": false,
      "startTime": "2024-01-01T00:00:00Z",
      "endTime": "2024-01-01T01:00:00Z",
      "duration": 3600,
      "messages": 42
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50,
  "pages": 2
}`,
      },
      {
        method: "GET",
        path: `/api/public/v1/workspace/${workspaceId}/user/${"{userId}"}/activity`,
        description: "Get detailed activity for a specific user",
        queryParams: [
          { name: "startDate", type: "ISO 8601", description: "Filter by start date (e.g., 2024-01-01T00:00:00Z)" },
          { name: "endDate", type: "ISO 8601", description: "Filter by end date (e.g., 2024-01-31T23:59:59Z)" },
          { name: "page", type: "number", description: "Page number (default: 1)" },
          { name: "limit", type: "number", description: "Items per page (default: 50, max: 100)" },
        ],
        response: `{
  "success": true,
  "user": {
    "userId": 123456,
    "username": "john_doe",
    "displayName": "John Doe",
    "thumbnail": "https://example.com/avatar.png"
  },
  "activity": {
    "totalSessions": 42,
    "totalDuration": 151200,
    "averageDuration": 3600,
    "totalMessages": 1024,
    "sessions": [
      {
        "id": "clz1234abcd",
        "startTime": "2024-01-01T00:00:00Z",
        "endTime": "2024-01-01T01:00:00Z",
        "duration": 3600,
        "messages": 42
      }
    ]
  },
  "page": 1,
  "limit": 50,
  "pages": 1
}`,
      },
    ],
    sessions: [
      {
        method: "GET",
        path: `/api/public/v1/workspace/${workspaceId}/sessions`,
        description: "Get upcoming or past sessions with filtering options",
        queryParams: [
          { name: "upcoming", type: "boolean", description: "Get upcoming sessions (default: true)" },
          { name: "startDate", type: "ISO 8601", description: "Filter by start date (e.g., 2024-01-01T00:00:00Z)" },
          { name: "endDate", type: "ISO 8601", description: "Filter by end date (e.g., 2024-01-31T23:59:59Z)" },
          { name: "type", type: "string", description: "Filter by session type ID" },
          { name: "host", type: "number", description: "Filter by host user ID" },
          { name: "page", type: "number", description: "Page number (default: 1)" },
          { name: "limit", type: "number", description: "Items per page (default: 50, max: 100)" },
        ],
        response: `{
  "success": true,
  "sessions": [
    {
      "id": "clz1234abcd",
      "title": "Weekly Team Meeting",
      "description": "Regular team sync-up",
      "startTime": "2024-01-01T00:00:00Z",
      "endTime": "2024-01-01T01:00:00Z",
      "type": {
        "id": "clz5678efgh",
        "name": "Meeting",
        "color": "#3498db"
      },
      "host": {
        "userId": 123456,
        "username": "john_doe",
        "displayName": "John Doe",
        "thumbnail": "https://example.com/avatar.png"
      },
      "participants": [
        {
          "userId": 789012,
          "username": "jane_smith",
          "displayName": "Jane Smith",
          "thumbnail": "https://example.com/avatar2.png"
        }
      ],
      "maxParticipants": 10,
      "currentParticipants": 1
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50,
  "pages": 1
}`,
      },
      {
        method: "GET",
        path: `/api/public/v1/workspace/${workspaceId}/session-types`,
        description: "Get all session types with their configurations",
        response: `{
  "success": true,
  "types": [
    {
      "id": "clz5678efgh",
      "name": "Meeting",
      "description": "Regular team meetings",
      "color": "#3498db",
      "requiresApproval": false,
      "maxParticipants": 10,
      "allowSelfSignup": true
    }
  ]
}`,
      },
    ],
    content: [
      {
        method: "GET",
        path: `/api/public/v1/workspace/${workspaceId}/wall`,
        description: "Get wall posts with pagination",
        queryParams: [
          { name: "page", type: "number", description: "Page number (default: 1)" },
          { name: "limit", type: "number", description: "Items per page (default: 50, max: 100)" },
        ],
        response: `{
  "success": true,
  "posts": [
    {
      "id": "clz1234abcd",
      "content": "Welcome to our workspace!",
      "author": {
        "userId": 123456,
        "username": "john_doe",
        "displayName": "John Doe",
        "thumbnail": "https://example.com/avatar.png"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "image": "https://example.com/post-image.jpg"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 50,
  "pages": 1
}`,
      },
      {
        method: "POST",
        path: `/api/public/v1/workspace/${workspaceId}/wall`,
        description: "Create a new wall post",
        requestBody: `{
  "content": "Hello from the API!",
  "image": "https://example.com/image.jpg" // Optional
}`,
        response: `{
  "success": true,
  "post": {
    "id": "clz1234abcd",
    "content": "Hello from the API!",
    "author": {
      "userId": 123456,
      "username": "john_doe",
      "displayName": "John Doe",
      "thumbnail": "https://example.com/avatar.png"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "image": "https://example.com/image.jpg"
  }
}`,
      },
      {
        method: "GET",
        path: `/api/public/v1/workspace/${workspaceId}/docs`,
        description: "Get all documents/guides",
        queryParams: [
          { name: "page", type: "number", description: "Page number (default: 1)" },
          { name: "limit", type: "number", description: "Items per page (default: 50, max: 100)" },
        ],
        response: `{
  "success": true,
  "documents": [
    {
      "id": "clz1234abcd",
      "title": "Getting Started Guide",
      "description": "How to get started with our workspace",
      "author": {
        "userId": 123456,
        "username": "john_doe",
        "displayName": "John Doe",
        "thumbnail": "https://example.com/avatar.png"
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-02T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 50,
  "pages": 1
}`,
      },
      {
        method: "GET",
        path: `/api/public/v1/workspace/${workspaceId}/docs/${"{docId}"}`,
        description: "Get a specific document with its content",
        response: `{
  "success": true,
  "document": {
    "id": "clz1234abcd",
    "title": "Getting Started Guide",
    "description": "How to get started with our workspace",
    "content": "# Getting Started\\n\\nWelcome to our workspace! Here's how to get started...",
    "author": {
      "userId": 123456,
      "username": "john_doe",
      "displayName": "John Doe",
      "thumbnail": "https://example.com/avatar.png"
    },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-02T00:00:00Z"
  }
}`,
      },
    ],
    allies: [
      {
        method: "GET",
        path: `/api/public/v1/workspace/${workspaceId}/allies`,
        description: "Get all allies with their representatives and recent visits",
        queryParams: [
          { name: "page", type: "number", description: "Page number (default: 1)" },
          { name: "limit", type: "number", description: "Items per page (default: 50, max: 100)" },
        ],
        response: `{
  "success": true,
  "allies": [
    {
      "id": "clz1234abcd",
      "name": "Partner Organization",
      "description": "Our strategic partner",
      "logo": "https://example.com/partner-logo.png",
      "representatives": [
        {
          "id": "clz5678efgh",
          "name": "Jane Smith",
          "role": "CEO",
          "contact": "jane@example.com"
        }
      ],
      "recentVisits": [
        {
          "id": "clz9012ijkl",
          "date": "2024-01-01T00:00:00Z",
          "notes": "Discussed partnership renewal",
          "attendees": ["John Doe", "Jane Smith"]
        }
      ]
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 50,
  "pages": 1
}`,
      },
    ],
  }

  const openEndpointDetails = (endpoint: any) => {
    setSelectedEndpoint(endpoint)
    setIsOpen(true)
  }

  const renderEndpointList = (categoryEndpoints: any[]) => {
    return (
      <div className="space-y-3">
        {categoryEndpoints.map((endpoint, index) => (
          <div
            key={index}
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors"
            onClick={() => openEndpointDetails(endpoint)}
          >
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  endpoint.method === "GET"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                }`}
              >
                {endpoint.method}
              </span>
              <code className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate">{endpoint.path}</code>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{endpoint.description}</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">API Documentation</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Learn how to use the Orbit public API to access your workspace data
          </p>
        </div>

        <div className="space-y-4">
          {/* Base URL */}
          <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-600">
              <div className="bg-primary/10 p-2 rounded-lg">
                <IconApi className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Base URL</h2>
            </div>
            <div className="p-4">
              <div className="relative">
                <pre className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
                  <code className="text-gray-700 dark:text-gray-300">{baseUrl}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(baseUrl)}
                  className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <IconCopy size={16} />
                </button>
              </div>
              {/* Documentation link */}
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                📚 Looking for usage examples or endpoint details? Check out the{" "}
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

      {/* Endpoint Details Modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  {selectedEndpoint && (
                    <>
                      <Dialog.Title as="h3" className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              selectedEndpoint.method === "GET"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            }`}
                          >
                            {selectedEndpoint.method}
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {selectedEndpoint.path.split("/").slice(-1)[0]}
                          </span>
                        </div>
                      </Dialog.Title>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Endpoint</h4>
                          <div className="relative">
                            <pre className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-sm overflow-x-auto">
                              <code className="text-gray-700 dark:text-gray-300">{selectedEndpoint.path}</code>
                            </pre>
                            <button
                              onClick={() => copyToClipboard(selectedEndpoint.path)}
                              className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                              <IconCopy size={14} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Description</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEndpoint.description}</p>
                        </div>

                        {selectedEndpoint.queryParams && selectedEndpoint.queryParams.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Query Parameters</h4>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr>
                                    <th className="text-left font-medium text-gray-700 dark:text-gray-300 pb-2">
                                      Parameter
                                    </th>
                                    <th className="text-left font-medium text-gray-700 dark:text-gray-300 pb-2">
                                      Type
                                    </th>
                                    <th className="text-left font-medium text-gray-700 dark:text-gray-300 pb-2">
                                      Description
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedEndpoint.queryParams.map((param: any, i: number) => (
                                    <tr key={i} className="border-t border-gray-200 dark:border-gray-600">
                                      <td className="py-2 font-mono text-gray-700 dark:text-gray-300">{param.name}</td>
                                      <td className="py-2 text-gray-500 dark:text-gray-400">{param.type}</td>
                                      <td className="py-2 text-gray-600 dark:text-gray-300">{param.description}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {selectedEndpoint.requestBody && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Request Body</h4>
                              <button
                                onClick={() => copyToClipboard(selectedEndpoint.requestBody)}
                                className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
                              >
                                <IconCopy size={14} />
                                <span className="text-xs">Copy</span>
                              </button>
                            </div>
                            <pre className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-sm overflow-x-auto">
                              <code className="text-gray-700 dark:text-gray-300">{selectedEndpoint.requestBody}</code>
                            </pre>
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Response Example</h4>
                            <button
                              onClick={() => copyToClipboard(selectedEndpoint.response)}
                              className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1"
                            >
                              <IconCopy size={14} />
                              <span className="text-xs">Copy</span>
                            </button>
                          </div>
                          <pre className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-sm overflow-x-auto">
                            <code className="text-gray-700 dark:text-gray-300">{selectedEndpoint.response}</code>
                          </pre>
                        </div>
                      </div>

                      <div className="mt-6">
                        <button
                          type="button"
                          className="w-full justify-center rounded-lg bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          Close
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

ApiDocumentation.title = "API Documentation"
