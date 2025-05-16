import workspace from "@/layouts/workspace";
import { pageWithLayout } from "@/layoutTypes";
import { loginState } from "@/state";
import { Fragment, useEffect, useState } from "react";
import { Dialog, Popover, Transition } from "@headlessui/react";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import { getThumbnail } from "@/utils/userinfoEngine";
import { useRecoilState } from "recoil";
import noblox from "noblox.js";
import Input from "@/components/input";
import { v4 as uuidv4 } from 'uuid';
import prisma from "@/utils/database"
import {
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	getPaginationRowModel,
	useReactTable,
} from '@tanstack/react-table'
import { FormProvider, useForm } from "react-hook-form";
import Button from "@/components/button";
import { inactivityNotice, Session, user, userBook, wallPost } from "@prisma/client";
import Checkbox from "@/components/checkbox";
import toast, { Toaster } from 'react-hot-toast';
import axios from "axios";
import { useRouter } from "next/router";
import moment from "moment";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { IconArrowLeft, IconFilter, IconPlus, IconSearch, IconUsers, IconX } from "@tabler/icons";

type User = {
	info: {
		userId: BigInt
		username: string | null
		picture: string | null
	}
	book: userBook[]
	wallPosts: wallPost[]
	inactivityNotices: inactivityNotice[]
	sessions: Session[]
	rankID: number
	minutes: number
	idleMinutes: number
	hostedSessions: any,
	messages: number
	registered: boolean;
}

export const getServerSideProps = withPermissionCheckSsr(async ({ params }: GetServerSidePropsContext) => {
	const allUsers = await prisma.user.findMany({
		where: {
			roles: {
				some: {
					workspaceGroupId: parseInt(params?.id as string)
				}
			}
		},
		include: {
			book: true,
			wallPosts: true,
			inactivityNotices: true,
			sessions: true,
			ranks: true
		}
	});
	const allActivity = await prisma.activitySession.findMany({
		where: {
			workspaceGroupId: parseInt(params?.id as string)
		},
		include: {
			user: {
				include: {
					writtenBooks: true,
					wallPosts: true,
					inactivityNotices: true,
					sessions: true,
					ranks: true
				}
		}
	}
	});

	const allHostedSessions = await prisma.session.findMany({
		where: {
			ended: {
				not: null
			}
		}
	});

	const computedUsers: any[] = []
	const ranks = await noblox.getRoles(parseInt(params?.id as string));

	for (const user of allUsers) {
		const ms: number[] = [];
		allActivity.filter(x => BigInt(x.userId) == user.userid && !x.active).forEach((session) => {
			ms.push(session.endTime?.getTime() as number - session.startTime.getTime());
		});

		const ims: number[] = [];
		allActivity.filter((x: any) => BigInt(x.userId) == user.userid).forEach((s: any) => {
			ims.push(Number(s.idleTime))
		})

		const sh: any[] = []
		allHostedSessions.filter((x: any) => BigInt(x.ownerId) == user.userid).forEach((s) => {
			sh.push(s)
		})

		const messages: number[] = []
		allActivity.filter((x: any) => BigInt(x.userId) == user.userid).forEach((s: any) => {
			messages.push(s.messages)
		})

		computedUsers.push({
			info: {
				userId: Number(user.userid),
				picture: user.picture || '',
				username: user.username,
			},
			book: user.book,
			wallPosts: user.wallPosts,
			inactivityNotices: user.inactivityNotices,
			sessions: user.sessions,
			rankID: user.ranks[0]?.rankId ? Number(user.ranks[0]?.rankId) : 0,
			minutes: ms.length ? Math.round(ms.reduce((p, c) => p + c) / 60000) : 0,
			idleMinutes: ims.length ? Math.round(ims.reduce((p, c) => p + c)) : 0,
			hostedSessions: sh,
			messages: messages.length ? Math.round(messages.reduce((p, c) => p + c)) : 0,
			registered: user.registered || false
		})
	}

	//find users who have an activity session not on computedUsers
	const usersNotInComputedUsers = allActivity.filter((x: any) => !computedUsers.find((y: any) => BigInt(y.info.userId) == BigInt(x.userId)))
	//map them to the computedUsers array
	usersNotInComputedUsers.forEach((x: any) => {
		if (computedUsers.find((y: any) => BigInt(y.info.userId) == BigInt(x.userId))) return;
		const ms: number[] = [];
		allActivity.filter((y: any) => BigInt(y.userId) == BigInt(x.userId) && !y.active).forEach((session) => {
			ms.push(session.endTime?.getTime() as number - session.startTime.getTime());
		});

		const messages: number[] = []
		allActivity.filter((y: any) => BigInt(y.userId) == BigInt(x.userId)).forEach((s: any) => {
			messages.push(s.messages)
		})


		computedUsers.push({
			info: {
				userId: Number(x.userId),
				picture: x.user.picture || null,
				username: x.user.username,
			},
			book: [],
			wallPosts: [],
			inactivityNotices: [],
			sessions: [],
			rankID: x.user.ranks[0]?.rankId ? Number(x.user.ranks[0]?.rankId) : 0,
			minutes: ms.length ? Math.round(ms.reduce((p, c) => p + c) / 60000) : 0,
			idleMinutes: 0,
			hostedSessions: [],
			messages: messages.length ? Math.round(messages.reduce((p, c) => p + c)) : 0,
			registered: x.user.registered || false
		})
	})

	return {
		props: {
			usersInGroup: (JSON.parse(JSON.stringify(computedUsers, (_key, value) => (typeof value === 'bigint' ? value.toString() : value))) as User[]),
			ranks: ranks
		}
	};
}, "view_members");

