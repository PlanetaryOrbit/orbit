import type React from "react";
import "@/styles/globals.scss";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { RecoilRoot, useRecoilState } from "recoil";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
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
import type { pageWithLayout } from "@/layoutTypes";
import { workspacestate } from "@/state";
import AuthProvider from "./AuthProvider";
import { getRGBFromTailwindColor, DEFAULT_THEME_RGB } from "@/utils/themeColor";
import LoadingScreen from "@/components/loading";
import HelpFloatingButton, {
  HelpProvider,
} from "@/components/HelpFloatingButton";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

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
  LineElement,
);

function ColorThemeHandler() {
  const [workspace] = useRecoilState(workspacestate);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const isDark = resolvedTheme === "dark";

    const darkTheme = (
      workspace as {
        groupDarkTheme?: unknown;
      } | null
    )?.groupDarkTheme;

    const lightTheme = workspace?.groupTheme;

    const activeTheme =
      isDark && typeof darkTheme === "string"
        ? darkTheme
        : typeof lightTheme === "string"
          ? lightTheme
          : null;

    document.documentElement.style.setProperty(
      "--group-theme",
      activeTheme ? getRGBFromTailwindColor(activeTheme) : DEFAULT_THEME_RGB,
    );
  }, [workspace, resolvedTheme]);

  return null;
}

function ConsoleBanner() {
  useEffect(() => {
    const styles = {
      logo: [
        "font-size: 16px",
        "font-weight: 800",
        "color: #ff0099",
        "letter-spacing: -0.02em",
      ].join(";"),

      title: ["font-size: 16px", "font-weight: 800", "color: #fff"].join(";"),

      subtitle: ["font-size: 12px", "font-weight: 500", "color: #a1a1aa"].join(
        ";",
      ),

      warning: [
        "margin-top: 8px",
        "font-size: 13px",
        "line-height: 1.6",
        "font-weight: 600",
        "color: #f4f4f5",
      ].join(";"),

      danger: ["font-size: 13px", "font-weight: 800", "color: #ff4d6d"].join(
        ";",
      ),
    };

    console.info(
      "%cOrbit %c— The All In One Staff Management Solution",
      styles.logo,
      styles.title,
    );

    console.info(
      "%c\n%s",
      styles.subtitle,
      "Staff management, without the headache.",
    );

    console.info(
      "%c\n%s",
      styles.warning,
      "Under no circumstances should you paste anything into this console.",
    );

    console.info(
      "%c%s",
      styles.danger,
      "If someone asks you to paste code here, it is almost certainly a scam. Only paste code from trusted sources.",
    );
  }, []);

  return null;
}

function Orbit({ Component, pageProps }: AppPropsWithLayout) {
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const Layout = useMemo(
    () =>
      Component.layout ??
      (({ children }: { children: React.ReactNode }) => <>{children}</>),
    [Component.layout],
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 640px)");

    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (loading) return;

    const timeout = window.setTimeout(() => {
      setShowLoader(false);
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [loading]);

  return (
    <RecoilRoot>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <Head>
          <title>Orbit</title>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, viewport-fit=cover"
          />
          <meta
            name="description"
            content="Orbit — The all-in-one staff management solution."
          />
        </Head>

        <div className={`${inter.variable} ${jetbrains.variable}`}>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-black focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:bg-zinc-900 dark:focus:text-white"
          >
            Skip to main content
          </a>

          <ConsoleBanner />

          <AuthProvider loading={loading} setLoading={setLoading} />
          <ColorThemeHandler />

          {showLoader && <LoadingScreen done={!loading} />}

          {!showLoader && (
            <Layout>
              <HelpProvider>
                <main
                  id="main-content"
                  tabIndex={-1}
                  className="pb-8 outline-none sm:pb-0"
                >
                  <Toaster
                    position={isMobile ? "top-center" : "bottom-center"}
                    toastOptions={{
                      className:
                        "rounded-[14px] shadow-[0_8px_30px_rgba(0,0,0,0.35)]",
                    }}
                  />

                  <Component {...pageProps} />
                </main>

                <HelpFloatingButton />
              </HelpProvider>
            </Layout>
          )}
        </div>
      </ThemeProvider>
    </RecoilRoot>
  );
}

export default Orbit;
