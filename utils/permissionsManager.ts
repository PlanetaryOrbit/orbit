import prisma from "./database";
import type { NextApiRequest, NextApiResponse, NextApiHandler, GetServerSidePropsContext } from 'next'
import { withSessionRoute, withSessionSsr } from '@/lib/withSession'
import * as noblox from 'noblox.js'
import { getConfig } from "./configEngine";
import { getThumbnail } from "./userinfoEngine";

type MiddlewareData = {
	handler: NextApiHandler
	next: any
	permissions: string
}

export function withPermissionCheck(
	handler: NextApiHandler,
	permission?: string
) {
	return withSessionRoute(async (req: NextApiRequest, res: NextApiResponse) => {
		const uid = req.session.userid;
		console.log('Session userid:', uid);
		if (!uid) return res.status(401).json({ success: false, error: 'Unauthorized' });
		if (!req.query.id) return res.status(400).json({ success: false, error: 'Missing required fields' });
		const workspaceId = parseInt(req.query.id as string);

		const user = await prisma.user.findFirst({
			where: {
				userid: BigInt(uid)
			},
			include: {
				roles: {
					where: {
						workspaceGroupId: workspaceId
					}
				}
			}
		});
		console.log('User data:', user);
		if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
		const userrole = user.roles[0];
		console.log('User role:', userrole);
		if (!userrole) return res.status(401).json({ success: false, error: 'Unauthorized' });
		if (userrole.isOwnerRole) return handler(req, res);
		if (!permission) return handler(req, res);
		if (userrole.permissions?.includes(permission)) return handler(req, res);
		return res.status(401).json({ success: false, error: 'Unauthorized' });
	})
}

export function withPermissionCheckSsr(
	handler: (context: GetServerSidePropsContext) => Promise<any>,
	permission?: string
) {
	return withSessionSsr(async (context) => {
		const { req, res, query } = context;
		const uid = req.session.userid;
		if (!uid) return {
			redirect: {
				destination: '/',
				permanent: false
			}
		}
		if (!query.id) return {
			redirect: {
				destination: '/',
				permanent: false
			}
		};
		const workspaceId = parseInt(query.id as string);

		const user = await prisma.user.findFirst({
			where: {
				userid: BigInt(uid)
			},
			include: {
				roles: {
					where: {
						workspaceGroupId: workspaceId
					}
				}
			}
		});
		if (!user) return {
			redirect: {
				destination: '/',
				permanent: false
			}
		}
		const userrole = user.roles[0];
		if (!userrole) return {
			redirect: {
				destination: '/',
				permanent: false
			}
		};
		if (userrole.isOwnerRole) return handler(context);
		if (!permission) return handler(context);
		if (userrole.permissions?.includes(permission)) return handler(context);
		return {
			redirect: {
				destination: '/',
				permanent: false
			}
		}
	})
}

