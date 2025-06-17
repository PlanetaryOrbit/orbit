import React, { useState } from "react";
import { FC } from '@/types/settingsComponent'
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import { IconPencil, IconCheck, IconX, IconAlertTriangle, IconStar, IconShieldCheck, IconClipboardList } from "@tabler/icons";
import axios from "axios";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import moment from "moment";

interface Props {
	userBook: any[];
	onRefetch?: () => void;
}

const Book: FC<Props> = ({ userBook, onRefetch }) => {
	const router = useRouter();
	const { id } = router.query;
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const [text, setText] = useState("");
	const [type, setType] = useState("note");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const addNote = async () => {
		if (!text) {
			toast.error("Please enter a note");
			return;
		}

		setIsSubmitting(true);
		try {
			await axios.post(`/api/workspace/${id}/userbook/${router.query.uid}/new`, {
				notes: text,
				type: type
			});

			setText("");
			toast.success("Note added successfully");
			router.reload();
		} catch (error) {
			console.error("Error adding note:", error);
			toast.error("Failed to add note");
		} finally {
			setIsSubmitting(false);
		}
	};

	const getIcon = (type: string) => {
		switch (type) {
			case "note":
				return <IconPencil className="w-5 h-5 text-gray-500" />;
			case "warning":
				return <IconAlertTriangle className="w-5 h-5 text-yellow-500" />;
			case "promotion":
				return <IconStar className="w-5 h-5 text-primary" />;
			case "demotion":
				return <IconX className="w-5 h-5 text-red-500" />;
			case "suspension":
				return <IconX className="w-5 h-5 text-red-500" />;
			case "termination":
				return <IconX className="w-5 h-5 text-red-500" />;
			default:
				return <IconPencil className="w-5 h-5 text-gray-500" />;
		}
	};

	return (
		<div className="space-y-6">
			<div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden">
				<div className="p-6">
					<h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New Note</h2>
					<div className="space-y-4">
						<div className="bg-white dark:bg-gray-600 p-4 rounded-lg">
							<label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1 dark:text-white">
								Type
							</label>
							<select
								id="type"
								value={type}
								onChange={(e) => setType(e.target.value)}
								className="block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
								<option value="note">Note</option>
								<option value="warning">Warning</option>
								<option value="promotion">Promotion</option>
								<option value="promotion">Demotion</option>
								<option value="suspension">Suspension</option>
								<option value="termination">Termination</option>
							</select>
						</div>
						<div>
							<label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
								Note
							</label>
							<textarea
								id="note"
								rows={4}
								value={text}
								onChange={(e) => setText(e.target.value)}
								placeholder="Enter your note here..."
								className="block w-full rounded-lg border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
							/>
						</div>
						<button
							onClick={addNote}
							disabled={isSubmitting}
							className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isSubmitting ? (
								<>
									<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Adding...
								</>
							) : (
								"Add Note"
							)}
						</button>
					</div>
				</div>
			</div>

			<div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden">
				<div className="p-6">
					<h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">History</h2>
					{userBook.length === 0 ? (
						<div className="text-center py-12">
							<div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-8 max-w-md mx-auto">
								<div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
									<IconClipboardList className="w-8 h-8 text-primary" />
								</div>
								<h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Notes</h3>
								<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">No notes have been added to this user's book yet</p>
							</div>
						</div>
					) : (
						<div className="space-y-4">
							{userBook.map((entry: any) => (
								<div key={entry.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-500 rounded-lg">
									<div className="flex-shrink-0">
										{getIcon(entry.type)}
									</div>
									<div className="flex-grow">
										<div className="flex items-center justify-between mb-1">
											<p className="text-sm font-medium text-gray-900 dark:text-white">
												{entry.reason}
											</p>
											<time className="text-xs text-gray-500 dark:text-gray-400">
												{moment(entry.createdAt).format("DD MMM YYYY")}
											</time>
										</div>
										<p className="text-sm text-gray-600 dark:text-gray-300">Logged by {entry.admin?.username || "Unknown"}</p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default Book;
