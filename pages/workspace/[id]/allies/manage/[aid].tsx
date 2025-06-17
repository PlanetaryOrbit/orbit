import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import axios from "axios";
import { useRouter } from "next/router";
import { getConfig } from "@/utils/configEngine";
import { useState, Fragment, useMemo, useRef, useEffect } from "react";
import randomText from "@/utils/randomText";
import { useRecoilState } from "recoil";
import toast, { Toaster } from 'react-hot-toast';
import Button from "@/components/button";
import { InferGetServerSidePropsType } from "next";
import { withSessionSsr } from "@/lib/withSession";
import moment from "moment";
import { Dialog, Transition } from "@headlessui/react";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import Input from "@/components/input";
import prisma, { inactivityNotice } from "@/utils/database";
import { getUsername, getThumbnail } from "@/utils/userinfoEngine";
import Image from 'next/image'
import Checkbox from "@/components/checkbox";
import Tooltip from "@/components/tooltip";
import { IconUsers, IconPlus, IconTrash, IconPencil, IconCalendar, IconClipboardList, IconArrowLeft } from "@tabler/icons";


export const getServerSideProps = withPermissionCheckSsr(
	async ({ req, res, params }) => {
		let users = await prisma.user.findMany({
			where: {
				OR: [
					{
						roles: {
							some: {
								workspaceGroupId: parseInt(params?.id as string),
								permissions: {
									has: 'admin'
								}
							}
						}
					},
					{
						roles: {
							some: {
								workspaceGroupId: parseInt(params?.id as string),
								permissions: {
									has: 'represent_alliance'
								}
							}
						}
					},
					{
						roles: {
							some: {
								workspaceGroupId: parseInt(params?.id as string),
								permissions: {
									has: 'manage_alliances'
								}
							}
						}
					}
				]
			}
		});
		const infoUsers: any = await Promise.all(users.map(async (user: any) => {
			return {
				...user,
				userid: Number(user.userid),
				thumbnail: await getThumbnail(user.userid)
			}
		}))

		const ally: any = await prisma.ally.findUnique({
			where: {
				id: String(params?.aid)
			},
			include: {
				reps: true
			}
		})

		if(ally == null) {
			res.writeHead(302, {
				Location: `/workspace/${params?.id}/allies`
			})
			res.end()
			return
		}

		const infoReps = await Promise.all(ally.reps.map(async (rep: any) => {
			return {
				...rep,
				userid: Number(rep.userid),
				username: await getUsername(rep.userid),
				thumbnail: await getThumbnail(rep.userid)
			}
		}))

		let infoAlly = ally
		infoAlly.reps = infoReps
		// @ts-ignore
		const visits = await prisma.allyVisit.findMany({
			where: {
				// @ts-ignore
				allyId: params?.aid
			},
		})

		const infoVisits = await Promise.all(visits.map(async(visit: any) => {
			return {
				...visit,
				hostId: Number(visit.hostId),
				hostUsername: await getUsername(visit.hostId),
				hostThumbnail: await getThumbnail(visit.hostId),
				time: new Date(visit.time).toISOString()

			}
		}))

		return {
			props: {
				infoUsers,
				infoAlly,
				infoVisits
			}
		}
	})

type Notes = {
	[key: string]: string;
}

type Rep = {
	userid: number
}

type Visit = {
	name: string,
	time: Date
}

type EditVisit = {
	name: string;
	time: string;
}

