import axios from 'axios';
import { useState, useEffect } from 'react';

export type SessionColors = {
  recurring: string;
  shift: string;
  training: string;
  event: string;
  other: string;
};

const defaultSessionColors: SessionColors = {
  recurring: 'bg-blue-500',
  shift: 'bg-green-500',
  training: 'bg-yellow-500',
  event: 'bg-purple-500',
  other: 'bg-zinc-500',
};

export const useSessionColors = (workspaceId: number | string | undefined) => {
  const [sessionColors, setSessionColors] = useState<SessionColors>(defaultSessionColors);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSessionColors = async () => {
    if (!workspaceId) return;
    try {
      setIsLoading(true);
      const response = await axios.get(
        `/api/workspace/${workspaceId}/settings/general/session-colors`,
      );

      if (response.data.success && response.data.colors) {
        setSessionColors(response.data.colors);
      }
    } catch (error) {
      console.error('Failed to fetch session colors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!workspaceId) return;
    fetchSessionColors();
  }, [workspaceId]);

  const getSessionTypeColor = (sessionType: string | null | undefined): string => {
    if (!sessionType) return sessionColors.other;

    const type = sessionType.toLowerCase();
    if (type === 'shift') return sessionColors.shift;
    if (type === 'training') return sessionColors.training;
    if (type === 'event') return sessionColors.event;
    return sessionColors.other;
  };

  const getRecurringColor = (): string => {
    return sessionColors.recurring;
  };

  const getTextColorForBackground = (bgColor: string): string => {
    if (bgColor.includes('yellow') || bgColor.includes('orange-400')) {
      return 'text-zinc-800 dark:text-zinc-900';
    }
    return 'text-white';
  };

  return {
    sessionColors,
    isLoading,
    fetchSessionColors,
    getSessionTypeColor,
    getRecurringColor,
    getTextColorForBackground,
  };
};
