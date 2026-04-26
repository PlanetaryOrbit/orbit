import type { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { loginState } from "@/state";
import { useRecoilState } from "recoil";
import { useForm, FormProvider } from "react-hook-form";
import Router from "next/router";
import Slider from "@/components/slider";
import Input from "@/components/input";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { IconCheck, IconCloud, IconEye, IconEyeOff, IconInfoCircle, IconX } from "@tabler/icons-react";

type FormData = {
  username: string;
  password: string;
  verifypassword: string;
};

const Login: NextPage = () => {
  const [selectedColor, setSelectedColor] = useState("bg-orbit");
  const [login, setLogin] = useRecoilState(loginState);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false)
  const methods = useForm<{ groupid: string }>();
  const signupform = useForm<FormData>();
  const { register, handleSubmit, formState: { errors } } = methods;
  const [selectedSlide, setSelectedSlide] = useState(0);
  const [ocEnabled, setOcEnabled] = useState(false);
  const [ockey, setOckey] = useState("");
  const [ocKeyStatus, setOcKeyStatus] = useState<"verified" | "failed" | "Saved" | null>(null);
  const [ocTesting, setOcTesting] = useState(false);
  const [ocLoading, setOcLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const testedKey = useRef<string | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        await axios.get("/api/@me")
        setIsRegistered(true)
      } catch (err: any) {
        const status = err.response?.status
        if (status != 200) {
          setIsRegistered(false)
        }
      }
    }

    checkLogin()
  }, [])

  async function createAccount() {
    setIsLoading(true);
    let request: { data: { success: boolean; user: any } } | undefined;

    try {
      // Add timeout to the request
      request = await Promise.race([
        axios.post('/api/setupworkspace', {
          groupid: methods.getValues("groupid"),
          username: signupform.getValues("username"),
          password: signupform.getValues("password"),
          color: selectedColor,
          ...(ocKeyStatus === "verified" && ockey.trim() ? { opencloudKey: ockey.trim() } : {}),
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        )
      ]) as { data: { success: boolean; user: any } };

      if (request?.data.success) {
        toast.success('Workspace created successfully!');
        setLogin(prev => ({
          ...prev,
          ...request?.data.user,
          isOwner: true
        }));
        Router.push("/");
      }
    } catch (e: any) {
      if (e?.response?.status === 404) {
        signupform.setError("username", {
          type: "custom",
          message: e.response.data.error
        });
        toast.error('Username not found');
      } else if (e?.response?.status === 403) {
        toast.error('Workspace already exists');
      } else if (e?.message === 'Request timeout') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('An error occurred. Please try again.');
        console.error('Setup workspace error:', e);
      }
      return;
    } finally {
      setIsLoading(false);
      if (!request) return;

      // Add a small delay before redirecting
      setTimeout(() => {
        Router.push("/");
        Router.reload();
      }, 1000);
    }
  }

  const testOcKey = async (keyToTest: string | null): Promise<boolean> => {
    const errorMessages: Record<number, string> = {
      1: "API key is missing the 'group' scope",
      2: "API key needs both read and write permissions",
      3: "API key has expired",
      4: "API key is disabled",
      5: "Invalid API key",
      400: "API key is not provided in a valid format.",
    };
    try {
      const payload = keyToTest && keyToTest.trim() !== "" ? { key: keyToTest } : {};
      const response = await axios.post(
        `/api/setup/opencloudtest`,
        payload
      );
      if (response.data.success) {
        testedKey.current = keyToTest && keyToTest.trim() !== "" ? keyToTest.trim() : "•";
        setOcKeyStatus("verified");
        return true;
      }
      setOcKeyStatus("failed");
      toast.error("API key is invalid");
      return false;
    } catch (error: any) {
      const code = error?.response?.data?.code;
      const message = error?.response?.data?.message;
      setOcKeyStatus("failed");
      toast.error(errorMessages[code] || message || "Failed to test key");
      return false;
    }
  };

  const handleOcTest = async () => {
    if (!ockey.trim()) {
      toast.error("Please enter an Open Cloud API key first");
      return;
    }
    setOcTesting(true);
    const valid = await testOcKey(ockey);
    if (valid) toast.success("API key is valid");
    setOcTesting(false);
  };

  const nextSlide = () => {
    setSelectedSlide(selectedSlide + 1);
  };

  const colors = [
    "bg-pink-100",
    "bg-rose-100",
    "bg-orange-100",
    "bg-amber-100",
    "bg-lime-100",
    "bg-emerald-100",
    "bg-cyan-100",
    "bg-sky-100",
    "bg-indigo-100",
    "bg-purple-100",
    "bg-pink-400",
    "bg-rose-400",
    "bg-orange-400",
    "bg-amber-400",
    "bg-lime-400",
    "bg-emerald-400",
    "bg-cyan-400",
    "bg-sky-400",
    "bg-indigo-400",
    "bg-violet-400",
    "bg-orbit",
    "bg-rose-600",
    "bg-orange-600",
    "bg-amber-600",
    "bg-lime-600",
    "bg-emerald-600",
    "bg-cyan-600",
    "bg-sky-600",
    "bg-indigo-600",
    "bg-violet-600",
  ];

  return (
    <div className="min-h-screen bg-infobg-light dark:bg-infobg-dark bg-no-repeat bg-cover bg-center flex flex-col">
      <Toaster position="bottom-center" />
      <div className="hidden sm:block absolute top-4 left-4 pointer-events-none">
        <p className="text-white sm:text-3xl md:text-5xl font-extrabold leading-tight">
          👋 Welcome <br /> to <span className="text-pink-100">Orbit</span>
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <Slider activeSlide={selectedSlide}>
            <div>
              <p className="font-bold text-2xl dark:text-white">Let&apos;s get started</p>
              <p className="text-sm mt-1 text-zinc-500 dark:text-zinc-200">
                To configure your Orbit instance, we&apos;ll need some information
              </p>
              <FormProvider {...methods}>
                <form className="mt-4" onSubmit={handleSubmit(nextSlide)}>
                  <Input
                    placeholder="35724790"
                    label="Group ID"
                    id="groupid"
                    {...register("groupid", {
                      required: {
                        value: true,
                        message: "This field is required"
                      },
                      pattern: {
                        value: /^\d+$/,
                        message: "Group ID must be a number"
                      }
                    })}
                  />
                </form>
              </FormProvider>

              <div className="mt-5">
                <label className="text-zinc-500 text-sm dark:text-zinc-200">Color</label>
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 mt-2 mb-6">
                  {colors.map((color, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`aspect-square rounded-lg transform transition-all ease-in-out ${color} ${selectedColor === color
                        ? "ring-2 ring-black dark:ring-white ring-offset-2"
                        : "hover:scale-105"
                        }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => window.open("https://docs.planetaryapp.cloud/", "_blank", "noopener,noreferrer")}
                  className="border-orbit border-2 py-2.5 text-sm rounded-xl px-4 text-zinc-600 dark:text-white font-bold hover:bg-orbit/10 transition"
                >
                  Docs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isRegistered) {
                      Router.push('/');
                    } else {
                      handleSubmit(nextSlide)();
                    }
                  }}
                  className="ml-auto bg-orbit py-2.5 text-sm rounded-xl px-6 text-white font-bold hover:bg-orbit/80 transition"
                >
                  Continue
                </button>
              </div>
            </div>

            <div>
              <p className="font-bold text-2xl dark:text-white">Open Cloud</p>
              <p className="text-sm mt-1 text-zinc-500 dark:text-zinc-200">
                Optionally connect Roblox Open Cloud for deeper integration with your group. You can always set this up later in Settings.
              </p>

              <div className="mt-5 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      API key
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={ockey}
                        onChange={(e) => {
                          setOckey(e.target.value);
                          setOcKeyStatus(null);
                        }}
                        placeholder="Open Cloud API key"
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-3 pr-11 text-sm text-zinc-900 transition-colors focus:border-orbit focus:ring-2 focus:ring-orbit/25 dark:border-zinc-600 dark:bg-zinc-950/50 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey((v) => !v)}
                        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800 dark:hover:bg-zinc-700/80 dark:hover:text-zinc-200"
                        aria-label={showApiKey ? "Hide API key" : "Show API key"}
                      >
                        {showApiKey
                          ? <IconEye className="h-4 w-4" stroke={1.5} />
                          : <IconEyeOff className="h-4 w-4" stroke={1.5} />
                        }
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOcTest}
                      disabled={ocTesting || ocLoading || !ockey.trim()}
                      className="rounded-lg bg-zinc-200 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                    >
                      {ocTesting ? "Testing…" : "Test key"}
                    </button>
                    {ocKeyStatus === "verified" && (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                        <IconCheck className="h-4 w-4" stroke={2} /> Verified
                      </span>
                    )}
                    {ocKeyStatus === "Saved" && (
                      <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                        <IconCheck className="h-4 w-4" stroke={2} /> Saved
                      </span>
                    )}
                    {ocKeyStatus === "failed" && (
                      <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                        <IconX className="h-4 w-4" stroke={2} /> Invalid
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Requires{" "}
                    <b className="text-zinc-700 dark:text-zinc-200">group:read</b> and{" "}
                    <b className="text-zinc-700 dark:text-zinc-200">group:write</b> permissions. Must be a USER API key.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                <IconInfoCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" stroke={2} />
                <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                  <b>Recommended:</b> An API key unlocks deeper Roblox group features in Orbit. You can skip this and configure it later in Settings.
                </p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSlide(0)}
                  className="bg-zinc-100 dark:bg-zinc-700 py-2.5 text-sm rounded-xl px-6 text-zinc-700 dark:text-white font-bold hover:bg-zinc-200 dark:hover:bg-zinc-600 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSlide(2)}
                  disabled={ocTesting || (ockey.length > 0 && ocKeyStatus !== "verified")}
                  className={`ml-auto bg-orbit py-2.5 text-sm rounded-xl px-6 text-white font-bold hover:bg-orbit/80 transition ${ocTesting || (ockey.length > 0 && ocKeyStatus !== "verified") ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  {ockey.length === 0 ? "Skip this" : "Continue"}
                </button>
              </div>
            </div>

            {!isRegistered && (
              <div>
                <p className="font-bold text-2xl dark:text-white">Make your Orbit account</p>
                <p className="text-sm mt-1 text-zinc-500 dark:text-zinc-200">
                  You need to create an Orbit account to continue
                </p>
                <FormProvider {...signupform}>
                  <form className="mt-4" onSubmit={signupform.handleSubmit(createAccount)}>
                    <Input
                      {...signupform.register("username", {
                        required: "Username is required"
                      })}
                      label="Roblox Username"
                    />
                    {signupform.formState.errors.username && (
                      <p className="text-red-500 text-sm mt-1">
                        {signupform.formState.errors.username.message}
                      </p>
                    )}

                    <Input
                      type="password"
                      {...signupform.register("password", {
                        required: "Password is required",
                        minLength: {
                          value: 8,
                          message: "Password must be at least 8 characters"
                        }
                      })}
                      label="Password"
                    />
                    {signupform.formState.errors.password && (
                      <p className="text-red-500 text-sm mt-1">
                        {signupform.formState.errors.password.message}
                      </p>
                    )}

                    <Input
                      type="password"
                      {...signupform.register("verifypassword", {
                        required: "Please verify your password",
                        validate: value =>
                          value === signupform.getValues('password') ||
                          "Passwords do not match"
                      })}
                      label="Verify password"
                    />
                    {signupform.formState.errors.verifypassword && (
                      <p className="text-red-500 text-sm mt-1">
                        {signupform.formState.errors.verifypassword.message}
                      </p>
                    )}
                  </form>
                </FormProvider>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedSlide(1)}
                    className="bg-zinc-100 dark:bg-zinc-700 py-2.5 text-sm rounded-xl px-6 text-zinc-700 dark:text-white font-bold hover:bg-zinc-200 dark:hover:bg-zinc-600 transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={signupform.handleSubmit(createAccount)}
                    disabled={isLoading}
                    className={`ml-auto bg-orbit py-2.5 text-sm rounded-xl px-6 text-white font-bold hover:bg-orbit/80 transition ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isLoading ? 'Creating...' : 'Continue'}
                  </button>
                </div>
              </div>
            )}
          </Slider>
        </div>
      </div>
    </div>
  );
};

export default Login;