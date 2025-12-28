const randomTextFromArray = (texts: string[]) => texts[Math.floor(Math.random() * texts.length)];

const randomText = (name: string) => {
	const morningOnlyTexts = [
		`Merry Christmas morning, ${name}! 🎄`,
		`Good morning, ${name}! Let’s jingle all the way today 🔔`,
		`Rise and shine, ${name}! Santa’s elves are already working 🎅`,
		`Hope you slept cozy, ${name}! Time to spread holiday cheer 🎁`,
		`Morning, ${name}. Ready for a holly jolly day? 🎄`,
		`Hey ${name}, hot cocoa’s ready! ☕️`,
		`Rise and jingle, ${name}! 🎅`,
		`New day, festive opportunities await, ${name} 🌄✨`,
		`’Tis the season to be productive, ${name} 🎵`,
		`Boot sequence complete, ${name}. Sleigh bells primed 🔔`,
		`Up and at ’em, ${name}! Christmas magic awaits 🎄`,
		`Let’s make today merry & bright, ${name} 💫`,
		`First light, first candy cane coffee, right ${name}? 🍬`,
		`It’s go time-deck those halls, ${name} 🎄`,
		`Frosty’s out, ambition’s up, ${name} ⛄`,
		`Shine like Rudolph’s nose today, ${name} 🦌`,
		`New festive tasks-let’s sleigh them, ${name} 🛷`,
		`Winter sun & Christmas lights-glow on, ${name} 🎄`,
		`Mission log: ${name} online for holiday operations 🛰️`,
		`Don’t just wake-make spirits bright, ${name} 🔔`
	];

	const afternoonOnlyTexts = [
		`Festive afternoon, ${name}! Feeling cozy? 🎄`,
		`Hope your season’s bright so far, ${name} 🎁`,
		`Hey ${name}, how many sleeps till Christmas? 🎅`,
		`Halfway through - keep the cheer flowing, ${name} ✨`,
		`Great work, ${name}! Santa’s taking notes 🎅`,
		`Hello ${name}! May your afternoon be merry 🎄`,
		`A productive & peppermint-fueled afternoon to you, ${name} 🍬`,
		`Let’s sleigh this block of hours, ${name} 🛷`,
		`Still dashing like Dasher, ${name}? 🦌`,
		`Orbit stable-holiday spirit nominal, ${name} 🌑`,
		`Cookie break time yet, ${name}? 🍪`,
		`On track & jingling, ${name}! 🔔`,
		`Turn that wish list into a done list, ${name} ✅`,
		`You’ve got this one wrapped task at a time, ${name} 🎁`,
		`Jingle ping! Just checking in, ${name} 🛎️`,
		`Mid-day Christmas high-five, ${name} 🎄`,
		`Orbit spins like a snow globe - keep going, ${name} ❄️`,
		`Hydrate & stay warm, ${name} ☕️`,
		`Cheer levels rising steadily, Captain ${name} 📈`,
		`Wonderful time to finish things, ${name} 🧠`
	];

	const nightOnlyTexts = [
		`Cozy Christmas evening, ${name} 🌙`,
		`Winding down by the (virtual) fireplace, ${name} 🔥`,
		`Hope your day went great, ${name} 🌆`,
		`Relax-like Santa post-route, ${name} 🎅`,
		`Twinkling light vibes, ${name} 🎄`,
		`Slow down & soak up cheer, ${name} 🎁`,
		`Stars out like Christmas Eve, ${name} ⭐️`,
		`Nice list performance today, ${name} 🎅`,
		`Sweet gingerbread dreams soon, ${name} 🍪`,
		`Orbit hums-time for you to rest, ${name} 💤`,
		`Calm & merry night, ${name}. Unwind🎄`,
		`Logging off? You sleighed it, ${name} 🛷`,
		`Recharge mode (elf approved), ${name} 🧝`,
		`Even Christmas lights dim-so can you, ${name} 🌟`,
		`Thanks for spreading joy today, ${name} 🎁`,
		`Late tasks or cocoa chill-your call, ${name} ☕️`,
		`May your sleep be merry & bright, ${name} ✨`,
		`Festive level complete. GG, ${name} 🎄`,
		`Captain ${name}, holiday ops secure 🚀`,
		`Sending peppermint energy for tomorrow, ${name} 🍬`
	];

	const lateNightTexts = [
		`Still awake, ${name}? Santa would be impressed 🌙`,
		`Holiday grind never sleeps-neither do you, ${name} 🎄`,
		`Late-night wrapping or coding, ${name}? 🎁`,
		`You, me & the frosty moon-vibing, ${name} ❄️`,
		`Night owls & elves meet here, ${name} 😴`,
		`Take a cocoa break & rest soon, ${name} ☕️`
	];

	const hour = new Date().getHours();
	if (hour >= 20) return randomTextFromArray(nightOnlyTexts);
	if (hour >= 12) return randomTextFromArray(afternoonOnlyTexts);
	if (hour >= 4) return randomTextFromArray(morningOnlyTexts);
	return randomTextFromArray(lateNightTexts);
};

export default randomText;