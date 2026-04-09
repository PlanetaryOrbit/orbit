"use client";

import type React from "react";

import "@/styles/globals.scss";
import type { AppProps } from "next/app";
import { workspacestate } from "@/state";
import { RecoilRoot, useRecoilState, useRecoilValue } from "recoil";
import type { pageWithLayout } from "@/layoutTypes";
import { useEffect, useState, useRef } from "react";
import Head from "next/head";
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
} from "chart.js";
import { themeState } from "@/state/theme";
import AuthProvider from "./AuthProvider";
import axios from "axios";
import { loginState } from "@/state";
import { getRGBFromTailwindColor, DEFAULT_THEME_RGB } from "@/utils/themeColor";
import LoadingScreen from "@/components/loading";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
const INTERCOM_APP_ID = process.env.NEXT_PUBLIC_INTERCOM_APP_ID;

type AppPropsWithLayout = AppProps & {
  Component: pageWithLayout;
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

function ThemeHandler() {
  const theme = useRecoilValue(themeState);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme as string);
  }, [theme]);

  return null;
}

function ColorThemeHandler() {
  const [workspace] = useRecoilState(workspacestate);

  useEffect(() => {
    if (
      workspace &&
      workspace.groupTheme &&
      typeof workspace.groupTheme === "string"
    ) {
      const rgbValue = getRGBFromTailwindColor(workspace.groupTheme);
      document.documentElement.style.setProperty("--group-theme", rgbValue);
    } else {
      document.documentElement.style.setProperty("--group-theme", DEFAULT_THEME_RGB);
    }
  }, [workspace]);

  return null;
}

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const Layout =
    Component.layout ||
    (({ children }: { children: React.ReactNode }) => <>{children}</>);

	useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setShowLoader(false), 1200);
      return () => clearTimeout(t);
    }
  }, [loading]);

  return (
    <RecoilRoot>
      <Head>
        <title>Orbit</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `console.info('%c %cOrbit%c — The All In One Staff Management Solution%c\\n\\nUnder no circumstances should you paste anything into this console. 11/10 times you are asked will be scams.', 'padding-left: 2.5em; line-height: 4em; background-size: 2.5em; background-repeat: no-repeat; background-position: left center; background-image: url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNNDU3LjE0MSA5Ny42MjE0QzQxMC4yNiAzOC4xNjc0IDMzNy41ODUgMCAyNTUuOTkzIDBDMTgxLjMwNSAwIDExNC4wODYgMzEuOTgyOSA2Ny4yODcxIDgyLjk5OTdDMTE5LjQwNCA3Ni42MzgyIDE2Ni41OTIgNzguMjY1MSAyMDkuMDggODYuNTkyOEMyNTMuMDE0IDk1LjIwNDUgMjkxLjU3MSAxMTAuOTE2IDMyNS4wNDEgMTMxLjk5OEMzNjMuNzc0IDEyMi42NTQgNDAxLjYgMTEzLjU3MSA0MzcuNzA5IDEwNS4wMjJDNDQyLjk3IDEwMy42NzggNDQ5LjQ3NyAxMDEuMTk4IDQ1Ny4xNDEgOTcuNjIxNFpNNC4zNDEyNSAyMDguNzI0QzEwLjIzMjkgMTc3LjE2OCAyMS45MTQxIDE0Ny42NDkgMzguMjQwNCAxMjEuMzEyQzEwMC45MiAxMDkuODQ3IDE1NS41MDUgMTEwLjIyNSAyMDIuNjM2IDExOS40NjJDMjI5LjYwNCAxMjQuNzQ5IDI1NC4yOTEgMTMyLjk2NiAyNzYuODA3IDE0My42NUwyNjEuOTA3IDE0Ny4yNTNDMTc1LjQ5MSAxNjguMTQ5IDg2LjgwNjEgMTg5LjU5NCA0LjM0MTI1IDIwOC43MjRaTTAgMjUzLjE4QzAuMDMzMDAxOCAyNTAuMTIzIDAuMTE5NjAyIDI0Ny4wNzggMC4yNTg5MDMgMjQ0LjA0N0M4Ni42MTYgMjI0LjEwNiAxODAuMTQxIDIwMS40ODkgMjcwLjg0MSAxNzkuNTU3QzI4Ni45MDQgMTc1LjY3MiAzMDIuODc5IDE3MS44MDggMzE4LjcxIDE2Ny45ODZDMzQ5LjQ5MSAxODkuNDgyIDM3NS4xNDIgMjE2LjI2IDM5Ni4wODMgMjQ2LjU1QzQwOC4zNjYgMjY0LjMxOCA0MTkuMDM4IDI4My4zMTQgNDI4LjE1NiAzMDMuMTczQzM3MS43OTEgMzI3LjIxMyAzMDguNjM4IDMzNy45MjMgMjM1LjIzNCAzMjkuOEMxNjcuMDc2IDMyMi4yNTggODkuNTQ4NCAyOTguNDE1IDAgMjUzLjE4Wk0yLjQ2MjI3IDI5MS43NTdDMTkuODU3MSA0MTYuMjE1IDEyNi43MzkgNTEyIDI1NS45OTMgNTEyQzM0MC4wMiA1MTIgNDE0LjU5MSA0NzEuNTIgNDYxLjI2OSA0MDguOTk4QzQ1Ni41MDkgMzgzLjUxMSA0NDkuNzQ4IDM1OC4zNjYgNDQwLjg5MSAzMzQuMTUzQzM3OS43IDM2MC4xNzQgMzEwLjk0NSAzNzEuODc5IDIzMS41NDkgMzYzLjA5MkMxNjMuMjY5IDM1NS41MzYgODcuNTkwMyAzMzIuODc5IDIuNDYyMjcgMjkxLjc1N1pNNDg2LjM4NCAzNjcuNzU2QzQ5Ni45NDQgMzQ2LjAyOSA1MDQuNTIgMzIyLjU4NCA1MDguNTgxIDI5Ny45NTNDNDk2LjQ2IDMwNS44MDYgNDg0LjAzOSAzMTMuMDk3IDQ3MS4yODUgMzE5Ljc2MUM0NzcuMTUxIDMzNS40OCA0ODIuMTczIDM1MS41MjYgNDg2LjM4NCAzNjcuNzU2Wk00NzYuMzI2IDEyNS41NjVDNDk4LjgyNCAxNjMuNDg2IDUxMS44MTEgMjA3LjcxMyA1MTIgMjU0Ljk1OEM1MDcuMTU0IDI1OC40ODYgNTAyLjI2NCAyNjEuOTE3IDQ5Ny4zMjQgMjY1LjI0NEM0ODQuNjgyIDI3My43NjIgNDcxLjcxNSAyODEuNjExIDQ1OC4zNzQgMjg4LjcwN0M0NDguNTMyIDI2Ny4zNDIgNDM2Ljk4NCAyNDYuODA5IDQyMy42MzYgMjI3LjUwMkM0MDUuODQ2IDIwMS43NjkgMzg0Ljg3NSAxNzguMjQ5IDM2MC41NjggMTU3Ljg5M0MzODkuNzAyIDE1MC44ODMgNDE4LjE1NSAxNDQuMDcyIDQ0NS41NjEgMTM3LjU4NUw0NDUuNjg3IDEzNy41NTVMNDQ1LjgxMSAxMzcuNTIzQzQ1NC43MjEgMTM1LjI2OCA0NjUuMDI0IDEzMS4xMiA0NzYuMzI2IDEyNS41NjVaIiBmaWxsPSIjRkYwMDk5Ii8+Cjwvc3ZnPgo=")', 'font-weight: bold;', '', 'font-style: italic;');`,
          }}
        />
      </Head>

      <AuthProvider loading={loading} setLoading={setLoading} />
      <Initializer />
      <ThemeHandler />
      <ColorThemeHandler />

      {showLoader && <LoadingScreen done={!loading} />}

      {!loading && (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </RecoilRoot>
  );
}