export async function checkGroupRoles(groupID: number) {
	const rss = await noblox.getRoles(groupID).catch(() => null);
	if (!rss) return;
	const ranks: noblox.Role[] = [];

	const rs = await prisma.role.findMany({
		where: {
			workspaceGroupId: groupID
		}
	});
	const config = await getConfig('activity', groupID)
	const minTrackedRole = config?.role || 0;
	for (const role of rss) {
		if (role.rank < minTrackedRole) continue;
		ranks.push(role);
	}
	console.log(ranks)
	if (ranks && ranks.length) {
		for (const rank of ranks) {
			const role = rs.find(r => r.groupRoles?.includes(rank.id));
			const members = await noblox.getPlayers(groupID, rank.id).catch(e => {
				return null;
			});
			if (!members) continue;

			const users = await prisma.user.findMany({
				where: {},
				include: {
					roles: {
						where: {
							workspaceGroupId: groupID
						}
					},
					ranks: {
						where: {
							workspaceGroupId: groupID
						}
					}
				}
			});
			

			for (const user of users) {
				if (user.ranks?.find(r => r.workspaceGroupId === groupID)?.rankId === BigInt(rank.rank)) continue;
				if (members.find(member => member.userId === Number(user.userid))) {
					await prisma.rank.upsert({
						where: {
							userId_workspaceGroupId: {
								userId: user.userid,
								workspaceGroupId: groupID
							}
						},
						update: {
							rankId: BigInt(rank.rank)
						},
						create: {
							userId: user.userid,
							workspaceGroupId: groupID,
							rankId: BigInt(rank.rank)
						}
					});
				}
			}
			if (role) {
				for (const user of users) {
					if (!user.roles.find(r => r.id === role?.id)) continue;
					if (rs.find(r => r.groupRoles?.includes(rank.id))) continue;
					if (members.find(member => member.userId === Number(user.userid))) continue;
					await prisma.user.update({
						where: {
							userid: user.userid
						},
						data: {
							roles: {
								disconnect: {
									id: role?.id
								}
							},
						}
					});
					
				}

				for (const member of members) {
					if (users.find(user => Number(user.userid) === member.userId)?.roles.find(r => r.id === role?.id)) {
						await prisma.user.update({
							where: {
								userid: BigInt(member.userId)
							},
							data: {
								username: member.username
							}
						});
						continue;
					};
					const user = await prisma.user.findFirst({
						where: {
							userid: BigInt(member.userId),
							roles: {
								some: {
									workspaceGroupId: groupID
								}
							}
						}
					});
					if (user) continue;

					await prisma.user.upsert({
						where: {
							userid: member.userId
						},
						create: {
							userid: member.userId,
							roles: {
								connect: {
									id: role.id
								}
							},
							username: member.username,
							picture: await getThumbnail(member.userId)
						},
						update: {
							roles: {
								connect: {
									id: role.id
								}
							},
							username: member.username
						}
					});

					await prisma.rank.upsert({
						where: {
							userId_workspaceGroupId: {
								userId: BigInt(member.userId),
								workspaceGroupId: groupID
							}
						},
						update: {
							rankId: BigInt(rank.rank)
						},
						create: {
							userId: BigInt(member.userId),
							workspaceGroupId: groupID,
							rankId: BigInt(rank.rank)
						}
					});

				};
			}
		}
	}
}

export async function checkSpecificUser(userID: number) {
	const ws = await prisma.workspace.findMany({});
	for (const w of ws) {
		const rankId = await noblox.getRankInGroup(w.groupId, userID).catch(() => null);
		await prisma.rank.upsert({
			where: {
				userId_workspaceGroupId: {
					userId: BigInt(userID),
					workspaceGroupId: w.groupId
				}
			},
			update: {
				rankId: BigInt(rankId || 0)
			},
			create: {
				userId: BigInt(userID),
				workspaceGroupId: w.groupId,
				rankId: BigInt(rankId || 0)
			}
		});

		if (!rankId) continue;
		const rankInfo = await noblox.getRole(w.groupId, rankId).catch(() => null);
		if (!rankInfo) continue;
		const rank = rankInfo.id

		if (!rank) continue;
		const role = await prisma.role.findFirst({
			where: {
				workspaceGroupId: w.groupId,
				groupRoles: {
					hasSome: [rank]
				}
			}
		});
		if (!role) continue;
		const user = await prisma.user.findFirst({
			where: {
				userid: BigInt(userID),
				
			},
			include: {
				roles: {
					where: {
						workspaceGroupId: w.groupId
					}
				}
			}
		});
		if (!user) continue;
		if (user.roles.length) {
			await prisma.user.update({
				where: {
					userid: BigInt(userID)
				},
				data: {
					roles: {
						disconnect: {
							id: user.roles[0].id
						}
					}
				}
			});
		}
		await prisma.user.update({
			where: {
				userid: BigInt(userID)
			},
			data: {
				roles: {
					connect: {
						id: role.id
					}
				}
			}
		});
		return true;
	}
}