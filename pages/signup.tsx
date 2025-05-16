import type { NextPage } from "next";
import React, { useState } from "react";
import { loginState } from "@/state";
import { useRecoilState } from "recoil";
import { useForm, FormProvider } from "react-hook-form";
import Button from "@/components/button";
import Router from "next/router";
import Slider from "@/components/slider";
import Input from "@/components/input";
import axios from "axios";

type FormData = {
	password: string;
	verifypassword: string;
};

const SignUp: NextPage = ({ }) => {
	const [selectedColor, setSelectedColor] = useState("bg-orbit");
	const [login, setLogin] = useRecoilState(loginState);
	const [code, setCode] = useState("");
	const [verificationError, setVerificationError] = useState(false);
	const methods = useForm<{ username: String }>();
	const signupform = useForm<FormData>();
	const { register, handleSubmit, watch, formState: { errors } } = methods;
	const [selectedSlide, setSelectedSlide] = useState(0);

	async function startSignup() {
		let request
		try {
			request = await axios.post('/api/auth/signup/start', {
				username: methods.getValues("username"),
			})
		}
		catch (e: any) {
			if (e?.response?.status === 404) {
				methods.setError("username", { type: "custom", message: e.response.data.error })
				return;
			}
		}
		finally {
			if (!request) return;
			setSelectedSlide(selectedSlide + 1);
			setCode(request.data.code)
		}
	}

	async function createAccount() {
		let request
		try {
			request = await axios.post('/api/auth/signup/finish', {
				password: signupform.getValues("password"),
			})
		}
		catch (e: any) {
			if (e?.response?.status === 400) {
				setVerificationError(true)
				return;
			}
			if (e?.response?.status === 404) {
				signupform.setError("password", { type: "custom", message: e.response.data.error })
				return;
			}
		}
		finally {
			Router.push('/');
			setTimeout(() => {
				Router.reload();
			}, 1000)
			
		}
	}

	const nextSlide = () => {
		setSelectedSlide(selectedSlide + 1);
	};

	return (
		<div className="flex bg-infobg-light dark:bg-infobg-dark h-screen bg-no-repeat bg-cover bg-center">
			<Slider activeSlide={selectedSlide}>
				<div>
					<p className="font-bold text-2xl dark:text-white">Create an account</p>
					<p className="text-md text-gray-500 dark:text-gray-200">
						Create a new account for this group's Orbit
					</p>
					<FormProvider {...methods}>
						<form className="mb-8 mt-2" onSubmit={handleSubmit(nextSlide)}>
							<Input
								placeholder="Username"
								label="Username"
								id="username"
								{...register("username", { required: { value: true, message: "This field is required" } })}
							/>
						</form>
					</FormProvider>
					<div className="flex">
						<Button onPress={handleSubmit(nextSlide)}>
							Continue
						</Button>
					</div>
				</div>
				<div>
					<p className="font-bold text-2xl dark:text-white" id="2">
						Make your Orbit account
					</p>
					<p className="text-md text-gray-500 dark:text-gray-200">
						You need to create a Orbit account to continue
					</p>
					<FormProvider {...signupform}>
						<form className="mb-8 mt-2" onSubmit={handleSubmit(createAccount)}>
							<Input type="password" {...signupform.register("password", { required: { value: true, message: "You must enter a password, silly" } })} label="Password" />
							<Input type="password" {...signupform.register("verifypassword", { required: { value: true, message: "This field is required" }, validate: { checkpassword: (d) => d === signupform.getValues('password') || 'Passwords must match' } })} label="Verify password" />
						</form>
					</FormProvider>

					<div className="mt-7 flex">
						<Button
							onPress={() => setSelectedSlide(0)}
							classoverride="ml-0 mr-auto"
						>
							Back
						</Button>
						<Button
							onPress={signupform.handleSubmit(startSignup)}
						>
							Continue
						</Button>
					</div>
				</div>
				<div>
					<p className="font-bold text-2xl dark:text-white" id="2">
						Verify your Roblox account
					</p>
					<p className="text-md text-gray-500 dark:text-gray-200">
						You need to verify your Roblox account to continue
					</p>

					<p className="text-lg text-gray-500 dark:text-gray-200 text-center mt-2 leading-10">
						Paste the below code into your Roblox profile
						<br />
						<code className="bg-gray-600 p-2 rounded-lg">{code}</code>
					</p>

					{!!verificationError && <p className=" text-center mt-4"><span className="bg-red-600 p-2 mt-2 rounded-lg"> Verification not found</span></p>}



					<div className="mt-7 flex">
						<button
							onClick={() => setSelectedSlide(0)}
							className="bg-orbit ml-auto py-3 text-sm rounded-xl px-6 text-white font-bold hover:bg-orbit/80 transition"
						>
							Back
						</button>
						<button
							onClick={signupform.handleSubmit(createAccount)}
							className="ml-4 bg-orbit py-3 text-sm rounded-xl px-6 text-white font-bold hover:bg-orbit/80 transition"
						>
							Verify
						</button>
					</div>
				</div>
			</Slider>
		</div>
	);
};

export default SignUp;