const filters: {
	[key: string]: string[]
} = {
	username: [
		'equal',
		'notEqual',
		'contains',
	],
	minutes: [
		'equal',
		'greaterThan',
		'lessThan',
	],
	idle: [
		'equal',
		'greaterThan',
		'lessThan'
	],
	rank: [
		'equal',
		'greaterThan',
		'lessThan',
	],
	sessions: [
		'equal',
		'greaterThan',
		'lessThan'
	],
	hosted: [
		'equal',
		'greaterThan',
		'lessThan'
	],
	warnings : [
		'equal',
		'greaterThan',
		'lessThan'
	],
	messages: [
		'equal',
		'greaterThan',
		'lessThan'
	],
	notices: [
		'equal',
		'greaterThan',
		'lessThan'
	],
	registered: [
		'equal'
	]
}

const filterNames: {
	[key: string]: string
} = {
	'equal': 'Equals',
	'notEqual': 'Does not equal',
	'contains': 'Contains',
	'greaterThan': 'Greater than',
	'lessThan': 'Less than'
}

type pageProps = {
	usersInGroup: User[];
	ranks: {
		id: number;
		rank: number;
		name: string;
	}[]

}
const Views: pageWithLayout<pageProps> = ({ usersInGroup, ranks }) => {
	const [login, setLogin] = useRecoilState(loginState);
	const router = useRouter();
	const [sorting, setSorting] = useState<SortingState>([])
	const [rowSelection, setRowSelection] = useState({});
	const [isOpen, setIsOpen] = useState(false);
	const [message, setMessage] = useState("");
	const [type, setType] = useState("");
	const [minutes, setMinutes] = useState(0);
	const [users, setUsers] = useState(usersInGroup);
	const [isLoading, setIsLoading] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState([]);
	const [colFilters, setColFilters] = useState<{
		id: string
		column: string
		filter: string
		value: string
	}[]>([]);

	const columnHelper = createColumnHelper<User>();

	const updateUsers = async (query: string) => {

	}

	const columns = [
		{
			id: "select",
			header: ({ table }: any) => (
				<Checkbox
					{...{
						checked: table.getIsAllRowsSelected(),
						indeterminate: table.getIsSomeRowsSelected(),
						onChange: table.getToggleAllRowsSelectedHandler(),
					}}
				/>
			),
			cell: ({ row }: any) => (
				<Checkbox
					{...{
						checked: row.getIsSelected(),
						indeterminate: row.getIsSomeSelected(),
						onChange: row.getToggleSelectedHandler(),
					}}
				/>
			)
		},
		columnHelper.accessor("info", {
			header: 'User',
			cell: (row) => {
				return (
					<div className="flex flex-row cursor-pointer" onClick={() => router.push(`/workspace/${router.query.id}/profile/${row.getValue().userId}`)}>
						<img src={row.getValue().picture!} className="w-10 h-10 rounded-full bg-primary " alt="profile image" />
						<p className="leading-5 my-auto px-2 font-semibold">
							{row.getValue().username} <br />
						</p>
					</div>
				);
			}
		}),
		columnHelper.accessor("sessions", {
			header: 'Sessions claimed',
			cell: (row) => {
				return (
					<p>{row.getValue().length}</p>
				);
			}
		}),
		columnHelper.accessor("hostedSessions", {
			header: 'Sessions hosted',
			cell: (row) => {
				return (
					<p>{row.getValue().length}</p>
				);
			}
		}),
		columnHelper.accessor("book", {
			header: 'Warnings',
			cell: (row) => {
				return (
					<p>{row.getValue().filter(x => x.type == "warning").length}</p>
				);
			}
		}),
		columnHelper.accessor("wallPosts", {
			header: 'Wall Posts',
			cell: (row) => {
				return (
					<p>{row.getValue().length}</p>
				);
			}
		}),
		columnHelper.accessor("rankID", {
			header: 'Rank',
			cell: (row) => {
				return (
					<p>{ranks.find(x => x.rank == row.getValue())?.name || "N/A"}</p>
				);
			}
		}),
		columnHelper.accessor("inactivityNotices", {
			header: 'Inactivity Notices',
			cell: (row) => {
				return (
					<p>{row.getValue().length}</p>
				);
			}
		}),
		columnHelper.accessor("minutes", {
			header: 'Minutes',
			cell: (row) => {
				return (
					<p>{row.getValue()}</p>
				);
			}
		}),
		columnHelper.accessor("idleMinutes", {
			header: 'Idle minutes',
			cell: (row) => {
				return (
					<p>{row.getValue()}</p>
				);
			}
		}),
		columnHelper.accessor("messages", {
			header: 'Messages',
			cell: (row) => {
				return (
					<p>{row.getValue()}</p>
				);
			}
		}),
		columnHelper.accessor("registered", {
			header: 'Registered',
			cell: (row) => {
				return (
					<p>{row.getValue() ? "✅" : "❌"}</p>
				);
			}
		}),
	];

	const [columnVisibility, setColumnVisibility] = useState({
		inactivityNotices: false,
		idleMinutes: false,
		registered: false
	});

	const table = useReactTable({
		columns,
		data: users,
		state: {
			sorting,
			rowSelection,
			// @ts-ignore
			columnVisibility,
		},
		// @ts-ignore
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	const newfilter = () => {
		setColFilters([...colFilters, { id: uuidv4(), column: 'username', filter: 'equal', value: '' }])
	};
	const removeFilter = (id: string) => {
		setColFilters(colFilters.filter((filter) => filter.id !== id));
	}
	const updateFilter = (id: string, column: string, filter: string, value: string) => {
		const OBJ = Object.assign(([] as typeof colFilters), colFilters);
		const index = OBJ.findIndex((filter) => filter.id === id);
		OBJ[index] = { id, column, filter, value };
		setColFilters(OBJ);
	};

	useEffect(() => {
		const filteredUsers = usersInGroup.filter((user) => {
			let valid = true;
			colFilters.forEach((filter) => {
				if (filter.column === 'username') {
					if (!filter.value) return;
					if (filter.filter === 'equal') {
						if (user.info.username !== filter.value) {
							valid = false;
						}
					} else if (filter.filter === 'notEqual') {
						if (user.info.username === filter.value) {
							valid = false;
						}
					} else if (filter.filter === 'contains') {
						if (!user.info.username?.includes(filter.value)) {
							valid = false;
						}
					}
				} else if (filter.column === 'minutes') {
					if (!filter.value) return;
					if (filter.filter === 'equal') {
						if (user.minutes !== parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'greaterThan') {
						if (user.minutes <= parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'lessThan') {
						if (user.minutes >= parseInt(filter.value)) {
							valid = false;
						}
					}
				} else if (filter.column === 'idle') {
					if (!filter.value) return;
					if (filter.filter === 'equal') {
						if (user.idleMinutes !== parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'greaterThan') {
						if (user.idleMinutes <= parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'lessThan') {
						if (user.idleMinutes >= parseInt(filter.value)) {
							valid = false;
						}
					}
				} else if (filter.column === 'rank') {
					if (!filter.value) return;
					if (filter.filter === 'equal') {
						if (user.rankID !== parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'greaterThan') {
						if (user.rankID <= parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'lessThan') {
						if (user.rankID >= parseInt(filter.value)) {
							valid = false;
						}
					}
				} else if (filter.column === 'hosted') {
					if (!filter.value) return;
					if (filter.filter === 'equal') {
						if (user.hostedSessions.length !== parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'greaterThan') {
						if (user.hostedSessions.length <= parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'lessThan') {
						if (user.hostedSessions.length >= parseInt(filter.value)) {
							valid = false;
						}
					}
				}  else if (filter.column === 'sessions') {
					if (!filter.value) return;
					if (filter.filter === 'equal') {
						if (user.sessions.length !== parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'greaterThan') {
						if (user.sessions.length <= parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'lessThan') {
						if (user.sessions.length >= parseInt(filter.value)) {
							valid = false;
						}
					}
				} else if (filter.column === 'warnings') {
					if (!filter.value) return;
					if (filter.filter === 'equal') {
						if (user.book.filter(x => x.type == "warning").length !== parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'greaterThan') {
						if (user.book.filter(x => x.type == "warning").length <= parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'lessThan') {
						if (user.book.filter(x => x.type == "warning").length >= parseInt(filter.value)) {
							valid = false;
						}
					}
				} else if (filter.column === 'messages') {
					if (!filter.value) return;
					if (filter.filter === 'equal') {
						if (user.messages !== parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'greaterThan') {
						if (user.messages <= parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'lessThan') {
						if (user.messages >= parseInt(filter.value)) {
							valid = false;
						}
					}
				} else if (filter.column === 'notices') {
					if (!filter.value) return;
					if (filter.filter === 'equal') {
						if (user.inactivityNotices.length !== parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'greaterThan') {
						if (user.inactivityNotices.length <= parseInt(filter.value)) {
							valid = false;
						}
					} else if (filter.filter === 'lessThan') {
						if (user.inactivityNotices.length >= parseInt(filter.value)) {
							valid = false;
						}
					}
				} else if (filter.column === 'registered') {
					if (!filter.value) return;
					if (filter.filter === 'equal') {
						if (user.registered.toString() !== filter.value.toLowerCase()) {
							valid = false;
						}
					}
				}
			});
			return valid;
		});
		setUsers(filteredUsers);
	}, [colFilters]);

	const massAction = () => {
		const selected = table.getSelectedRowModel().flatRows;
		const promises: any[] = [];
		for (const select of selected) {
			const data = select.original;

			if (type == "add") {
				promises.push(axios.post(
					`/api/workspace/${router.query.id}/activity/add`,
					{ userId: data.info.userId, minutes }
				));
			} else {
				promises.push(axios.post(
					`/api/workspace/${router.query.id}/userbook/${data.info.userId}/new`,
					{ notes: message, type }
				));
			}
		}

		toast.promise(
			Promise.all(promises),
			{
				loading: "Actions in progress...",
				success: () => {
					setIsOpen(false);
					return "Actions applied!"
				},
				error: "Could not perform actions."
			}
		);

		setIsOpen(false);
		setMessage("");
		setType("");
	}

	const updateSearchQuery = async (query: any) => {
		setSearchQuery(query)
		setSearchOpen(true)
		if(query == "") {
			 setSearchOpen(false) 
			 setColFilters([])
			 return
			} else { setSearchOpen(true) }
		const userRequest = await axios.get(`/api/workspace/${router.query.id}/staff/search/${query}`)
		const userList = userRequest.data.users
		setSearchResults(userList)
	}

	const updateSearchFilter = async (username: string) => {
		setSearchQuery(username)
		setSearchOpen(false)
		setColFilters([{ id: uuidv4(), column: 'username', filter: 'equal', value: username }])
	}

	const getSelectionName = (columnId: string) => {
		if (columnId == "sessions") { 
			return "Sessions claimed"
		} else if (columnId == "hostedSessions") {
			return 'Hosted sessions'
		} else if (columnId == "book") {
			return "Warnings"
		} else if (columnId == "wallPosts") {
			return "Wall Posts"
		} else if (columnId == "rankID") {
			return "Rank"
		} else if (columnId == "inactivityNotices") {
			return "Inactivity notices"
		} else if (columnId == "minutes") {
			return "Minutes"
		} else if (columnId == "idleMinutes") {
			return "Idle minutes"
		} else if (columnId == "messages") {
			return "Messages"
		} else if (columnId == "registered") {
			return "Registered"
		}
 	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<Toaster position="bottom-center" />
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{/* Header */}
				<div className="flex items-center gap-3 mb-6">
					<div>
						<h1 className="text-xl font-medium text-gray-900 dark:text-white">Staff Management</h1>
						<p className="text-sm text-gray-500">View and manage your staff members</p>
					</div>
				</div>

				{/* Actions Bar */}
				<div className="mb-4">
					<div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
						<div className="flex flex-wrap gap-2">
							<Popover className="relative">
								{({ open }) => (
									<>
										<Popover.Button
											className={`inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white dark:text-white dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
												open ? 'bg-gray-50 dark:bg-gray-800 ring-2 ring-primary' : ''
											}`}
										>
											<IconFilter className="w-4 h-4 mr-1.5" />
											Filters
										</Popover.Button>

										<Transition
											as={Fragment}
											enter="transition ease-out duration-200"
											enterFrom="opacity-0 translate-y-1"
											enterTo="opacity-100 translate-y-0"
											leave="transition ease-in duration-150"
											leaveFrom="opacity-100 translate-y-0"
											leaveTo="opacity-0 translate-y-1"
										>
											<Popover.Panel className="absolute left-0 z-10 mt-2 w-72 origin-top-left rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none p-3">
												<div className="space-y-3">
													<button
														onClick={newfilter}
														className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
													>
														<IconPlus className="w-4 h-4 mr-1.5" />
														Add Filter
													</button>

													{colFilters.map((filter) => (
														<div key={filter.id} className="p-2 border border-gray-200 rounded-lg dark:text-white">
															<Filter
																ranks={ranks}
																updateFilter={(col, op, value) => updateFilter(filter.id, col, op, value)}
																deleteFilter={() => removeFilter(filter.id)}
																data={filter}
															/>
														</div>
													))}
												</div>
											</Popover.Panel>
										</Transition>
									</>
								)}
							</Popover>

							<Popover className="relative">
								{({ open }) => (
									<>
										<Popover.Button
											className={`inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-white bg-white dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
												open ? 'bg-gray-50 dark:bg-gray-800 ring-2 ring-primary' : ''
											}`}
										>
											<IconUsers className="w-4 h-4 mr-1.5" />
											Columns
										</Popover.Button>

										<Transition
											as={Fragment}
											enter="transition ease-out duration-200"
											enterFrom="opacity-0 translate-y-1"
											enterTo="opacity-100 translate-y-0"
											leave="transition ease-in duration-150"
											leaveFrom="opacity-100 translate-y-0"
											leaveTo="opacity-0 translate-y-1"
										>
											<Popover.Panel className="absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-lg bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none p-3">
												<div className="space-y-2">
													{table.getAllLeafColumns().map((column: any) => {
														if (column.id !== "select" && column.id !== "info") {
															return (
																<label key={column.id} className="flex items-center space-x-2">
																	<Checkbox
																		checked={column.getIsVisible()}
																		onChange={column.getToggleVisibilityHandler()}
																	/>
																	<span className="text-sm text-gray-700 dark:text-gray-200">{getSelectionName(column.id)}</span>
																</label>
															)
														}
													})}
												</div>
											</Popover.Panel>
										</Transition>
									</>
								)}
							</Popover>
						</div>

						{/* Search */}
						<div className="relative w-full md:w-56">
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
									<IconSearch className="h-4 w-4 text-gray-400" />
								</div>
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => updateSearchQuery(e.target.value)}
									className="block w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
									placeholder="Search username..."
								/>
							</div>

							{searchOpen && (
								<div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg">
									<div className="py-1">
										{searchResults.length === 0 && (
											<div className="px-3 py-1.5 text-sm text-gray-500">
												No results found
											</div>
										)}
										{searchResults.map((u: any) => (
											<button
												key={u.username}
												onClick={() => updateSearchFilter(u.username)}
												className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center space-x-2"
											>
												<img
													src={u.thumbnail}
													alt={u.username}
													className="w-6 h-6 rounded-full bg-primary"
												/>
												<span className="text-sm font-medium text-gray-900 dark:text-white">{u.username}</span>
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					</div>

					{/* Mass Actions */}
					{table.getSelectedRowModel().flatRows.length > 0 && (
						<div className="mt-3 flex flex-wrap gap-2">
							<button
								onClick={() => { setType("promotion"); setIsOpen(true) }}
								className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
							>
								Mass promote {table.getSelectedRowModel().flatRows.length} users
							</button>
							<button
								onClick={() => { setType("warning"); setIsOpen(true) }}
								className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
							>
								Mass warn {table.getSelectedRowModel().flatRows.length} users
							</button>
							<button
								onClick={() => { setType("suspension"); setIsOpen(true) }}
								className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
							>
								Mass suspend {table.getSelectedRowModel().flatRows.length} users
							</button>
							<button
								onClick={() => { setType("fire"); setIsOpen(true) }}
								className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
							>
								Mass fire {table.getSelectedRowModel().flatRows.length} users
							</button>
							<button
								onClick={() => { setType("add"); setIsOpen(true) }}
								className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
							>
								Add minutes to {table.getSelectedRowModel().flatRows.length} users
							</button>
						</div>
					)}
				</div>

				{/* Table */}
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-gray-200">
							<thead className="bg-gray-50 dark:bg-gray-800">
								<tr>
									{table.getHeaderGroups().map((headerGroup) => (
										headerGroup.headers.map((header) => (
											<th
												key={header.id}
												scope="col"
												className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
												onClick={header.column.getToggleSortingHandler()}
											>
												{header.isPlaceholder ? null : (
													<div className="flex items-center space-x-1">
														<span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
													</div>
												)}
											</th>
										))
									))}
								</tr>
							</thead>
							<tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
								{table.getRowModel().rows.map((row) => (
									<tr
										key={row.id}
										className="hover:bg-gray-50 dark:bg-gray-800 transition-colors"
									>
										{row.getVisibleCells().map((cell) => (
											<td
												key={cell.id}
												className="px-4 py-2 whitespace-nowrap text-sm text-gray-500"
											>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					<div className="bg-white dark:bg-gray-800 px-3 py-2 flex items-center justify-between border-t border-gray-200 sm:px-4">
						<div className="flex-1 flex justify-center">
							<div className="flex gap-1">
								<button
									onClick={() => table.previousPage()}
									disabled={!table.getCanPreviousPage()}
									className="relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-800 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
								>
									Previous
								</button>
								<span className="relative inline-flex items-center px-3 py-1.5 border border-gray-300 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-white rounded-md">
									Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
								</span>
								<button
									onClick={() => table.nextPage()}
									disabled={!table.getCanNextPage()}
									className="relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-800 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed"
								>
									Next
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Mass Action Dialog */}
			<Transition appear show={isOpen} as={Fragment}>
				<Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
					<Transition.Child
						as={Fragment}
						enter="ease-out duration-300"
						enterFrom="opacity-0"
						enterTo="opacity-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100"
						leaveTo="opacity-0"
					>
						<div className="fixed inset-0 bg-black bg-opacity-25" />
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
								<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-5 text-left align-middle shadow-xl transition-all">
									<Dialog.Title as="div" className="flex items-center justify-between mb-3">
										<h3 className="text-lg font-medium text-gray-900 dark:text-white">
											Mass {type} {type === "add" ? "minutes" : ""}
										</h3>
										<button
											onClick={() => setIsOpen(false)}
											className="text-gray-400 hover:text-gray-500"
										>
											<IconX className="w-5 h-5" />
										</button>
									</Dialog.Title>

									<FormProvider {...useForm({
										defaultValues: {
											value: type === "add" ? minutes.toString() : message
										}
									})}>
										<div className="mt-3">
											<Input
												type={type === "add" ? "number" : "text"}
												placeholder={type === "add" ? "Minutes" : "Message"}
												value={type === "add" ? minutes.toString() : message}
												name="value"
												id="value"
												onBlur={async () => true}
												onChange={async (e) => {
													if (type === "add") {
														setMinutes(parseInt(e.target.value) || 0);
													} else {
														setMessage(e.target.value);
													}
													return true;
												}}
											/>
										</div>
									</FormProvider>

									<div className="mt-5 flex justify-end gap-2">
										<button
											type="button"
											className="inline-flex justify-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
											onClick={() => setIsOpen(false)}
										>
											Cancel
										</button>
										<button
											type="button"
											className="inline-flex justify-center px-3 py-1.5 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
											onClick={massAction}
										>
											Confirm
										</button>
									</div>
								</Dialog.Panel>
							</Transition.Child>
						</div>
					</div>
				</Dialog>
			</Transition>
		</div>
	);
};

const Filter: React.FC<{
	data: {
		column: string;
		filter: string;
		value: string;
	};
	updateFilter: (column: string, op: string, value: string) => void;
	deleteFilter: () => void;
	ranks: {
		id: number;
		name: string;
		rank: number;
	}[];
}> = ({ updateFilter, deleteFilter, data, ranks }) => {
	const methods = useForm<{
		col: string;
		op: string;
		value: string;
	}>({
		defaultValues: {
			col: data.column,
			op: data.filter,
			value: data.value
		}
	});

	const { register, handleSubmit, getValues } = methods;

	useEffect(() => {
		const subscription = methods.watch(() => {
			updateFilter(methods.getValues().col, methods.getValues().op, methods.getValues().value);
		});
		return () => subscription.unsubscribe();
	}, [methods.watch]);

	return (
		<FormProvider {...methods}>
			<div className="space-y-4">
				<button
					onClick={deleteFilter}
					className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
				>
					Delete Filter
				</button>

				<div className="space-y-2">
					<label className="block text-sm font-medium text-gray-700">
						Column
					</label>
					<select
						{...register('col')}
						className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
					>
						{Object.keys(filters).map((filter) => (
							<option value={filter} key={filter}>{filter}</option>
						))}
					</select>
				</div>

				<div className="space-y-2">
					<label className="block text-sm font-medium text-gray-700">
						Operation
					</label>
					<select
						{...register('op')}
						className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
					>
						{filters[methods.getValues().col].map((filter) => (
							<option value={filter} key={filter}>{filterNames[filter]}</option>
						))}
					</select>
				</div>

				{getValues('col') !== 'rank' && (
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700">
							Value
						</label>
						<Input {...register('value')} />
					</div>
				)}

				{getValues('col') === 'rank' && (
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700">
							Value
						</label>
						<select
							{...register('value')}
							className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
						>
							{ranks.map((rank) => (
								<option value={rank.rank} key={rank.id}>{rank.name}</option>
							))}
						</select>
					</div>
				)}

				{getValues('col') === 'registered' && (
					<div className="space-y-2">
						<label className="block text-sm font-medium text-gray-700">
							Value
						</label>
						<select
							{...register('value')}
							className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
						>
							<option value="true">✅</option>
							<option value="false">❌</option>
						</select>
					</div>
				)}
				
			</div>
		</FormProvider>
	);
};

Views.layout = workspace;
export default Views;
