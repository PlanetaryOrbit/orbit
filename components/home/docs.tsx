import axios from "axios";
import React, { useState } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import Button from "@/components/button";
import type { document, user } from "@/utils/database";
import { useRouter } from "next/router";
import { IconChevronRight, IconFileText } from '@tabler/icons'

const Docs: React.FC = () => {
	const [docs, setDocs] = useState<(document & {
		owner: user
	})[]>([]);
	const router = useRouter();
	React.useEffect(() => {
		axios.get(`/api/workspace/${router.query.id}/home/docs`).then(res => {
			if (res.status === 200) {
				setDocs(res.data.docs)
			}
		})
	}, []);

	const goToDocs = () => {
		router.push(`/workspace/${router.query.id}/docs`)
	}

	return (
		<div className="flex flex-col gap-4">
			{docs.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
						<IconFileText className="w-8 h-8 text-primary" />
					</div>
					<p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No documents yet</p>
					<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Create your first document to get started</p>
					<button
						onClick={goToDocs}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
					>
						View Documents
						<IconChevronRight className="w-4 h-4" />
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					{docs.slice(0, 3).map((document) => (
						<div 
							key={document.id} 
							className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
							onClick={() => router.push(`/workspace/${router.query.id}/docs/${document.id}`)}
						>
							<div className="flex items-start gap-3">
								<div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
									<IconFileText className="w-5 h-5 text-primary" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-medium text-gray-900 dark:text-white truncate">
										{document.name}
									</p>
									<div className="mt-1 flex items-center gap-2">
										<img 
											src={document.owner?.picture!} 
											alt={`${document.owner?.username}'s avatar`}
											className="rounded-lg h-6 w-6 bg-primary object-cover" 
										/>
										<p className="text-sm text-gray-500 dark:text-gray-400">
											Created by {document.owner?.username}
										</p>
									</div>
								</div>
							</div>
						</div>
					))}
					<button
						onClick={goToDocs}
						className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
					>
						View all documents
						<IconChevronRight className="w-4 h-4" />
					</button>
				</div>
			)}
		</div>
	)
};

export default Docs;
