export const generateSessionTimeMessage = (gameName: string | null, sessionStartTime: Date) => {
  const hour = sessionStartTime.getHours();

  const defaultGameName = gameName || 'Roblox';

  const morningMessages = [
    `A morning in ${defaultGameName}`,
    `Morning shift in ${defaultGameName}`,
    `Dawn patrol in ${defaultGameName}`,
    `Early bird session in ${defaultGameName}`,
    `Rise and grind in ${defaultGameName}`,
    `First light adventure in ${defaultGameName}`,
    `Coffee break gaming in ${defaultGameName}`,
    `Sunrise session in ${defaultGameName}`,
    `Morning mission in ${defaultGameName}`,
  ];

  const afternoonMessages = [
    `Afternoon adventure in ${defaultGameName}`,
    `Midday mission in ${defaultGameName}`,
    `Lunch break gaming in ${defaultGameName}`,
    `Afternoon shift in ${defaultGameName}`,
    `Sunny session in ${defaultGameName}`,
    `Daytime duty in ${defaultGameName}`,
    `Afternoon grind in ${defaultGameName}`,
    `Peak performance in ${defaultGameName}`,
    `Midday momentum in ${defaultGameName}`,
  ];

  const eveningMessages = [
    `Evening expedition in ${defaultGameName}`,
    `Night shift in ${defaultGameName}`,
    `Twilight session in ${defaultGameName}`,
    `After-hours adventure in ${defaultGameName}`,
    `Evening grind in ${defaultGameName}`,
    `Sunset session in ${defaultGameName}`,
    `Moonlight mission in ${defaultGameName}`,
    `Night owl session in ${defaultGameName}`,
    `Late shift in ${defaultGameName}`,
    `Evening entertainment in ${defaultGameName}`,
  ];

  const lateNightMessages = [
    `Midnight mission in ${defaultGameName}`,
    `Late night grind in ${defaultGameName}`,
    `Insomnia session in ${defaultGameName}`,
    `After midnight in ${defaultGameName}`,
    `Nocturnal adventure in ${defaultGameName}`,
    `Sleepless session in ${defaultGameName}`,
  ];

  let messages;
  if (hour >= 20 || hour < 4) {
    messages = hour >= 22 || hour < 2 ? lateNightMessages : eveningMessages;
  } else if (hour >= 12) {
    messages = afternoonMessages;
  } else {
    messages = morningMessages;
  }

  return messages[Math.floor(Math.random() * messages.length)];
};
