const randomTextFromArray = (texts: string[]) => {
	return texts[Math.floor(Math.random() * texts.length)];
};

const randomText = (name: string) => {
	const morningOnlyTexts = [
		`Good morning, ${name} ☀️`,
		`Top of the morning to you, ${name}! 🥐`,
		`Rise and shine, ${name} 🌅`,
		`Hope you slept well, ${name} 😴`,
		`Morning, ${name}. Ready to take on the day? 💪`,
		`Hey ${name}, coffee's brewing! ☕️`,
		`Rise and grind, ${name} 🏋️‍♂️`,
		`New day, new opportunities, ${name} 🌄`,
		`The early bird gets the worm, ${name} 🐦`,
		`Boot sequence complete, ${name}. Let’s launch 🚀`
	];

	const afternoonOnlyTexts = [
		`Good afternoon, ${name} 🌞`,
		`Hope your day is going well, ${name} 😊`,
		`Hey ${name}, how’s your day so far? 🕑`,
		`You're halfway through, ${name}! 🧭`,
		`Keep up the great work, ${name} 👏`,
		`Hello there, ${name} 👋`,
		`A productive afternoon to you, ${name} 🛠️`,
		`Let’s power through the afternoon, ${name} ⚡️`,
		`Still going strong, ${name}? 🔋`,
		`Orbit stabilizing… productivity at peak, ${name} 🌑`
	];

	const nightOnlyTexts = [
		`Good evening, ${name} 🌙`,
		`Winding down, ${name}? 🛋️`,
		`Hope your day went well, ${name} 🌆`,
		`Relax, you’ve earned it, ${name} 😌`,
		`Evening vibes, ${name} ✨`,
		`Time to slow down and reflect, ${name} 🧘`,
		`The stars are out, ${name} ⭐️`,
		`Great job today, ${name} 🙌`,
		`Sweet dreams in advance, ${name} 😴`,
		`Orbit doesn’t sleep — but you should soon, ${name} 💤`
	];

	const hour = new Date().getHours();

	if (hour >= 20) return randomTextFromArray(nightOnlyTexts);
	if (hour >= 12) return randomTextFromArray(afternoonOnlyTexts);
	if (hour >= 05) return randomTextFromArray(morningOnlyTexts);
};

export default randomText;
