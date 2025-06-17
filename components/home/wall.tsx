import axios from "axios";
import React, { useState } from "react";
import type toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import moment from "moment";
import Button from "@/components/button";
import type { wallPost, user } from "@/utils/database";
import { useRouter } from "next/router";
import { IconChevronRight, IconMessage } from '@tabler/icons'
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

const Wall: React.FC = () => {
	const [posts, setPosts] = useState<(wallPost & {
		author: user
	})[]>([]);
	const router = useRouter();
	React.useEffect(() => {
		axios.get(`/api/workspace/${router.query.id}/home/wall`).then(res => {
			if (res.status === 200) {
				setPosts(res.data.posts)
			}
		})
	}, []);

	const goToWall = () => {
		router.push(`/workspace/${router.query.id}/wall`)
	}

	return (
		<div className="flex flex-col gap-4">
			{posts.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
						<IconMessage className="w-8 h-8 text-primary" />
					</div>
					<p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No posts yet</p>
					<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Be the first to share something with your workspace</p>
					<button
						onClick={goToWall}
						className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
					>
						View Wall
						<IconChevronRight className="w-4 h-4" />
					</button>
				</div>
			) : (
				<div className="flex flex-col gap-4">
					{posts.slice(0, 2).map((post) => (
						<div 
							key={post.id} 
							className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
						>
							<div className="flex items-start gap-3">
								<img 
									alt={`${post.author.username}'s avatar`} 
									src={String(post.author.picture)} 
									className="rounded-lg h-10 w-10 bg-primary object-cover" 
								/>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<p className="font-medium text-gray-900 dark:text-white truncate">
											{post.author.username}
										</p>
										<span className="text-sm text-gray-500 dark:text-gray-400">
											{moment(post.createdAt).format("MMM D")}
										</span>
									</div>
									<div className="prose text-gray-800 dark:text-gray-200 dark:prose-invert max-w-none mt-1">
										<ReactMarkdown rehypePlugins={[rehypeSanitize]}>{post.content}</ReactMarkdown>
									</div>
									{post.image && (
										<div className="mt-3">
											<img 
												src={post.image} 
												alt="Post image" 
												className="rounded-lg max-h-48 w-full object-cover"
											/>
										</div>
									)}
								</div>
							</div>
						</div>
					))}
					<button
						onClick={goToWall}
						className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
					>
						View all posts
						<IconChevronRight className="w-4 h-4" />
					</button>
				</div>
			)}
		</div>
	)
};

export default Wall;