function Initializer() {
  const [login] = useRecoilState(loginState);
  const posthogRef = useRef<any>(null);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    let mounted = true;
    (async () => {
      try {
        const posthog = (await import("posthog-js")).default;
        if (!mounted) return;
        posthog.init(POSTHOG_KEY as string, { api_host: POSTHOG_HOST });
        posthogRef.current = posthog;
      } catch (e) {
        console.error("Failed to init PostHog:", e);
      }
    })();
    return () => {
      mounted = false;
      try {
        posthogRef.current?.reset();
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    try {
      const ph = posthogRef.current;
      if (ph) {
        if (login) {
          try {
            ph.identify(String(login.username), {
              userid: String(login.userId),
              username: login.username,
            });
          } catch (e) {
            console.error("PostHog identify error:", e);
          }
        } else {
          try {
            ph.reset();
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error("PostHog identify error", e);
    }
  }, [login]);

  useEffect(() => {
    (async () => {
      if (INTERCOM_APP_ID === undefined) return;

      try {
        const cfgResp = await fetch("/api/intercom/config");
        const cfg = cfgResp.ok ? await cfgResp.json() : { configured: false };
        if (!cfg.configured) {
          console.warn(
            "Intercom server-side JWT not configured; skipping Intercom load."
          );
          return;
        }

        const Intercom = (await import("@intercom/messenger-js-sdk")).default;

        const avatar = `${window.location.origin}/avatars/${login.userId}.png`;
        const userId = String(login.userId);
        const payload: any = {
          app_id: INTERCOM_APP_ID,
          name: login.username,
          user_id: userId,
          avatar: { type: "image", image_url: avatar },
        };

        try {
          const r = await fetch("/api/intercom/token", {
            credentials: "same-origin",
          });
          if (r.ok) {
            const j = await r.json();
            if (j.intercom_user_hash) {
              payload.user_hash = j.intercom_user_hash;
            }
          }
        } catch (e) {}

        try {
          Intercom(payload);
        } catch (e) {
          console.error("Failed to initialize Intercom:", e);
        }
      } catch (e) {
        console.error("Intercom init error", e);
      }
    })();
  }, [login]);

  return null;
}

export default MyApp;