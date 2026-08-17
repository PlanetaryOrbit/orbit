"use client";

import { loginState, workspacestate } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useRecoilState } from "recoil";

export default function AuthProvider({
  loading,
  setLoading,
}: {
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [login, setLogin] = useRecoilState(loginState);
  const [workspace] = useRecoilState(workspacestate);
  const Router = useRouter();

  useEffect(() => {
    const path = Router.pathname;
    const publicPath =
      path === "/login" || path === "/welcome" || path === "/forgot-password";

    if (publicPath) {
      setLoading(false);
      return;
    }

    const checkLogin = async () => {
      try {
        const req = await axios.get("/api/@me");

        setLogin({
          ...req.data.user,
          workspaces: req.data.workspaces || [],
        });

        setLoading(false);
      } catch (err: any) {
        const error = err.response?.data?.error;

        if (error === "Workspace not setup") {
          Router.push("/welcome");
          setLoading(false);
          return;
        }

        if (error === "Not logged in") {
          Router.push("/login");
          setLoading(false);
          return;
        }

        console.error("Login check error:", err.response?.data ?? err);

        setLoading(false);
      }
    };

    checkLogin();
  }, [Router.pathname, setLoading, setLogin]);

  return <></>;
}
