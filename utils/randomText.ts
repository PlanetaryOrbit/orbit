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
		`Boot sequence complete, ${name}. Let’s launch 🚀`,
		`Up and at 'em, ${name}! 🐓`,
		`Let’s make today awesome, ${name} 💫`,
		`First light and first coffee, right ${name}? ☕️`,
		`It’s go time, ${name} 🔥`,
		`Sun’s out, ambition’s up, ${name} 😎`,
		`Time to shine, ${name} ✨`,
		`New day, new tasks — let’s crush them, ${name} ✅`,
		`Hello sunshine! ${name}, you’re glowing today ☀️`,
		`Mission log: ${name} is online and operational 🛰️`,
		`Don't just wake up, show up — let’s go ${name} 💼`
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
		`Orbit stabilizing… productivity at peak, ${name} 🌑`,
		`Need a snack break, ${name}? 🍎`,
		`Still on track, ${name}? You're killing it 🧨`,
		`Let’s turn that to-do list into a done list, ${name} ✅`,
		`You've got this, ${name}. One hour at a time ⏳`,
		`Ping! Just checking in on you, ${name} 🛎️`,
		`Think of this message as your mid-day high-five 🖐️`,
		`Orbit’s still spinning and so are you, ${name} 🌀`,
		`Don't forget to hydrate, ${name} 💧`,
		`Productivity levels: Rising steadily, Captain ${name} 📈`,
		`It’s a good day to get stuff done, ${name} 🧠`
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
		`Orbit doesn’t sleep — but you should soon, ${name} 💤`,
		`The night is calm, ${name}. Time to relax 🌌`,
		`Logging off soon, ${name}? You’ve earned it 📴`,
		`Recharge mode: Initiated for ${name} 🔋`,
		`Even stars need rest — so do you, ${name} 🌟`,
		`Thanks for showing up today, ${name} 💙`,
		`Night shift or night chill? You decide, ${name} 🌃`,
		`May your dreams be bug-free, ${name} 🐛💤`,
		`Another day complete. Well played, ${name} 🎮`,
		`Captain ${name}, mission complete for today 🚀`,
		`Sending good energy for tomorrow, ${name} 🔮`
	];

	const lateNightTexts = [
		`Still awake, ${name}? Respect 🌙`,
		`The grind never sleeps — neither do you, huh ${name}? 😅`,
		`Late-night coding or existential scrolling, ${name}? 💻📱`,
		`You, me, and the moon. Let’s vibe, ${name} 🌕`,
		`Insomniacs anonymous: Welcome, ${name} 😴💤`,
		`Hope you're doing okay, ${name}. Remember to rest soon 🫶`
	];

	const hour = new Date().getHours();

	if (hour >= 20) return randomTextFromArray(nightOnlyTexts);
	if (hour >= 12) return randomTextFromArray(afternoonOnlyTexts);
	if (hour >= 4) return randomTextFromArray(morningOnlyTexts);
	return randomTextFromArray(lateNightTexts);
};

export default randomText;
