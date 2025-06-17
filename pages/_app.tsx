"use client"

import type React from "react"

import "@/styles/globals.scss" // Global styles should only be imported here
import type { AppProps } from "next/app"
import { workspacestate } from "@/state"
import { RecoilRoot, useRecoilState, useRecoilValue } from "recoil"
import type { pageWithLayout } from "@/layoutTypes"
import { useEffect, useState } from "react"
import Head from "next/head"
import Router from "next/router"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js"
import { themeState } from "../state/theme"
import AuthProvider from "./AuthProvider"
import axios from "axios"

type AppPropsWithLayout = AppProps & {
  Component: pageWithLayout
}

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement)

function ThemeHandler() {
  const theme = useRecoilValue(themeState)

  useEffect(() => {
    if (!theme) return
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(theme)
  }, [theme])

  return null
}

function ColorThemeHandler() {
  const [workspace] = useRecoilState(workspacestate)

  useEffect(() => {
    const defaultColor = "236, 72, 153"

    if (workspace && workspace.groupTheme && typeof workspace.groupTheme === "string") {
      const rgbValue = getRGBFromTailwindColor(workspace.groupTheme)
      document.documentElement.style.setProperty("--group-theme", rgbValue)
    } else {
      document.documentElement.style.setProperty("--group-theme", defaultColor)
    }
  }, [workspace])

  return null
}

