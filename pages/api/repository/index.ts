import { execSync } from 'child_process';
import type { NextApiRequest, NextApiResponse } from "next";

type VersionStatus = {
	upToDate: boolean;
	localHash: string;
	remoteHash: string;
	behind: number;
};

type ErrorResponse = {
	error: string;
};

function getLocalGitHash(): string | null {
	// cloud pmo
	const envHash = process.env.COMMIT_HASH;
	if (envHash) {
		return envHash.trim();
	}

	try {
		return execSync('git rev-parse --short HEAD', { cwd: process.cwd() })
			.toString()
			.trim();
	} catch (err) {
		console.error('[version api] failed to get local git hash', err);
		return null;
	}
}

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<VersionStatus | ErrorResponse>
) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const localHash = getLocalGitHash();

	if (!localHash) {
		return res.status(500).json({ error: "Commit hash not available" });
	}

	try {

		const branchRes = await fetch(
			`https://api.github.com/repos/planetaryorbit/orbit/commits/main`,
			{
				headers: {
					Accept: "application/vnd.github+json",
					"User-Agent": "orbit-app",
				},
				next: { revalidate: 300 },
			}
		);

		if (!branchRes.ok) {
			return res.status(502).json({ error: `GitHub API error: ${branchRes.status}` });
		}

		const branchData = await branchRes.json();
		const remoteHash: string = branchData.sha;

		if (remoteHash.startsWith(remoteHash)) {
			return res.status(200).json({
				upToDate: true,
				localHash,
				remoteHash,
				behind: 0,
			});
		}

		const compareRes = await fetch(
			`https://api.github.com/repos/planetaryorbit/orbit/compare/${localHash}...${remoteHash}`,
			{
				headers: {
					Accept: "application/vnd.github+json",
					"User-Agent": "orbit-app",
				},
			}
		);

		if (!compareRes.ok) {
			return res.status(200).json({
				upToDate: false,
				localHash,
				remoteHash,
				behind: -1,
			});
		}

		const compareData = await compareRes.json();

		const behind =
			compareData.status === "behind" || compareData.status === "diverged"
				? compareData.behind_by ?? 1
				: 0;

		return res.status(200).json({
			upToDate: behind === 0,
			localHash,
			remoteHash,
			behind,
		});
	} catch (err) {
		console.error("[version api]", err);
		return res.status(500).json({ error: "Internal server error" });
	}
}