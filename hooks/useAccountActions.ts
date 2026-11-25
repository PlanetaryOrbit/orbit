import type { LinkableProvider } from '@/components/topbar/providers';
import { loginState } from '@/state';
import type { LoginState } from '@/state';
import axios from 'axios';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useSetRecoilState } from 'recoil';

const SIGNED_OUT_STATE: LoginState = {
  userId: 1,
  username: '',
  displayname: '',
  thumbnail: '',
  canMakeWorkspace: false,
  workspaces: [],
  isOwner: false,
  isFirstLogin: false,
  hasPassword: false,
};

export function useAccountActions() {
  const router = useRouter();
  const setLogin = useSetRecoilState(loginState);

  const logout = async () => {
    await axios.post('/api/auth/logout');
    setLogin(SIGNED_OUT_STATE);
    router.push('/login');
  };

  const deleteAccount = async () => {
    const toastId = toast.loading('Deleting account...');

    try {
      await axios.delete('/api/user/account');
      toast.success('Account deleted', { id: toastId });
      await logout();
    } catch {
      toast.error('Failed to delete account', { id: toastId });
    }
  };

  const linkProvider = ({ id }: LinkableProvider) => {
    window.location.href = `/api/auth/${id}/start?link=1`;
  };

  const unlinkProvider = async ({ id, label, accountKey }: LinkableProvider) => {
    const toastId = toast.loading(`Unlinking ${label}...`);

    try {
      await axios.post(`/api/auth/${id}/unlink`);
      toast.success(`${label} unlinked`, { id: toastId });
      setLogin((current) => ({ ...current, [accountKey]: undefined }));
    } catch {
      toast.error('Failed to unlink', { id: toastId });
    }
  };

  return { logout, deleteAccount, linkProvider, unlinkProvider };
}
