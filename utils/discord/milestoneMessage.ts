const defaultMessage =
  ':confetti_ball: **{groupName}** has reached **{crossedMilestone}** members! We are **{membersRemaining}** members away from **{nextMilestone}** members!';

export const messageVariables = {
  groupName: {
    label: 'Group name',
    description: 'The name of your Roblox group.',
  },
  crossedMilestone: {
    label: 'Milestone',
    description: 'The member milestone that was just reached.',
  },
  currentMemberCount: {
    label: 'Current member count',
    description: 'The group’s current member count.',
  },
  membersRemaining: {
    label: 'Members remaining',
    description: 'How many members are needed to reach the next milestone.',
  },
  nextMilestone: {
    label: 'Next milestone',
    description: 'The next member milestone.',
  },
} as const;

export type MilestoneMessageValues = {
  groupName: string;
  crossedMilestone: number;
  currentMemberCount: number;
  membersRemaining: number;
  nextMilestone: number;
};

export function formatMilestoneMessage(template: string, values: MilestoneMessageValues): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (match, key: string) => {
    if (!(key in values)) {
      return match;
    }
    return String(values[key as keyof MilestoneMessageValues].toLocaleString());
  });
}

export function getDefaultMilestoneMessage(): string {
  return defaultMessage;
}

export function getMilestoneMessageTemplate(template?: unknown): string {
  if (typeof template !== 'string' || !template.trim()) {
    return defaultMessage;
  }

  return template;
}