type pageProps = InferGetServerSidePropsType<typeof getServerSideProps>
const ManageAlly: pageWithLayout<pageProps> = (props) => {
	const router = useRouter();
	const { id } = router.query;
	const [login, setLogin] = useRecoilState(loginState);
	const text = useMemo(() => randomText(login.displayname), []);
	const ally: any = props.infoAlly
	const users: any = props.infoUsers
	const visits: any = props.infoVisits

	const form = useForm();
	const { register, handleSubmit, setError, watch } = form;

	const [reps, setReps] = useState(ally.reps.map((u: any) => { return u.userid }))

	const handleCheckboxChange = (event: any) => {
		const { value } = event.target
		let numberVal = parseInt(value)
		if(reps.includes(numberVal)) {
			setReps(reps.filter((r: any) => r !== numberVal))
		} else {
			setReps([...reps, numberVal])
		}
	}

	const saveNotes = async () => {
		const axiosPromise = axios.patch(
			`/api/workspace/${id}/allies/${ally.id}/notes`,
			{ notes: notes }
		).then(req => {
		});
		toast.promise(
			axiosPromise,
			{
				loading: "Updating notes...",
				success: () => {
					return "Notes updated!";
				},
				error: "Notes were not saved due to an unknown error."
			}
		);
	}
	const [notes, setNotes] = useState(ally.notes || [""])
	const [editNotes, setEditNotes] = useState<any[]>([])

	const updateReps = async () => {
		const axiosPromise = axios.patch(
			`/api/workspace/${id}/allies/${ally.id}/reps`,
			{ reps: reps }
		).then(req => {
		});
		toast.promise(
			axiosPromise,
			{
				loading: "Updating reps...",
				success: () => {
					return "Reps updated!";
				},
				error: "Reps were not saved due to an unknown error."
			}
		);
	}

	const [isOpen, setIsOpen] = useState(false);
	const [isEditOpen, setEditOpen] = useState(false);

	const [editContent, setEditContent] = useState({ name: '', time: '', id: '' })

	const colors = [
		'bg-red-500',
		'bg-yellow-500',
		'bg-green-500',
		'bg-blue-500',
		'bg-indigo-500',
		'bg-purple-500',
		'bg-pink-500',
	]

	const getRandomColor = () => {
		return colors[Math.floor(Math.random() * colors.length)];
	}

	const handleVisitChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: 'name' | 'time') => {
		setEditContent({ ...editContent, [field]: e.target.value });
		return true;
	};

	const handleVisitBlur = async () => {
		return true;
	};

	const handleNoteChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number) => {
		const newValue = e.target.value;
		let updateNote = [...notes];
		updateNote[index] = newValue;
		setNotes(updateNote);
		return true;
	};

	const handleNoteBlur = async () => {
		return true;
	};

	const createNote = () => {
		setNotes([...notes, "This note is empty!"])
	}

	const deleteNote = (index: any) => {
		const noteClone = [...notes]
		noteClone.splice(index, 1)
		setNotes(noteClone)
	}

	const noteEdit = (index: any) => {
		if(editNotes.includes(index)) {
			const newEdits = editNotes.filter(n => n !== index)
			setEditNotes(newEdits)
		} else {
			setEditNotes([...editNotes, index])
		}
	}
	const visitform = useForm<Visit>()
	const notesform = useForm<Notes>({
		defaultValues: notes.reduce((acc: Notes, note: string, index: number) => {
			acc[`note-${index}`] = note;
			return acc;
		}, {} as Notes)
	});

	const createVisit: SubmitHandler<Visit> = async({ name, time }) => {
		const axiosPromise = axios.post(
			`/api/workspace/${id}/allies/${ally.id}/visits`,
			{ name: name, time: time }
		).then(req => {
		});
		toast.promise(
			axiosPromise,
			{
				loading: "Creating visit...",
				success: () => {
					router.reload()
					return "Visit created!";
				},
				error: "Visit was not created due to an unknown error."
			}
		);
	}

	const editVisit = async (visitId: any, visitName: any) => {
		setEditOpen(true)
		setEditContent({...editContent, name: visitName, id: visitId })
	}

	const updateVisit = async () => {
		const axiosPromise = axios.patch(
			`/api/workspace/${id}/allies/${ally.id}/visits/${editContent.id}`,
			{ name: editContent.name, time: editContent.time }
		).then(req => {
		});
		toast.promise(
			axiosPromise,
			{
				loading: "Updating visit...",
				success: () => {
					router.reload()
					return "Visit updated!";
				},
				error: "Visit was not updated due to an unknown error."
			}
		);
	}

	const deleteVisit = async (visitId: any) => {
		const axiosPromise = axios.delete(
			`/api/workspace/${id}/allies/${ally.id}/visits/${visitId}`
		).then(req => {
		});
		toast.promise(
			axiosPromise,
			{
				loading: "Deleting visit...",
				success: () => {
					router.reload()
					return "Visit deleted!";
				},
				error: "Visit was not deleted due to an unknown error."
			}
		);
	}

	const editform = useForm<EditVisit>({
		defaultValues: {
			name: editContent.name,
			time: editContent.time
		}
	});

	return <>
		<Toaster position="bottom-center" />

		{/* create visit modal */}
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
				</Transition.Child>

				<div className="fixed inset-0 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4 text-center">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
								<Dialog.Title as="h3" className="text-lg font-medium text-gray-900 mb-4 dark:text-white">
									Create New Visit
								</Dialog.Title>

								<div className="mt-2">
									<FormProvider {...visitform}>
										<form onSubmit={visitform.handleSubmit(createVisit)}>
											<div className="space-y-4">
												<Input 
													label="Visit Title" 
													{...visitform.register("name", { required: true })} 
												/>
												<Input 
													label="Visit Time" 
													type="datetime-local" 
													{...visitform.register("time", { required: true })} 
												/>
											</div>
											<input type="submit" className="hidden" />
										</form>
									</FormProvider>
								</div>

								<div className="mt-6 flex gap-3">
									<button
										type="button"
										className="flex-1 justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 transition-colors"
										onClick={() => setIsOpen(false)}
									>
										Cancel
									</button>
									<button
										type="button"
										className="flex-1 justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
										onClick={visitform.handleSubmit(createVisit)}
									>
										Create Visit
									</button>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>

		{/* edit visit modal */}
		<Transition appear show={isEditOpen} as={Fragment}>
			<Dialog as="div" className="relative z-10" onClose={() => setEditOpen(false)}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
				</Transition.Child>

				<div className="fixed inset-0 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4 text-center">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
								<Dialog.Title as="h3" className="text-lg font-medium text-gray-900 mb-4">
									Edit Visit
								</Dialog.Title>

								<div className="mt-2">
									<FormProvider {...editform}>
										<form>
											<div className="space-y-4">
												<Input 
													label="Visit Title" 
													{...editform.register("name")}
												/>
												<Input 
													label="Visit Time" 
													type="datetime-local" 
													{...editform.register("time")}
												/>
											</div>
											<input type="submit" className="hidden" />
										</form>
									</FormProvider>
								</div>

								<div className="mt-6 flex gap-3">
									<button
										type="button"
										className="flex-1 justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 transition-colors"
										onClick={() => setEditOpen(false)}
									>
										Cancel
									</button>
									<button
										type="button"
										className="flex-1 justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
										onClick={() => {updateVisit()}}
									>
										Update Visit
									</button>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>

		<div className="pagePadding">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center gap-3 mb-6">
					<button 
						onClick={() => router.push(`/workspace/${id}/allies`)}
						className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
					>
						<IconArrowLeft className="w-5 h-5" />
					</button>
					<h1 className="text-2xl font-medium text-gray-900 dark:text-white">Alliances</h1>
				</div>

				{/* Ally Header */}
				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
					<div className="p-6">
						<div className="flex items-center gap-4">
							<img src={ally.icon} className="w-16 h-16 rounded-full" />
							<div>
								<h2 className="text-xl font-medium text-gray-900 dark:text-white">{ally.name}</h2>
								<p className="text-sm text-gray-500 mt-1">Group ID: {ally.groupId}</p>
								<div className="flex flex-wrap gap-2 mt-2">
									{ally.reps.map((rep: any) => (
										<Tooltip key={rep.userid} orientation="top" tooltipText={rep.username}>
											<img 
												src={rep.thumbnail} 
												className="w-8 h-8 rounded-full bg-primary border-2 border-white hover:scale-110 transition-transform" 
												alt={rep.username}
											/>
										</Tooltip>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Notes Section */}
				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
					<div className="p-6">
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 p-2 rounded-lg">
									<IconClipboardList className="w-5 h-5 text-primary" />
								</div>
								<div>
									<h2 className="text-lg font-medium text-gray-900 dark:text-white">Notes</h2>
									<p className="text-sm text-gray-500 dark:text-gray-400">Keep track of important information about this ally</p>
								</div>
							</div>
							<button onClick={() => createNote()} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
								<IconPlus className="w-4 h-4" />
								<span className="text-sm font-medium">Add Note</span>
							</button>
						</div>

						{notes.length === 0 ? (
							<div className="text-center py-8">
								<div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 max-w-md mx-auto">
									<div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
										<IconClipboardList className="w-6 h-6 text-primary" />
									</div>
									<h3 className="text-sm font-medium text-gray-900 mb-1">No Notes</h3>
									<p className="text-sm text-gray-500 dark:text-gray-400">You haven't added any notes yet</p>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								{notes.map((note: any, index: any) => (
									<div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
										<div className="flex items-start justify-between mb-3">
											<p className={`text-sm text-gray-700 dark:text-white ${editNotes.includes(index) ? "hidden" : null}`}>
												{notes[index]}
											</p>
											<div className="flex items-center gap-2">
												<button
													onClick={() => noteEdit(index)}
													className="p-1 text-gray-400 hover:text-primary transition-colors"
												>
													<IconPencil className="w-4 h-4" />
												</button>
												<button
													onClick={() => deleteNote(index)}
													className="p-1 text-gray-400 hover:text-red-500 transition-colors"
												>
													<IconTrash className="w-4 h-4" />
												</button>
											</div>
										</div>
										<div className={editNotes.includes(index) ? "" : "hidden"}>
											<FormProvider {...notesform}>
												<Input 
													textarea 
													{...notesform.register(`note-${index}`)}
													value={notes[index]} 
												/>
											</FormProvider>
										</div>
									</div>
								))}
								<button
									onClick={() => saveNotes()}
									className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
								>
									Save Notes
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Representatives Section */}
				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
					<div className="p-6">
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 p-2 rounded-lg">
									<IconUsers className="w-5 h-5 text-primary" />
								</div>
								<div>
									<h2 className="text-lg font-medium text-gray-900 dark:text-white">Representatives</h2>
									<p className="text-sm text-gray-500 dark:text-gray-400">Manage who can represent this ally</p>
								</div>
							</div>
						</div>

						{users.length < 1 ? (
							<div className="text-center py-8">
								<div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 max-w-md mx-auto">
									<div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
										<IconUsers className="w-6 h-6 text-primary" />
									</div>
									<h3 className="text-sm font-medium text-gray-900 mb-1">No Representatives</h3>
									<p className="text-sm text-gray-500 dark:text-gray-400">Nobody has the represent alliance permissions</p>
								</div>
							</div>
						) : (
							<div className="space-y-4">
								<div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
									{users.map((user: any) => (
										<label
											key={user.userid}
											className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
										>
											<input
												type="checkbox"
												value={user.userid}
												onChange={handleCheckboxChange}
												checked={reps.includes(user.userid)}
												className="rounded border-gray-300 text-primary focus:ring-primary"
											/>
											<img 
												src={user.thumbnail} 
												className="w-8 h-8 rounded-full bg-primary" 
												alt={user.username}
											/>
											<span className="text-sm text-gray-900">{user.username}</span>
										</label>
									))}
								</div>
								<button
									onClick={() => updateReps()}
									className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
								>
									Save Representatives
								</button>
							</div>
						)}
					</div>
				</div>

				{/* Visits Section */}
				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
					<div className="p-6">
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 p-2 rounded-lg">
									<IconCalendar className="w-5 h-5 text-primary" />
								</div>
								<div>
									<h2 className="text-lg font-medium text-gray-900 dark:text-white">Visits</h2>
									<p className="text-sm text-gray-500 dark:text-gray-400">Schedule and manage alliance visits</p>
								</div>
							</div>
							<button
								onClick={() => setIsOpen(true)}
								className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
							>
								<IconPlus className="w-4 h-4" />
								<span className="text-sm font-medium">New Visit</span>
							</button>
						</div>

						{visits.length === 0 ? (
							<div className="text-center py-8">
								<div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 max-w-md mx-auto">
									<div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
										<IconCalendar className="w-6 h-6 text-primary" />
									</div>
									<h3 className="text-sm font-medium text-gray-900 mb-1 dark:text-white">No Visits</h3>
									<p className="text-sm text-gray-500 dark:text-gray-400">You haven't scheduled any visits yet</p>
								</div>
							</div>
						) : (
							<div className="grid gap-4 grid-cols-1 md:grid-cols-2">
								{visits.map((visit: any) => (
									<div key={visit.id} className="bg-gray-50 rounded-lg p-4">
										<div className="flex items-start justify-between mb-3">
											<div>
												<h3 className="text-sm font-medium text-gray-900">{visit.name}</h3>
												<div className="flex items-center gap-2 mt-2">
													<img 
														src={visit.hostThumbnail} 
														className="w-6 h-6 rounded-full bg-primary" 
														alt={visit.hostUsername}
													/>
													<p className="text-xs text-gray-500">
														Hosted by {visit.hostUsername}
													</p>
												</div>
												<p className="text-xs text-gray-500 mt-1">
													{new Date(visit.time).toLocaleDateString()} at {new Date(visit.time).getHours().toString().padStart(2, '0')}:{new Date(visit.time).getMinutes().toString().padStart(2, '0')}
												</p>
											</div>
											<div className="flex items-center gap-1">
												<button
													onClick={() => editVisit(visit.id, visit.name)}
													className="p-1 text-gray-400 hover:text-primary transition-colors"
												>
													<IconPencil className="w-4 h-4" />
												</button>
												<button
													onClick={() => deleteVisit(visit.id)}
													className="p-1 text-gray-400 hover:text-red-500 transition-colors"
												>
													<IconTrash className="w-4 h-4" />
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	</>;
}

ManageAlly.layout = workspace

export default ManageAlly