function getRGBFromTailwindColor(tw: any): string {
  const fallback = "236, 72, 153" // pink-500

  if (!tw || typeof tw !== "string") {
    if (tw !== null && tw !== undefined) {
      console.warn("Invalid color value:", tw)
    }
    return fallback
  }

  const colorName = tw.replace("bg-", "")

  if (colorName === "orbit") {
    return "0, 112, 240"
  }

  const colorMap: Record<string, string> = {
    "blue-500": "59, 130, 246",
    "red-500": "239, 68, 68",
    "red-700": "185, 28, 28",
    "green-500": "34, 197, 94",
    "green-600": "22, 163, 74",
    "yellow-500": "234, 179, 8",
    "orange-500": "249, 115, 22",
    "purple-500": "168, 85, 247",
    "pink-500": "236, 72, 153",
    black: "0, 0, 0",
    "gray-500": "107, 114, 128",
  }

  return colorMap[colorName] || fallback
}

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null);
  const Layout = Component.layout || (({ children }: { children: React.ReactNode }) => <>{children}</>)

  const isDbConfigured = process.env.NEXT_PUBLIC_DATABASE_CHECK === "true"

  // Redirect to /db-error if DB is not configured and we're not already there
  useEffect(() => {
    if (typeof window !== "undefined") {
      const currentPath = window.location.pathname
      if (!isDbConfigured && currentPath !== "/db-error") {
        Router.replace("/db-error")
      }
    }
  }, [isDbConfigured])

  useEffect(() => {
    axios.get("/api/@me").then(res => {
      setUser(res.data.user || res.data);
    });
  }, []);

  return (
    <RecoilRoot>
      <Head>
        <title>Orbit</title>
        <script>
          console.info(
          `%c %cOrbit -%c—The All In One Staff Management Solution%c\n\nUnder no circumstances should you paste anything into this console. 11/10 times you are asked will be scams.`,
          `padding-left: 2.5em; line-height: 4em; background-size: 2.5em; background-repeat: no-repeat; background-position: left center; background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNDU3LjE0MSA5Ny42MjE0QzQxMC4yNiAzOC4xNjc0IDMzNy41ODUgMCAyNTUuOTkzIDBDMTgxLjMwNSAwIDExNC4wODYgMzEuOTgyOSA2Ny4yODcxIDgyLjk5OTdDMTE5LjQwNCA3Ni42MzgyIDE2Ni41OTIgNzguMjY1MSAyMDkuMDggODYuNTkyOEMyNTMuMDE0IDk1LjIwNDUgMjkxLjU3MSAxMTAuOTE2IDMyNS4wNDEgMTMxLjk5OEMzNjMuNzc0IDEyMi42NTQgNDAxLjYgMTEzLjU3MSA0MzcuNzA5IDEwNS4wMjJDNDQyLjk3IDEwMy42NzggNDQ5LjQ3NyAxMDEuMTk4IDQ1Ny4xNDEgOTcuNjIxNFpNNC4zNDEyNSAyMDguNzI0QzEwLjIzMjkgMTc3LjE2OCAyMS45MTQxIDE0Ny42NDkgMzguMjQwNCAxMjEuMzEyQzEwMC45MiAxMDkuODQ3IDE1NS41MDUgMTEwLjIyNSAyMDIuNjM2IDExOS40NjJDMjI5LjYwNCAxMjQuNzQ5IDI1NC4yOTEgMTMyLjk2NiAyNzYuODA3IDE0My42NUwyNjEuOTA3IDE0Ny4yNTNDMTc1LjQ5MSAxNjguMTQ5IDg2LjgwNjEgMTg5LjU5NCA0LjM0MTI1IDIwOC43MjRaTTAgMjUzLjE4QzAuMDMzMDAxOCAyNTAuMTIzIDAuMTE5NjAyIDI0Ny4wNzggMC4yNTg5MDMgMjQ0LjA0N0M4Ni42MTYgMjI0LjEwNiAxODAuMTQxIDIwMS40ODkgMjcwLjg0MSAxNzkuNTU3QzI4Ni45MDQgMTc1LjY3MiAzMDIuODc5IDE3MS44MDggMzE4LjcxIDE2Ny45ODZDMzQ5LjQ5MSAxODkuNDgyIDM3NS4xNDIgMjE2LjI2IDM5Ni4wODMgMjQ2LjU1QzQwOC4zNjYgMjY0LjMxOCA0MTkuMDM4IDI4My4zMTQgNDI4LjE1NiAzMDMuMTczQzM3MS43OTEgMzI3LjIxMyAzMDguNjM4IDMzNy45MjMgMjM1LjIzNCAzMjkuOEMxNjcuMDc2IDMyMi4yNTggODkuNTQ4NCAyOTguNDE1IDAgMjUzLjE4Wk0yLjQ2MjI3IDI5MS43NTdDMTkuODU3MSA0MTYuMjE1IDEyNi43MzkgNTEyIDI1NS45OTMgNTEyQzM0MC4wMiA1MTIgNDE0LjU5MSA0NzEuNTIgNDYxLjI2OSA0MDguOTk4QzQ1Ni41MDkgMzgzLjUxMSA0NDkuNzQ4IDM1OC4zNjYgNDQwLjg5MSAzMzQuMTUzQzM3OS43IDM2MC4xNzQgMzEwLjk0NSAzNzEuODc5IDIzMS41NDkgMzYzLjA5MkMxNjMuMjY5IDM1NS41MzYgODcuNTkwMyAzMzIuODc5IDIuNDYyMjcgMjkxLjc1N1pNNDg2LjM4NCAzNjcuNzU2QzQ5Ni45NDQgMzQ2LjAyOSA1MDQuNTIgMzIyLjU4NCA1MDguNTgxIDI5Ny45NTNDNDk2LjQ2IDMwNS44MDYgNDg0LjAzOSAzMTMuMDk3IDQ3MS4yODUgMzE5Ljc2MUM0NzcuMTUxIDMzNS40OCA0ODIuMTczIDM1MS41MjYgNDg2LjM4NCAzNjcuNzU2Wk00NzYuMzI2IDEyNS41NjVDNDk4LjgyNCAxNjMuNDg2IDUxMS44MTEgMjA3LjcxMyA1MTIgMjU0Ljk1OEM1MDcuMTU0IDI1OC40ODYgNTAyLjI2NCAyNjEuOTE3IDQ5Ny4zMjQgMjY1LjI0NEM0ODQuNjgyIDI3My43NjIgNDcxLjcxNSAyODEuNjExIDQ1OC4zNzQgMjg4LjcwN0M0NDguNTMyIDI2Ny4zNDIgNDM2Ljk4NCAyNDYuODA5IDQyMy42MzYgMjI3LjUwMkM0MDUuODQ2IDIwMS43NjkgMzg0Ljg3NSAxNzguMjQ5IDM2MC41NjggMTU3Ljg5M0MzODkuNzAyIDE1MC44ODMgNDE4LjE1NSAxNDQuMDcyIDQ0NS41NjEgMTM3LjU4NUw0NDUuNjg3IDEzNy41NTVMNDQ1LjgxMSAxMzcuNTIzQzQ1NC43MjEgMTM1LjI2OCA0NjUuMDI0IDEzMS4xMiA0NzYuMzI2IDEyNS41NjVaIiBmaWxsPSIjRkYwMDk5Ii8+Cjwvc3ZnPgo=")`,
          "font-weight: bold;",
          "",
          "font-style: italic;"
          );
        </script>
      </Head>

      <AuthProvider loading={loading} setLoading={setLoading} />
      <ThemeHandler />
      <ColorThemeHandler />

      {!loading ? (
        <Layout>
          <>
            <Component {...pageProps} />
            {user && <BirthdayPrompt user={user} setUser={setUser} />}
          </>
        </Layout>
      ) : (
        <div className="flex h-screen dark:bg-gray-900">
          <svg
            aria-hidden="true"
            className="w-24 h-24 text-gray-200 animate-spin dark:text-gray-600 fill-orbit my-auto mx-auto"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
              fill="currentColor"
            />
            <path
              d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
              fill="currentFill"
            />
          </svg>
        </div>
      )}
    </RecoilRoot>
  )
}

