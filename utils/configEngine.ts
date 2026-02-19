import prisma from './database';

const configCache = new Map<string, any>();

export async function getConfig(key: string, groupid: number) {
	if (configCache.has(`${groupid}_${key}`)) {
		return configCache.get(`${groupid}_${key}`);
	} else {
		const config = await prisma.config.findFirst({
			where: {
				workspaceGroupId: groupid,
				key: key,
			},
		});
		if (config) {
			configCache.set(`${groupid}_${key}`, config.value);
			return config.value;
		} else {
			return null;
		}
	}
}

export async function fetchworkspace(groupid: number) {
	const workspace = await prisma.workspace.findFirst({
		where: {
			groupId: groupid,
		},
	});
	return workspace;
}

export async function setConfig(key: string, value: any, groupid: number) {
	const config = await prisma.config.findFirst({
		where: {
			workspaceGroupId: groupid,
			key: key,
		},
	});
	if (config) {
		await prisma.config.update({
			where: {
				id: config.id,
			},
			data: {
				value: value,
			},
		});
	} else {
		await prisma.config.create({
			data: {
				key: key,
				value: value,
				workspaceGroupId: groupid,
			},
		});
	}
	configCache.set(`${groupid}_${key}`, value);
}

export async function refresh(key: string, groupid: number) {
	configCache.delete(`${groupid}_${key}`);
}

