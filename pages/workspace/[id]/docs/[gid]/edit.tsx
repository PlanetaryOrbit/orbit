import type { pageWithLayout } from "@/layoutTypes";
import { loginState, workspacestate } from "@/state";
import Button from "@/components/button";
import Input from "@/components/input";
import Workspace from "@/layouts/workspace";
import { useRecoilState } from "recoil";
import { useState, useEffect } from "react";
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { IconCheck, IconChevronDown, IconH1, IconH2, IconH3, IconH4, IconBold, IconItalic, IconListDetails, IconArrowLeft, IconLock, IconTrash } from "@tabler/icons";
import { useRouter } from "next/router";
import { withPermissionCheckSsr } from "@/utils/permissionsManager";
import axios from "axios";
import prisma from "@/utils/database";
import { useForm, FormProvider } from "react-hook-form";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import clsx from 'clsx';
import { Toaster } from 'react-hot-toast';

export const getServerSideProps: GetServerSideProps = withPermissionCheckSsr(async (context) => {
	const { id, gid } = context.query;
	if (!gid) return { notFound: true };

	const [roles, document] = await Promise.all([
		prisma.role.findMany({
			where: {
				workspaceGroupId: Number(id),
				isOwnerRole: false
			},
		}),
		prisma.document.findUnique({
			where: {
				id: gid as string,
			},
			include: {
				roles: true
			}
		})
	]);

	if (!document) return { notFound: true };

	return {
		props: {
			roles,
			document: JSON.parse(JSON.stringify(document, (key, value) => (typeof value === 'bigint' ? value.toString() : value)))
		},
	};
}, 'manage_docs');

const EditDoc: pageWithLayout<any> = ({ roles, document }) => {
	const [login, setLogin] = useRecoilState(loginState);
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const [selectedRoles, setSelectedRoles] = useState<string[]>(document.roles.map((role: any) => role.id));
	const router = useRouter();
	const form = useForm({
		defaultValues: {
			name: document.name
		}
	});

	const editor = useEditor({
		extensions: [
			StarterKit,
		],
		editorProps: {
			attributes: {
				class: 'prose dark:prose-invert max-w-none focus:outline-none',
			},
		},
		content: document.content,
	});

	const goback = () => {
		window.history.back();
	}

	const updateDoc = async () => {
		const session = await axios.post(`/api/workspace/${workspace.groupId}/guides/${document.id}/update`, {
			name: form.getValues().name,
			content: editor?.getJSON(),
			roles: selectedRoles
		}).catch(err => {
			form.setError("name", { type: "custom", message: err.response.data.error })
		});
		if (!session) return;
		form.clearErrors()
		router.push(`/workspace/${workspace.groupId}/docs/${document.id}`)
	}

	const toggleRole = async (role: string) => {
		setSelectedRoles(prevRoles => {
			if (prevRoles.includes(role)) {
				return prevRoles.filter(r => r !== role);
			} else {
				return [...prevRoles, role];
			}
		});
	}

	const buttons = {
		heading: [
			{
				icon: IconH1,
				function: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(),
				active: () => editor?.isActive('heading', { level: 1 }),
			},
			{
				icon: IconH2,
				function: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
				active: () => editor?.isActive('heading', { level: 2 }),
			},
			{
				icon: IconH3,
				function: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
				active: () => editor?.isActive('heading', { level: 3 }),
			},
			{
				icon: IconH4,
				function: () => editor?.chain().focus().toggleHeading({ level: 4 }).run(),
				active: () => editor?.isActive('heading', { level: 4 }),
			},
		],
		util: [
			{
				icon: IconBold,
				function: () => editor?.chain().focus().toggleBold().run(),
				active: () => editor?.isActive('bold'),
			},
			{
				icon: IconItalic,
				function: () => editor?.chain().focus().toggleItalic().run(),
				active: () => editor?.isActive('italic'),
			},
		],
		list: [
			{
				icon: IconListDetails,
				function: () => editor?.chain().focus().toggleBulletList().run(),
				active: () => editor?.isActive('bulletList'),
			},
		]
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<Toaster position="bottom-center" />
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{/* Header */}
				<div className="flex items-center gap-3 mb-6">
					<button
						onClick={() => router.back()}
						className="p-2 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
						aria-label="Go back"
					>
						<IconArrowLeft className="w-5 h-5" />
					</button>
					<div>
						<h1 className="text-xl font-medium text-gray-900 dark:text-white">Edit Document</h1>
						<p className="text-sm text-gray-500 dark:text-gray-300">Update your workspace documentation</p>
					</div>
				</div>
				<div className="dark:bg-gray-800 rounded-lg mb-6">
					<FormProvider {...form}>
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
							{/* Document Info */}
							<div className="lg:col-span-2">
								<div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4">
									<h2 className="text-base font-medium text-gray-900 dark:text-white mb-3">
										Document Information
									</h2>
									<Input
										{...form.register('name', {
											required: { value: true, message: "Document name is required" }
										})}
										label="Document Name"
									/>
								</div>
							</div>

							{/* Permissions */}
							<div className="lg:col-span-1">
								<div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4">
									<h2 className="text-base font-medium text-gray-900 dark:text-white mb-3">
										Permissions
									</h2>
									<div className="space-y-2">
										{roles.map((role: any) => (
											<label
												key={role.id}
												className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 cursor-pointer transition-colors"
											>
												<input
													type="checkbox"
													checked={selectedRoles.includes(role.id)}
													onChange={() => toggleRole(role.id)}
													className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
												/>
												<span className="text-sm text-gray-700 dark:text-white">
													{role.name}
												</span>
											</label>
										))}
									</div>
								</div>
							</div>
						</div>

						{/* Editor Toolbar */}
						<div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-3 mb-4">
							<div className="flex flex-wrap gap-1">
								{Object.values(buttons).map((group, index) => (
									<div key={index} className="flex gap-1">
										{group.map((button, buttonIndex) => (
											<button
												key={buttonIndex}
												onClick={button.function}
												className={clsx(
													'p-1.5 rounded-lg transition-colors',
													button.active()
														? 'bg-primary text-white'
														: 'text-gray-500 hover:bg-gray-100'
												)}
											>
												<button.icon className="w-4 h-4" />
											</button>
										))}
									</div>
								))}
							</div>
						</div>

						{/* Editor Content */}
						<div className="bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 mb-4">
							<EditorContent editor={editor} />
						</div>

						{/* Actions */}
						<div className="flex items-center gap-3">
							<button
								onClick={goback}
								className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:bg-gray-700 dark:hover:bg-gray-600 rounded-md transition-colors">
								Cancel
							</button>
							<button
								onClick={form.handleSubmit(updateDoc)}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-md hover:bg-primary/90 transition-colors">
								<IconCheck className="w-4 h-4" />
								Save Changes
							</button>
						</div>
					</FormProvider>
				</div>
			</div>
		</div>
	);
};

EditDoc.layout = Workspace;

export default EditDoc;
