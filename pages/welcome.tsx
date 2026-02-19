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
	const methods = useForm<{groupid: string}>();
	const signupform = useForm<FormData>();
	const { register, handleSubmit, formState: { errors } } = methods;
	const [selectedSlide, setSelectedSlide] = useState(0);

	async function createAccount() {
		setIsLoading(true);
		let request: { data: { success: boolean; user: any } } | undefined;

		try {
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
		<div className="min-h-screen flex flex-col md:flex-row bg-zinc-950">
			<div
				className="fixed inset-0 bg-infobg-light dark:bg-infobg-dark bg-cover bg-center bg-no-repeat opacity-40"
				aria-hidden
			/>
			<div className="fixed inset-0 bg-gradient-to-br from-orbit/30 via-zinc-950/80 to-zinc-950" aria-hidden />

			<div className="relative z-10 flex flex-col justify-center px-8 md:px-12 lg:px-16 py-12 md:py-0 md:w-[42%] lg:w-[38%]">
				<div className="max-w-md">
					<span className="inline-flex items-center gap-2 text-zinc-400 text-sm font-medium tracking-wide uppercase mb-6">
						<span className="w-8 h-px bg-orbit rounded-full" />
						Setup
					</span>
					<h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
						Welcome to{" "}
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-orbit to-pink-400">
							Orbit
						</span>
					</h1>
					<p className="mt-4 text-lg text-zinc-400 leading-relaxed">
						Configure your workspace in a few steps. You’ll add your group and pick a theme.
					</p>
				</div>
			</div>

			<div className="relative z-10 flex flex-col justify-center items-center w-full md:w-[58%] lg:w-[62%] px-4 sm:px-6 py-12 md:py-16">
				<div className="w-full max-w-md">
					<div className="flex items-center gap-2 mb-6">
						<span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
							Step {selectedSlide + 1} of 2
						</span>
						<div className="flex-1 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
							<div
								className="h-full bg-orbit rounded-full transition-all duration-500 ease-out"
								style={{ width: `${((selectedSlide + 1) / 2) * 100}%` }}
							/>
						</div>
					</div>

					<Slider activeSlide={selectedSlide}>
						<div className="slide-content">
							<h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
								Let’s get started
							</h2>
							<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
								We need a few details to configure your Orbit instance.
							</p>
							<FormProvider {...methods}>
								<form className="mt-6" onSubmit={handleSubmit(nextSlide)}>
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

							<div className="mt-6">
								<label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
									Theme color
								</label>
								<div className="grid grid-cols-7 sm:grid-cols-10 gap-2 mt-2 mb-8">
									{colors.map((color, i) => (
										<button
											key={i}
											type="button"
											onClick={() => setSelectedColor(color)}
											className={`aspect-square rounded-xl transform transition-all duration-200 ${color} ${
												selectedColor === color
													? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-800 ring-orbit scale-105 shadow-lg"
													: "hover:scale-105 hover:shadow-md"
											}`}
										/>
									))}
								</div>
							</div>

							<div className="flex items-center gap-3">
								<button
									type="button"
									onClick={() => window.open("https://docs.planetaryapp.cloud/", "_blank", "noopener,noreferrer")}
									className="px-5 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-orbit border border-zinc-200 dark:border-zinc-600 rounded-xl hover:border-orbit/50 hover:bg-orbit/5 transition-colors"
								>
									Documentation
								</button>
								<button
									type="button"
									onClick={handleSubmit(nextSlide)}
									className="ml-auto px-6 py-2.5 text-sm font-medium text-white bg-orbit rounded-xl hover:bg-orbit/90 active:scale-[0.98] transition-all shadow-sm"
								>
									Continue
								</button>
							</div>
						</div>

						<div className="slide-content">
							<h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
								Create your account
							</h2>
							<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
								You need an Orbit account to manage your workspace.
							</p>
							<FormProvider {...signupform}>
								<form onSubmit={signupform.handleSubmit(createAccount)} className="mt-6">
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

							<div className="mt-8 flex items-center gap-3">
								<button
									type="button"
									onClick={() => setSelectedSlide(0)}
									className="px-5 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-600 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
								>
									Back
								</button>
								<button
									type="button"
									onClick={signupform.handleSubmit(createAccount)}
									disabled={isLoading}
									className={`ml-auto px-6 py-2.5 text-sm font-medium text-white rounded-xl shadow-sm transition-all ${
										isLoading
											? "opacity-60 cursor-not-allowed bg-orbit"
											: "bg-orbit hover:bg-orbit/90 active:scale-[0.98]"
									}`}
								>
									{isLoading ? "Creating…" : "Continue"}
								</button>
							</div>
						</div>
					</Slider>
				</div>
			</div>
		</div>
	);
};

export default Login;
