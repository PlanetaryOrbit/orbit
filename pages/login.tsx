import { NextPage } from "next";
<<<<<<< main
import { useForm, FormProvider, SubmitHandler } from 'react-hook-form';
import React, { useEffect, useState } from "react";
import { loginState } from "@/state";
=======
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import React, { useEffect, useState, useRef } from "react";
>>>>>>> main
import { useRecoilState } from "recoil";
import { loginState } from "@/state";
import Button from "@/components/button";
import Router from "next/router";
import axios from "axios";
import Input from "@/components/input";
import Link from "next/link";
import { useTheme } from "next-themes";
import ThemeToggle from "@/components/ThemeToggle";
import { Dialog } from "@headlessui/react";
import { IconX } from "@tabler/icons";

type LoginForm = { username: string; password: string };
type SignupForm = { username: string; password: string; verifypassword: string };

const Login: NextPage = () => {
  const [login, setLogin] = useRecoilState(loginState);

  const loginMethods = useForm<LoginForm>();
  const signupMethods = useForm<SignupForm>();

  const { register: regLogin, handleSubmit: submitLogin, setError: setErrLogin } = loginMethods;
  const { register: regSignup, handleSubmit: submitSignup, setError: setErrSignup, getValues: getSignupValues } = signupMethods;

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signupStep, setSignupStep] = useState<0 | 1 | 2>(0);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Background gradient animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const colors = [
      style.getPropertyValue("--gradient-color-1").trim() || "#00d0bc",
      style.getPropertyValue("--gradient-color-2").trim() || "#005253",
      style.getPropertyValue("--gradient-color-3").trim() || "#6529ff",
      style.getPropertyValue("--gradient-color-4").trim() || "#822eff",
    ];

    let width = window.innerWidth, height = window.innerHeight, angle = 0;
    canvas.width = width;
    canvas.height = height;

    const animate = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      angle += 0.002;
      const x = Math.cos(angle) * width;
      const y = Math.sin(angle) * height;

      const grad = ctx.createLinearGradient(0, 0, x, y);
      colors.forEach((color, i) => grad.addColorStop(i / (colors.length - 1), color));

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      requestAnimationFrame(animate);
    };

    animate();
    const resize = () => (canvas.width = window.innerWidth, canvas.height = window.innerHeight);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Reset state when switching modes
  useEffect(() => {
    loginMethods.reset();
    signupMethods.reset();
    setVerificationError(false);
    // setSignupStep(0);
    setLoading(false);
  }, [mode]);

  const onSubmitLogin: SubmitHandler<LoginForm> = async (data) => {
    setLoading(true);
    try {
      let req;
      try {
        req = await axios.post('/api/auth/login', data)
      } catch (e: any) {
        setLoading(false);
        if (e.response.status === 404) {
          setErrLogin('username', { type: 'custom', message: e.response.data.error })
          return;
        }
        if (e.response.status === 401) {
          // Only set error on password
          setErrLogin('password', { type: 'custom', message: e.response.data.error })
          return;
        }
        setErrLogin('username', { type: 'custom', message: 'Something went wrong' })
        setErrLogin('password', { type: 'custom', message: 'Something went wrong' })
        return;
      }
      const { data: res } = req;
      setLogin({ ...res.user, workspaces: res.workspaces });
      Router.push("/");
    } catch (e: any) {
      const msg = e.response?.data?.error || "Something went wrong";
      const status = e.response?.status;

      if (status === 404 || status === 401) {
        setErrLogin("username", { type: "custom", message: msg });
        if (status === 401) setErrLogin("password", { type: "custom", message: msg });
      } else {
        setErrLogin("username", { type: "custom", message: msg });
        setErrLogin("password", { type: "custom", message: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmitSignup: SubmitHandler<SignupForm> = async ({ username, password, verifypassword }) => {
    if (password !== verifypassword) {
      setErrSignup("verifypassword", { type: "validate", message: "Passwords must match" });
      return;
    }
    setLoading(true);
    setVerificationError(false);
    try {
      // Start signup (get verification code)
      const { data } = await axios.post("/api/auth/signup/start", { username });
      setVerificationCode(data.code);
      setSignupStep(2);
    } catch (e: any) {
      setErrSignup("username", {
        type: "custom",
        message: e.response?.data?.error || "Unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  const onVerifyAgain = async () => {
    setLoading(true);
    setVerificationError(false);

    const { password } = getSignupValues();

    try {
      const { data } = await axios.post("/api/auth/signup/finish", { password, code: verificationCode });
      if (data.success) Router.push("/");
      else setVerificationError(true);
    } catch {
      setVerificationError(true);
    } finally {
      setLoading(false);
    }
  };

  const StepButtons = ({ backStep, forwardLabel, onForward }: { backStep?: () => void, forwardLabel: string, onForward: () => void }) => (
    <div className="flex gap-4">
      {backStep && (
        <Button onPress={backStep} type="button" classoverride="flex-1" loading={loading} disabled={loading}>
          Back
        </Button>
      )}
      <Button onPress={onForward} classoverride="flex-1" loading={loading} disabled={loading}>
        {forwardLabel}
      </Button>
    </div>
  );

  // Theme switcher logic
  const { theme, setTheme } = useTheme();

  return (
    <>
      <div className="flex items-center justify-center h-screen px-4 overflow-hidden bg-infobg-light dark:bg-infobg-dark">
        <div className="bg-white dark:bg-gray-700 dark:bg-opacity-50 dark:backdrop-blur-lg max-w-md w-full rounded-3xl p-8 shadow-lg relative">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>

          <div className="mb-6 flex justify-center space-x-8">
            {["login", "signup"].map(m => {
              const isActive = mode === m;
              const activeClass =
                theme === "dark"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "border-b-2 border-pink-500 text-pink-500";
              return (
                <button
                  key={m}
                  onClick={() => setMode(m as any)}
                  className={`pb-2 font-semibold text-lg ${isActive ? activeClass : "text-gray-500"}`}
                  type="button"
                  disabled={loading}
                >
                  {m === "login" ? "Login" : "Sign Up"}
                </button>
              );
            })}
          </div>

          {mode === "login" && (
            <>
              <p className="font-bold text-3xl text-gray-700 dark:text-white mb-2">👋 Welcome to Orbit</p>
              <p className="text-md text-gray-600 dark:text-gray-300 mb-6">Login to your Orbit account to continue</p>

              <FormProvider {...loginMethods}>
                <form onSubmit={submitLogin(onSubmitLogin)} className="space-y-5 mb-6" noValidate>
                  <Input label="Username" placeholder="Username" id="username" {...regLogin("username", { required: "This field is required" })} />
                  <Input
                    label="Password"
                    placeholder="Password"
                    type={showPassword ? "text" : "password"}
                    id="password"
                    {...regLogin("password", { required: "This field is required" })}
                  />
                  <div className="flex items-center mb-2">
                    <input
                      id="show-password"
                      type="checkbox"
                      checked={showPassword}
                      onChange={() => setShowPassword(v => !v)}
                      className="mr-2 rounded-md border-gray-300 focus:ring-primary focus:border-primary transition"
                    />
                    <label htmlFor="show-password" className="text-sm text-gray-600 dark:text-gray-300 select-none">
                      Show password
                    </label>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                      Forgot password?
                    </Link>
                    <Button
                      type="submit"
                      classoverride="px-6 py-2 text-sm rounded-lg"
                      loading={loading}
                      disabled={loading}
                    >
                      Login
                    </Button>
                  </div>
                </form>
              </FormProvider>
            </>
          )}

          {mode === "signup" && (
            <>
              {signupStep === 0 && (
                <>
                  <p className="font-bold text-3xl text-gray-700 dark:text-white mb-2">🔨 Create an account</p>
                  <p className="text-md text-gray-600 dark:text-gray-300 mb-6">Create a new account for Orbit</p>

                  <FormProvider {...signupMethods}>
                    <form onSubmit={e => { e.preventDefault(); setSignupStep(1); }} className="space-y-5 mb-6" noValidate>
                      <Input
                        label="Username"
                        placeholder="Username"
                        id="signup-username"
                        {...regSignup("username", { required: "This field is required" })}
                      />
                      <div className="flex justify-end">
                        <Button type="submit" loading={loading} disabled={loading}>Continue</Button>
                      </div>
                    </form>
                  </FormProvider>
                </>
              )}

              {signupStep === 1 && (
                <>
                  <p className="font-bold text-3xl text-gray-700 dark:text-white mb-2">🔒 Set a password</p>
                  <p className="text-md text-gray-600 dark:text-gray-300 mb-6">Choose a password for your new account</p>

                  <FormProvider {...signupMethods}>
                    <form onSubmit={submitSignup(onSubmitSignup)} className="space-y-5 mb-6" noValidate>
                      <Input
                        label="Password"
                        placeholder="Password"
                        type="password"
                        id="signup-password"
                        {...regSignup("password", {
                          required: "Password is required",
                          minLength: {
                            value: 7,
                            message: "Password must be at least 7 characters",
                          },
                          pattern: {
                            value: /^(?=.*[0-9!@#$%^&*])/,
                            message: "Password must contain at least one number or special character",
                          },
                        })}
                      />
                      <Input
                        label="Verify password"
                        placeholder="Verify Password"
                        type="password"
                        id="signup-verify-password"
                        {...regSignup("verifypassword", {
                          required: "Please verify your password",
                          validate: value => value === getSignupValues("password") || "Passwords must match",
                        })}
                      />
                      <div className="flex gap-2 justify-between">
                        <Button
                          type="button"
                          classoverride="flex-1 px-3 py-1 text-sm rounded-md"
                          onPress={() => setSignupStep(0)}
                          disabled={loading}
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          classoverride="flex-1 px-3 py-1 text-sm rounded-md"
                          loading={loading}
                          disabled={loading}
                        >
                          Continue
                        </Button>
                      </div>
                      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                        <strong>Don't share your password.</strong><br />
                        <span>Do not use the same password as your Roblox account.</span>
                      </div>
                    </form>
                  </FormProvider>
                </>
              )}

              {signupStep === 2 && (
                <>
                  <p className="font-bold text-3xl dark:text-white mb-2">Verify your account</p>
                  <p className="text-md text-gray-600 dark:text-gray-300 mb-6">Paste this code into your Roblox profile bio:</p>
                  <p className="text-center font-mono bg-gray-700 text-white py-3 rounded mb-4 select-all">{verificationCode}</p>
                  {verificationError && <p className="text-center text-red-500 mb-4 font-semibold">Verification not found. Please try again.</p>}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      classoverride="flex-1"
                      onPress={() => setSignupStep(1)}
                      disabled={loading}
                    >
                      Back
                    </Button>
                    <Button
                      classoverride="flex-1"
                      loading={loading}
                      disabled={loading}
                      onPress={onVerifyAgain}
                    >
                      Verify
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        {/* Copyright button fixed at bottom left */}
        <div className="fixed bottom-4 left-4 z-40">
          <button
            onClick={() => setShowCopyright(true)}
            className="text-left text-xs text-gray-500 hover:text-primary"
            type="button"
          >
            © Copyright Notices
          </button>
        </div>
      </div>

      {/* Copyright Notices Dialog */}
      <Dialog
        open={showCopyright}
        onClose={() => setShowCopyright(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white">
                Copyright Notices
              </Dialog.Title>
              <button
                onClick={() => setShowCopyright(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <IconX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Orbit features, enhancements, and modifications:
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Copyright © 2025 Planetary. All rights reserved.
                </p>
              </div>

<<<<<<< main
const Login: NextPage = ({ }) => {
	const methods = useForm<form>();
	const { register, handleSubmit, setError, formState: { errors } } = methods;

	const [oidcEligible, setOidcEligible] = useState(false);
	const [loading, setLoading] = useState(false);
	const [login, setLogin] = useRecoilState(loginState);

	useEffect(() => {
		async function getOidcEligible() {
			let oidcCheck = await axios.get('/api/auth/roblox/can-use-oidc');
			if (oidcCheck.data.success) {
				setOidcEligible(true);
			}
		}
		getOidcEligible();
	}, []);
	
	const onSubmit: SubmitHandler<form> = async (data) => {
		setLoading(true);
		let req;
		try {
			req = await axios.post('/api/auth/login', data)
		} catch (e: any) {
			setLoading(false);
			if (e.response.status === 404) {
				setError('username', { type: 'custom', message: e.response.data.error })
				return;
			}
			if (e.response.status === 401) {
				setError('username', { type: 'custom', message: e.response.data.error })
				setError('password', { type: 'custom', message: e.response.data.error })
				return;
			}
			setError('username', { type: 'custom', message: 'Something went wrong' })
			setError('password', { type: 'custom', message: 'Something went wrong' })
		} finally {
			if (!req) return;
			setLogin({
				...req?.data.user,
				workspaces: req?.data.workspaces,
			});
			Router.push('/')
			setLoading(false);
		}
	}
	return (
		<div className="flex bg-infobg-light dark:bg-infobg-dark h-screen bg-no-repeat bg-cover bg-center" >
			<div className=" bg-white dark:bg-gray-800 dark:bg-opacity-50 dark:backdrop-blur-lg w-11/12 sm:w-4/6 md:3/6 xl:w-5/12 mx-auto my-auto rounded-3xl p-6" 					>
				<div>
					<p className="font-bold text-2xl dark:text-white">👋 Welcome to Orbit</p>
					<p className="text-md text-gray-500 dark:text-gray-200">
						Login to your Orbit account to continue
					</p>
					{oidcEligible &&
				    	<Button onPress={() => Router.push("/api/auth/roblox/login")} classoverride="w-full">
							Sign in with Roblox
						</Button>
					}
					<FormProvider {...methods}>
						<form className="mt-2 mb-8" onSubmit={handleSubmit(onSubmit)}>
							<Input label="Username" placeholder="Username" id="username" {...register("username", { required: { value: true, message: "This field is required" } })} />
							<Input label="Password" placeholder="Password" type="password" id="password" {...register("password", { required: { value: true, message: "This field is required" } })} />
							<input type="submit" className="hidden" />
						</form>
					</FormProvider>

					<div className="flex">
						<Button
							onPress={() => Router.push("/signup")}
							classoverride="mr-auto ml-0"
							loading={loading}
						>
							Sign up
						</Button>

						<Button
							onPress={handleSubmit(onSubmit)}
							classoverride="ml-auto"
							loading={loading}
						>
							Continue
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
=======
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  Original Tovy features and code:
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Copyright © 2022 Tovy. All rights reserved.
                </p>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
>>>>>>> main
};

export default Login;