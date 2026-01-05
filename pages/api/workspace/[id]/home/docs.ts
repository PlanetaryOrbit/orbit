// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchworkspace, getConfig, setConfig } from '@/utils/configEngine'
import prisma, { SessionType, Session, document } from '@/utils/database';
import { withSessionRoute } from '@/lib/withSession'
import { withPermissionCheck } from '@/utils/permissionsManager'

import { getUsername, getThumbnail, getDisplayName } from '@/utils/userinfoEngine'
import * as noblox from 'noblox.js'
type Data = {
	success: boolean
	error?: string
	docs?: document[]
}

export default withPermissionCheck(handler);

export async function handler(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
	const id = parseInt(req.query.id as string);
	const user = await prisma.user.findFirst({
		where: {
			userid: req.session.userid
		},
		include: {
			roles: {
				where: {
					workspaceGroupId: id
				}
			},
			workspaceMemberships: {
				where: {
					workspaceGroupId: id
				}
			}
		}
	});
	if (!user?.roles?.length) return res.status(403).json({ success: false, error: 'You do not have permission to view this workspace.' });
	
	const membership = user.workspaceMemberships[0];
	const isAdmin = membership?.isAdmin || false;
	
	if (user.roles[0].permissions.includes('create_docs') || 
	    user.roles[0].permissions.includes('edit_docs') || 
	    user.roles[0].permissions.includes('delete_docs') || 
	    isAdmin) {
		const docs = await prisma.document.findMany({
			where: {
				workspaceGroupId: id,
				isTrainingDocument: true
			},
			include: {
				owner: {
					select: { 
						username: true,
						picture: true
					}
				}
			}
		});
		res.status(200).json({ success: true, docs: JSON.parse(JSON.stringify(docs, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) })
		return
	}
	const docs = await prisma.document.findMany({
		where: {
			workspaceGroupId: id,
			isTrainingDocument: true,
			roles: {
				some: {
					id: user.roles[0].id
				}
			}
		},
		include: {
			owner: {
				select: {
					username: true,
					picture: true,
				}
			}
		}
	})
	
	res.status(200).json({ success: true, docs: JSON.parse(JSON.stringify(docs, (key, value) => (typeof value === 'bigint' ? value.toString() : value))) })
}
