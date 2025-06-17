import { useState, useEffect } from "react"
import { IconX, IconPin } from "@tabler/icons"

export default function StickyNoteAnnouncement() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const announcementDismissed = localStorage.getItem("announcementDismissed")

    if (!announcementDismissed) {
      setIsVisible(true)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem("announcementDismissed", "true")
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="z-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex items-start space-x-4 mb-6 relative">
      <img
        src="/favicon-32x32.png"
        alt="Orbit"
        className="w-10 h-10 rounded-full bg-primary flex-shrink-0"
      />
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-1">
          <IconPin className="w-4 h-4 text-gray-500 dark:text-gray-300" />
          Planetary
        </h3>

		<p className="text-sm text-gray-500 dark:text-gray-400 mt-0"></p>
		<div className="text-gray-800 dark:text-gray-300 text-sm space-y-2">
			<p>
				👋 <strong>Welcome to Orbit V2.0.9b6!</strong> — Now with Birthdays Support! 🎉
				<br />
				We’re excited to have you with us 🚀
			</p>

			<p className="mt-4 font-semibold">🎂 New: Birthdays Feature</p>
			<p>
				You can now set your birthday in your profile. Orbit will remind your team when birthdays are coming up - never miss a celebration again!
			</p>

			<p className="mt-4 font-semibold">✨ Other Improvements</p>
			<ul className="list-disc list-inside space-y-1">
				<li>We’ve launched a brand new login UI — it’s cleaner and faster. (Thanks @s3ntrical and @e)</li>
				<li>You’ll now be required to set a secure password when signing up, helping protect your data even further.</li>
				<li>User avatars are now cached for up to 3 days, improving performance across workspaces.</li>
				<li>Fixed multiple minor UI bugs across the board, improving consistency and experience.</li>
				<li>Workspace colors, links, and visuals have all received polish to better match your themes and improve legibility.</li>
			</ul>

			<p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
				Orbit is still in <em>beta</em> — we’re squashing bugs and improving things fast. Thanks for being part of the journey!
			</p>
		</div>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        aria-label="Close announcement"
      >
        <IconX className="w-5 h-5" />
      </button>
    </div>
  )
}
