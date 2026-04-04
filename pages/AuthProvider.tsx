"use client";

import { loginState, workspacestate } from '@/state';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';

const INTERCOM_APP_ID = process.env.NEXT_PUBLIC_INTERCOM_APP_ID;
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com';

export default function AuthProvider({
	loading,
	setLoading,
}: {
	loading: boolean;
	setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}) {
	const [login, setLogin] = useRecoilState(loginState);
	const [workspace] = useRecoilState(workspacestate);
	const Router = useRouter();
	const posthogRef = useRef<any>(null);

	useEffect(() => {
		const path = Router.pathname;
		const publicPath = path === '/login' || path === '/welcome' || path === '/forgot-password';
		if (publicPath) {
			setLoading(false);
			return;
		}

		const checkLogin = async () => {
			try {
				const req = await axios.get('/api/@me');
				setLogin({ ...req.data.user, workspaces: req.data.workspaces || [] });
				setLoading(false);
			} catch (err: any) {
				const error = err.response?.data?.error;
				if (error === 'Workspace not setup') {
					Router.push('/welcome');
					setLoading(false);
					return;
				}
				if (error === 'Not logged in') {
					Router.push('/login');
					setLoading(false);
					return;
				}
				console.error('Login check error:', err.response?.data ?? err);
				setLoading(false);
			}
		};

		checkLogin();
	}, [Router.pathname, setLoading, setLogin]);

	useEffect(() => {
		if (!POSTHOG_KEY) return;

		let mounted = true;

		return () => {
			mounted = false;
			try {
				posthogRef.current?.reset();
			} catch (e) {}
		};
	}, []);

	useEffect(() => {
		const isWelcomeOrLogin = Router.pathname === '/welcome' || Router.pathname === '/login';

		if (INTERCOM_APP_ID) {
			const injectIntercom = () => {
				if (document.getElementById('intercom-script')) return;
				const s = document.createElement('script');
				s.id = 'intercom-script';
				s.src = `https://widget.intercom.io/widget/${INTERCOM_APP_ID}`;
				s.async = true;
				document.head.appendChild(s);
			};

			(async () => {
				try {
					const cfgResp = await fetch('/api/intercom/config');
					const cfg = cfgResp.ok ? await cfgResp.json() : { configured: false };
					if (!cfg.configured) {
						console.warn('Intercom server-side JWT not configured; skipping Intercom load.');
						return;
					}

					if (isWelcomeOrLogin || !login) {
						const bootGuest = () => {
							try {
								(window as any).Intercom('boot', { app_id: INTERCOM_APP_ID });
							} catch (e) {}
						};

						injectIntercom();
						if ((window as any).Intercom) bootGuest();
						else if (document.getElementById('intercom-script')) {
							document.getElementById('intercom-script')!.addEventListener('load', bootGuest);
						}
					}
				} catch (e) {
					console.error('Intercom init error', e);
				}
			})();
		}

	}, [Router.pathname, login, workspace]);

	return <></>;
}