function BirthdayPrompt({ user, setUser }: { user: any, setUser: any }) {
  const needsBirthday =
    user.birthdayDay === null ||
    user.birthdayMonth === null;

  const [open, setOpen] = useState(needsBirthday);
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOpen(needsBirthday);
  }, [needsBirthday]);

  if (!open) return null;

  const daysInMonth = (month: number) => {
    if (month === 2) return 28;
    if ([4, 6, 9, 11].includes(month)) return 30;
    return 31;
  };

  const months = [
    { name: "January", value: 1 },
    { name: "February", value: 2 },
    { name: "March", value: 3 },
    { name: "April", value: 4 },
    { name: "May", value: 5 },
    { name: "June", value: 6 },
    { name: "July", value: 7 },
    { name: "August", value: 8 },
    { name: "September", value: 9 },
    { name: "October", value: 10 },
    { name: "November", value: 11 },
    { name: "December", value: 12 },
  ];

  const handleSave = async () => {
    setLoading(true);
    await axios.post("/api/user/birthday", { day: Number(day), month: Number(month) });
    setUser({ ...user, birthdayDay: Number(day), birthdayMonth: Number(month) });
    setOpen(false);
    setLoading(false);
  };

  const handleSkip = async () => {
    setLoading(true);
    await axios.post("/api/user/birthday", { day: 0, month: 0 });
    setUser({ ...user, birthdayDay: 0, birthdayMonth: 0 });
    setOpen(false);
    setLoading(false);
  };

  const days = month
    ? Array.from({ length: daysInMonth(Number(month)) }, (_, i) => i + 1)
    : [];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg min-w-[300px]">
        <h2 className="text-lg font-bold dark:text-white mb-2">🎂 Set your birthday</h2>
        <div className="flex gap-2 mb-4">
          <select
            value={month}
            onChange={e => {
              setMonth(e.target.value);
              setDay("");
            }}
            className="border rounded px-2 py-1 w-32"
          >
            <option value="">Month</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.name}</option>
            ))}
          </select>
          <select
            value={day}
            onChange={e => setDay(e.target.value)}
            className="border rounded px-2 py-1 w-20"
            disabled={!month}
          >
            <option value="">Day</option>
            {days.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading || !day || !month}
            className="bg-orbit text-white px-4 py-2 rounded"
          >
            {loading ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleSkip}
            disabled={loading}
            className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded"
            type="button"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

export default MyApp
