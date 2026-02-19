import { NextPage } from "next";
import React, { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import axios from "axios";
import Router from "next/router";
import Input from "@/components/input";
import Button from "@/components/button";
import { Dialog } from "@headlessui/react";
import { IconX } from "@tabler/icons-react";

type FormData = {
	username: string;
};

type ResetPasswordData = {
	password: string;
	verifypassword: string;
};

const AVATAR_BG_COLORS = [
	"#fce7f3", "#fbcfe8", "#f9a8d4", "#f472b6", "#ec4899",
	"#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1",
	"#d1fae5", "#a7f3d0", "#6ee7b7", "#34d399", "#10b981",
	"#cffafe", "#a5f3fc", "#67e8f9", "#22d3ee", "#06b6d4",
	"#fef3c7", "#fde68a", "#fcd34d", "#fbbf24", "#f59e0b",
];

function getAvatarBgColor(displayName: string): string {
	let n = 0;
	for (let i = 0; i < displayName.length; i++) n = (n * 31 + displayName.charCodeAt(i)) >>> 0;
	return AVATAR_BG_COLORS[n % AVATAR_BG_COLORS.length];
}

const ForgotPassword: NextPage = () => {
	const [selectedSlide, setSelectedSlide] = useState(0);
	const [code, setCode] = useState("");
	const [resetDisplayName, setResetDisplayName] = useState("");
	const [resetThumbnail, setResetThumbnail] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [showCopyright, setShowCopyright] = useState(false);

	const usernameForm = useForm<FormData>();
	const passwordForm = useForm<ResetPasswordData>();

	const startReset = async () => {
		setError(null);
		try {
			const response = await axios.post("/api/auth/reset/start", {
				username: usernameForm.getValues("username"),
			});
			setCode(response.data.code);
			setResetDisplayName(response.data.displayName || usernameForm.getValues("username"));
			setResetThumbnail(response.data.thumbnail || "");
			setSelectedSlide(1);
		} catch (e: any) {
			const msg = e?.response?.data?.error ?? "Something went wrong";
			usernameForm.setError("username", { type: "manual", message: msg });
		}
	};

	const finishReset = async () => {
		setError(null);
		try {
			await axios.post("/api/auth/reset/finish", {
				password: passwordForm.getValues("password"),
			});
			Router.push("/");
		} catch (e: any) {
			const msg = e?.response?.data?.error ?? "Verification failed";
			setError(msg);
		}
	};

	return (
		<>
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
							Account
						</span>
						<h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white">
							Reset your{" "}
							<span className="text-transparent bg-clip-text bg-gradient-to-r from-orbit to-pink-400">
								password
							</span>
						</h1>
						<p className="mt-4 text-lg text-zinc-400 leading-relaxed">
							We’ll verify your Roblox account and then let you set a new password.
						</p>
					</div>
				</div>

				<div className="relative z-10 flex flex-col justify-center items-center w-full md:w-[58%] lg:w-[62%] px-4 sm:px-6 py-12 md:py-16">
					<div className="w-full max-w-md">
						<div className="flex items-center gap-2 mb-6">
							<span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
								Step {selectedSlide + 1} of 4
							</span>
							<div className="flex-1 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
								<div
									className="h-full bg-orbit rounded-full transition-all duration-500 ease-out"
									style={{ width: `${((selectedSlide + 1) / 4) * 100}%` }}
								/>
							</div>
						</div>

						<div className="rounded-2xl bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl border border-zinc-200/60 dark:border-zinc-700/50 shadow-xl shadow-zinc-900/5 dark:shadow-black/20 p-8">
							{selectedSlide === 0 && (
								<>
									<h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
										Forgot your password?
									</h2>
									<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 mb-6">
										Enter your Roblox username to start the reset.
									</p>
									<FormProvider {...usernameForm}>
										<form className="space-y-4" onSubmit={usernameForm.handleSubmit(startReset)}>
											<Input
												placeholder="Username"
												label="Username"
												id="username"
												{...usernameForm.register("username", {
													required: "This field is required",
												})}
											/>
											<div className="flex justify-end pt-1">
												<Button
													type="submit"
													classoverride="px-6 py-2.5 text-sm font-medium rounded-xl shadow-sm"
												>
													Continue
												</Button>
											</div>
										</form>
									</FormProvider>
								</>
							)}

							{selectedSlide === 1 && (
								<>
									<div className="flex items-start gap-5 mb-8">
										<div
											className="flex shrink-0 items-center justify-center rounded-2xl p-2 ring-1 ring-zinc-200/80 dark:ring-zinc-600/60 w-[5.5rem] h-[5.5rem]"
											style={{ backgroundColor: getAvatarBgColor(resetDisplayName || "") }}
										>
											{resetThumbnail ? (
												<div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center bg-transparent shrink-0">
													<img
														src={resetThumbnail}
														alt=""
														className="max-w-full max-h-full w-full h-full rounded-xl object-contain object-bottom block"
													/>
												</div>
											) : (
												<div className="w-20 h-20 rounded-xl bg-zinc-200/80 dark:bg-zinc-600/80 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-2xl font-medium shrink-0">
													?
												</div>
											)}
										</div>
										<div className="min-w-0 flex-1 pt-0.5">
											<h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
												Are you really <span className="text-orbit">{resetDisplayName || "this user"}</span>?
											</h2>
											<p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
												Confirm this is your Roblox account. Next, we’ll ask you to add a verification code to your profile.
											</p>
										</div>
									</div>
									<div className="w-full">
										<Button
											type="button"
											classoverride="w-full px-6 py-2.5 text-sm font-medium rounded-xl shadow-sm hover:bg-orbit/90"
											onPress={() => setSelectedSlide(2)}
										>
											Yes, continue
										</Button>
									</div>
								</>
							)}

							{selectedSlide === 2 && (
								<>
									<h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
										Add the verification code to your profile
									</h2>
									<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 mb-6">
										Paste the code below into your Roblox profile blurb to prove ownership, then click Verify.
									</p>
									<p className="text-center font-mono text-sm bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-600 select-all mb-6">
										{code}
									</p>
									{error && (
										<p className="text-center text-red-500 text-sm mb-4">{error}</p>
									)}
									<div className="flex gap-3">
										<Button
											type="button"
											classoverride="flex-1 px-5 py-2.5 text-sm font-medium rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
											onPress={() => setSelectedSlide(1)}
										>
											Back
										</Button>
										<Button
											classoverride="flex-1 px-6 py-2.5 text-sm font-medium rounded-xl shadow-sm"
											onPress={async () => {
												setError(null);
												try {
													const response = await axios.post("/api/auth/reset/verify");
													if (response.data.success) {
														setSelectedSlide(3);
													}
												} catch (e: any) {
													const msg = e?.response?.data?.error || "Verification failed";
													setError(msg);
												}
											}}
										>
											Verify
										</Button>
									</div>
								</>
							)}

							{selectedSlide === 3 && (
								<>
									<h2 className="text-xl font-semibold text-zinc-900 dark:text-white tracking-tight">
										Set your new password
									</h2>
									<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 mb-6">
										Enter and confirm your new password.
									</p>
									{error && (
										<p className="text-center text-red-500 text-sm mb-4">{error}</p>
									)}
									<FormProvider {...passwordForm}>
										<form className="space-y-4" onSubmit={passwordForm.handleSubmit(finishReset)}>
											<Input
												type="password"
												{...passwordForm.register("password", { required: "You must enter a password" })}
												label="New password"
											/>
											<Input
												type="password"
												{...passwordForm.register("verifypassword", {
													required: "Please confirm your password",
													validate: (value) =>
														value === passwordForm.getValues("password") || "Passwords must match",
												})}
												label="Confirm password"
											/>
											<div className="flex gap-3 pt-1">
												<Button
													type="button"
													classoverride="flex-1 px-5 py-2.5 text-sm font-medium rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
													onPress={() => setSelectedSlide(2)}
												>
													Back
												</Button>
												<Button
													type="submit"
													classoverride="flex-1 px-6 py-2.5 text-sm font-medium rounded-xl shadow-sm"
												>
													Reset password
												</Button>
											</div>
											<p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 text-center">
												Don’t share your password. Don’t use the same password as your Roblox account.
											</p>
										</form>
									</FormProvider>
								</>
							)}
						</div>
					</div>
				</div>

				<div className="fixed bottom-4 left-4 z-40">
					<button
						onClick={() => setShowCopyright(true)}
						className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
						type="button"
					>
						© Copyright Notices
					</button>
				</div>
			</div>

			<Dialog
				open={showCopyright}
				onClose={() => setShowCopyright(false)}
				className="relative z-50"
			>
				<div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm" aria-hidden="true" />

				<div className="fixed inset-0 flex items-center justify-center p-4">
					<Dialog.Panel className="mx-auto max-w-sm rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/50 p-6 shadow-xl">
						<div className="flex items-center justify-between mb-4">
							<Dialog.Title className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
								Copyright notices
							</Dialog.Title>
							<button
								onClick={() => setShowCopyright(false)}
								className="p-2 rounded-xl text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
							>
								<IconX className="w-5 h-5" />
							</button>
						</div>

						<div className="space-y-4">
							<div>
								<h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
									Orbit features, enhancements, and modifications:
								</h3>
								<p className="text-sm text-zinc-500 dark:text-zinc-400">
									Copyright © 2026 Planetary. All rights reserved.
								</p>
							</div>

							<div>
								<h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
									Original Tovy features and code:
								</h3>
								<p className="text-sm text-zinc-500 dark:text-zinc-400">
									Copyright © 2022 Tovy. All rights reserved.
								</p>
							</div>
						</div>
					</Dialog.Panel>
				</div>
			</Dialog>
		</>
	);
};

export default ForgotPassword;