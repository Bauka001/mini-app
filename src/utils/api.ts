import WebApp from '@twa-dev/sdk';
import { SocialTask } from '../store/useStore';
import { buildApiUrl } from './apiBase';

const getTelegramInitData = () => {
  return window.Telegram?.WebApp?.initData || WebApp?.initData || '';
};

async function postJson<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      initData: getTelegramInitData(),
      ...body,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Request failed';
    throw new Error(message);
  }

  return data as T;
}

export const fetchSocialTasksApi = () => 
  postJson<{ tasks: SocialTask[] }>('/api/tasks');

export const claimSocialTaskApi = (taskId: string) => 
  postJson<{ ok: true; reward: number }>('/api/tasks/claim', { taskId });
