import { useState, useEffect } from "react";
import { useRecoilState } from "recoil";
import { workspacestate } from "@/state";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { IconGift, IconCheck, IconShield, IconCloud } from "@tabler/icons-react";
import Button from "@/components/button";

function OpenCloud({ title = "Open Cloud" }: { title?: string }) {
	const [workspace, setWorkspace] = useRecoilState(workspacestate);
	const router = useRouter();
	const [enabled, setEnabled] = useState(false);
	const [ockey, setockey] = useState("");
	const [loading, setLoading] = useState(false);
	const [testing, setTesting] = useState(false);

	useEffect(() => {
		if (router.query.id) {
			axios
				.get(
					`/api/workspace/${router.query.id}/settings/general/roblox/key`
				)
				.then((res) => {
					if (res.data.value) {
						setEnabled(res.data.value.enabled || false);
						setockey(res.data.value.key || "");
					}
				})
				.catch((err) => {
					console.error("Error fetching OpenCloud Key webhook config:", err);
				});
		}
	}, [router.query.id]);

	const handleSave = async () => {
		setLoading(true);
		try {
			await axios.patch(
				`/api/workspace/${router.query.id}/settings/general/roblox/key`,
				{
					enabled,
					key: ockey,
				}
			);
			toast.success("Open Cloud API Key saved!");
		} catch (error) {
			console.error("Error saving Open Cloud API Key:", error);
			toast.error("Failed to save Open Cloud API KEY");
		} finally {
			setLoading(false);
		}
	};

	const handleTest = async () => {
		if (!ockey) {
			toast.error("Please enter a Open Cloud API KEY first");
			return;
		}

		setTesting(true);
		try {
			const response = await axios.post(
				`/api/workspace/${router.query.id}/settings/general/roblox/test`,
				{ key: ockey }
			);

			if (response.data.success) {
				toast.success("API Key is valid");
			} else {
				toast.success("API Key is invalid");
			}
		} catch (error: any) {
			const code = error?.response?.data?.code;
			const message = error?.response?.data?.message;

			const messages: Record<number, string> = {
				1: "API key is missing the 'group' scope",
				2: "API key needs both read and write permissions",
				3: "API key has expired",
				4: "API key is disabled",
				5: "Invalid API key",
				400: "API Key is not provided in a valid format."
			};

			toast.error(messages[code] || message || "Failed to test key");
		} finally {
			setTesting(false);
		}
	};

	return (
		<div className="space-y-8">
			<div className="flex items-start gap-4">
				<div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[color:rgb(var(--group-theme)/0.12)] text-[color:rgb(var(--group-theme))] shrink-0">
					<IconCloud className="w-6 h-6" stroke={1.5} />
				</div>
				<div>
					<div className="flex items-center">
						<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
							{title}
						</h3>
					</div>

					<p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
						Integrate your workspace with the newest ROBLOX Cloud API
					</p>
				</div>
			</div>

			<div className="space-y-5">
				<div className="flex items-center justify-between p-5 bg-zinc-50/80 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/80 dark:border-zinc-700/50">
					<div>
						<p className="font-medium text-zinc-900 dark:text-white">
							{title}
						</p>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
							Integrate your workspace with the newest ROBLOX Cloud API
						</p>
					</div>
					<button
						onClick={() => setEnabled(!enabled)}
						className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${enabled ? "bg-[color:rgb(var(--group-theme))]" : "bg-zinc-300 dark:bg-zinc-600"
							}`}
					>
						<span
							className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-6" : "translate-x-1"
								}`}
						/>
					</button>
				</div>

				{enabled && (
					<div className="space-y-5">
						<div>
							<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
								Open Cloud Key
							</label>
							<input
								type="text"
								value={ockey}
								onChange={(e) => setockey(e.target.value)}
								placeholder="Enter Open Cloud Key"
								className="w-full px-3 py-2.5 border rounded-xl text-sm bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white focus:ring-2 focus:ring-[color:rgb(var(--group-theme)/0.25)] focus:border-[color:rgb(var(--group-theme))] transition-colors"
							/>
						</div>
						<div className="flex gap-2">
							<button
								onClick={handleTest}
								disabled={testing || !ockey}
								className="px-4 py-2.5 text-sm font-medium rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{testing ? "Testing..." : "Test Key"}
							</button>
						</div>
					</div>
				)}
			</div>

			<div className="flex justify-end pt-6 border-t border-zinc-200/80 dark:border-zinc-700/80">
				<Button onClick={handleSave} disabled={loading} workspace>
					<span className="inline-flex items-center gap-2">
						<IconCheck className="w-4 h-4" stroke={1.5} />
						{loading ? "Saving..." : "Save Settings"}
					</span>
				</Button>
			</div>
		</div>
	);
}

OpenCloud.title = "Open Cloud Integration";

export default OpenCloud;