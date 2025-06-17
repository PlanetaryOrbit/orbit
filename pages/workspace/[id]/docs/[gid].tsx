import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Workspace from "@/layouts/workspace";
import { useState, useMemo } from "react";
import prisma from "@/utils/database";
import { useRecoilState } from "recoil";
import axios from "axios";
import Button from "@/components/button";
import StarterKit from '@tiptap/starter-kit'
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { generateHTML } from '@tiptap/html'
import { IconArrowLeft, IconTrash, IconClock, IconUser, IconEdit } from "@tabler/icons";
import clsx from 'clsx';


type Props = {
	document: any;
}

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(async (context) => {
	const { gid } = context.query;
	if (!gid) return { notFound: true };
	const user = await prisma.user.findUnique({
		where: {
			userid: BigInt(context.req.session.userid)
		},
		include: {
			roles: {
				where: {
					workspaceGroupId: parseInt(context.query.id as string)
				}
			}
		}
	});
	const guide = await prisma.document.findUnique({
		where: {
			id: (gid as string),
		},
		include: {
			owner: {
				select: {
					username: true,
					picture: true,
				}
			},
			roles: true
		}
	}).catch(() => null);
	if (!guide) return { notFound: true };
	if (!guide.roles.find(role => role.id === user?.roles[0].id) && !user?.roles[0].isOwnerRole && !user?.roles[0].permissions.includes('manage_docs')) return { notFound: true };


	return {
		props: {
			document: JSON.parse(JSON.stringify(guide, (key, value) => (typeof value === 'bigint' ? value.toString() : value))),
		},
	}
})



const Settings: pageWithLayout<Props> = ({ document }) => {
	const [login, setLogin] = useRecoilState(loginState);
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const router = useRouter();
	const [wallMessage, setWallMessage] = useState("");
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const friendlyDate = `${new Date(document.createdAt).toLocaleDateString()} at ${new Date(document.createdAt).toLocaleTimeString()}`;

	const output = useMemo(() => {
		return generateHTML((document.content as Object), [
			StarterKit
		])
	}, [document.content]);

	const deleteDoc = async () => {
		await axios.post(`/api/workspace/${workspace.groupId}/guides/${document.id}/delete`, {}, {});
		router.push(`/workspace/${workspace.groupId}/docs`);
	}

	const goback = () => {
		window.history.back();
	}

	const confirmDelete = async () => {
		await deleteDoc();
		setShowDeleteModal(false);
	};

	return (
		<div className="pagePadding">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-6">
						<button
							onClick={goback}
							className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
						>
							<IconArrowLeft className="w-5 h-5 text-gray-500" />
						</button>
						<h1 className="text-4xl font-bold text-gray-900 dark:text-white">
							{document.name}
						</h1>
					</div>

					<div className="flex items-center gap-6 text-sm text-gray-500">
						<div className="flex items-center gap-2">
							<IconUser className="w-4 h-4" />
							<span>Created by {document.owner.username}</span>
						</div>
						<div className="flex items-center gap-2">
							<IconClock className="w-4 h-4" />
							<span>Last updated {friendlyDate}</span>
						</div>
					</div>
				</div>

				{/* Document Content */}
				<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
					<div 
						className="prose dark:prose-invert max-w-none"
						dangerouslySetInnerHTML={{ __html: output }} 
					/>
				</div>

				{/* Actions */}
				{workspace.yourPermission.includes('manage_docs') && (
					<div className="mt-6 flex items-center gap-4">
						<button
							onClick={() => router.push(`/workspace/${workspace.groupId}/docs/${document.id}/edit`)}
							className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
						>
							<IconEdit className="w-4 h-4" />
							Edit Document
						</button>
						<button
							onClick={() => setShowDeleteModal(true)}
							className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
						>
							<IconTrash className="w-4 h-4" />
							Delete Document
						</button>
					</div>
				)}
			</div>
			{showDeleteModal && (
			<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
				<div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
				<h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
					Confirm Deletion
				</h2>
				<p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
					Are you sure you want to delete this Document? This action cannot be undone.
				</p>
				<div className="flex justify-center gap-4">
					<button
					onClick={() => setShowDeleteModal(false)}
					className="px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white"
					>
					Cancel
					</button>
					<button
					onClick={confirmDelete}
					className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
					>
					Delete
					</button>
				</div>
				</div>
			</div>
			)}
		</div>
	);
};

Settings.layout = Workspace;

export default Settings;
