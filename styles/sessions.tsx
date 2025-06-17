import type { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import Button from "@/components/button";
import Workspace from "@/layouts/workspace";
import { IconChevronRight } from "@tabler/icons";
import prisma, { Session } from "@/utils/database";
import { useRecoilState } from "recoil";
import randomText from "@/utils/randomText";
import { InferGetServerSidePropsType, GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState, useMemo } from "react";
import axios from "axios";


export const getServerSideProps: GetServerSideProps = async () => {
	const sessions = await prisma.session.findMany({
		where: {
			startedAt: {
				not: null
			},
			ended: null
		}
	});
	return {
		props: {
			sessions: (JSON.parse(JSON.stringify(sessions, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) as typeof sessions)
		},
	}
}

type pageProps = {
	sessions: Session[]
}
const Home: pageWithLayout<pageProps> = (props) => {
	const [login, setLogin] = useRecoilState(loginState);
	const [sessions, setSessions] = useState(props.sessions);
	const text = useMemo(() => randomText(login.displayname), []);

	const router = useRouter();

	const endSession = async (id: string) => {
		await axios.delete(`/api/workspace/${router.query.id}/sessions/manage/${id}/end`, {});
		setSessions(sessions.filter((session) => session.id !== id));
	}
		


	return <div className="px-28 py-20">
		<p className="text-4xl font-bold">{text}</p>
		<p className="text-3xl font-medium mt-5 mb-5">Ongoing sessions</p>
		{sessions.map(session => (
			<div className="" key={session.id}>
				<div className="bg-[url('https://tr.rbxcdn.com/4a3833e22d4523b58e173057a531a766/768/432/Image/Png')] w-full rounded-md overflow-clip">
					<div className="px-5 py-4 backdrop-blur flex">
						<div><p className="text-xl font-bold"> Session </p>
							<div className="flex mt-1">
								<img src={login.thumbnail} className="bg-primary rounded-full w-8 h-8 my-auto" />
								<p className="font-semibold pl-2 leading-5 my-auto"> Hosted by ItsWHOOOP <br /> <span className="text-red-500"> Slocked </span> </p>
							</div>
						</div>
						<Button classoverride="my-auto ml-auto" onClick={() => endSession(session.id)}> End </Button>
						<Button classoverride="my-auto ml-3 py-3 px-3"> <IconChevronRight size={22} /> </Button>
					</div>
				</div>
			</div>
		))}
		{!sessions.length && (
			<div className="w-full lg:4/6 xl:5/6 rounded-md h-96 bg-white outline-gray-300 outline outline-[1.4px] flex flex-col p-5">
				<img className="mx-auto my-auto h-72" src={'/conifer-charging-the-battery-with-a-windmill.png'} />
				<p className="text-center text-xl font-semibold">No sessions are ongoing</p>

			</div>
		)}
		<p className="text-3xl font-medium mt-10">Manage</p>
		<div className="grid grid-cols-2 gap-5 mt-5">
			<button onClick={() => router.push(`/workspace/${router.query.id}/sessions/schedule`)} className="cardBtn"> <p className="text-2xl font-semibold leading-5 mt-2 text-left"> View schedule <br /> <span className="text-gray-400 font-normal text-base" > View this workspaces session schedule </span> </p> </button>
			<button className="cardBtn"> <p className="text-2xl font-semibold leading-5 mt-2 text-left"> View past sessions <br /> <span className="text-gray-400 font-normal text-base" > View this workspaces past sessions </span> </p> </button>
		</div>
	</div>;
};

Home.layout = Workspace;

export default Home;
