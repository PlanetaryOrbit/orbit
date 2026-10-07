import cache from './cache';
import prisma from './database';

const cacheFreshFor = 60;
const cacheStaleFor = 600;

function cacheKey(groupid: number, key: string) {
  return `config:${groupid}:${key}`;
}

/** @returns {Promise<object>} */

export async function getConfig(key: string, groupid: number) {
  return cache.swr(
    cacheKey(groupid, key),
    async () => {
      const config = await prisma.config.findFirst({
        where: {
          workspaceGroupId: groupid,
          key,
        },
      });

      return config?.value ?? null;
    },
    {
      freshFor: cacheFreshFor,
      staleFor: cacheStaleFor,
    },
  );
}

export async function fetchworkspace(groupid: number) {
  return cache.swr(
    `workspace:${groupid}`,
    () =>
      prisma.workspace.findFirst({
        where: {
          groupId: groupid,
        },
      }),
    {
      freshFor: 30,
      staleFor: 300,
    },
  );
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
  await cache.set(cacheKey(groupid, key), value, cacheStaleFor);
}

export async function refresh(key: string, groupid: number) {
  await cache.del(cacheKey(groupid, key));
}
