import type { NextPage } from "next";
import React, { useEffect, useState } from "react";
import { loginState } from "@/state";
import { useRecoilState } from "recoil";
import { useForm, FormProvider } from "react-hook-form";
import Router from "next/router";
import Slider from "@/components/slider";
import Input from "@/components/input";
import axios from "axios";
import { toast } from "react-hot-toast";

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
											className={`aspect-square rounded-lg transform transition-all ease-in-out ${color} ${
												selectedColor === color
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
										onClick={() => setSelectedSlide(0)}
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