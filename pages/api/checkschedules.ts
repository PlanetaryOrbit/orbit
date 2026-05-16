// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/utils/database';
import { AuthenticatedRequest, withAuth } from '@/lib/withAuth';
type Data = {
	success: boolean
	error?: string
}

export default withAuth(handler);

export async function handler(
	req: AuthenticatedRequest,
	res: NextApiResponse<Data>
) {
	if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' })
	const key = req.headers['x-instance-key'];
	if (!key) return res.status(401).json({ success: false, error: 'No key provided' })
	const registryconfig = await prisma.instanceConfig.findFirst({
		where: {
			key: 'registry'
		}
	});
	if (!registryconfig?.value) return res.status(500).json({ success: false, error: 'No registry config found' })
	const regkey = JSON.parse(JSON.stringify(registryconfig.value)).key;
	if (key !== regkey) return res.status(401).json({ success: false, error: 'Invalid key' });
	//find all schedules that have past times today
	const schedules = await prisma.schedule.findMany({
		where: {
			Days: {
				has: new Date().getUTCDay()
			}, 
			Hour: {
				lte: new Date().getUTCHours()
			},
			Minute: {
				lte: new Date().getUTCMinutes()
			}
		}
	});

	for (const schedule of schedules) {
		const date = new Date();
		date.setUTCHours(schedule.Hour);
		date.setUTCMinutes(schedule.Minute);
		date.setUTCSeconds(0);
		date.setUTCMilliseconds(0);

		const session = await prisma.session.findFirst({
			where: {
				scheduleId: schedule.id,
				date: date,
				startedAt: null
			},
			include: {
				sessionType: true
			}
		});
		if (!session?.ownerId) continue;
		await prisma.session.update({
			where: {
				id: session.id
			},
			data: {
				startedAt: new Date()
			}
		});
	}
	

	res.status(200).json({ success: true })
}
