import React, { useEffect, useState, useRef } from "react";
import Confetti from "react-confetti";
import { useRouter } from "next/router";
import { IconGift } from "@tabler/icons";
import axios from "axios";

type BirthdayUser = {
  userid: string;
  username: string;
  picture: string;
  birthdayDay: number;
  birthdayMonth: number;
};

const BG_COLORS = [
  "bg-red-200",
  "bg-green-200",
  "bg-blue-200",
  "bg-yellow-200",
  "bg-pink-200",
  "bg-indigo-200",
  "bg-teal-200",
  "bg-orange-200",
];

function getRandomBg(userid: string) {
  let hash = 0;
  for (let i = 0; i < userid.length; i++) {
    hash = userid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return BG_COLORS[Math.abs(hash) % BG_COLORS.length];
}

function getDaysUntilBirthday(day: number, month: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let nextBirthday = new Date(today.getFullYear(), month - 1, day);

  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
  }

  const diffTime = nextBirthday.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function Birthdays() {
  const [birthdays, setBirthdays] = useState<BirthdayUser[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const router = useRouter();
  const { id: workspaceId } = router.query;
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!workspaceId) return;
    axios.get(`/api/workspace/${workspaceId}/home/upcoming?days=7`).then(res => {
      if (res.status === 200) {
        setBirthdays(res.data.birthdays);
      }
    });
  }, [workspaceId]);

  useEffect(() => {
    function updateSize() {
      if (cardRef.current) {
        setCardSize({
          width: cardRef.current.offsetWidth,
          height: cardRef.current.offsetHeight,
        });
      }
    }
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const usersWithDays = birthdays
    .map(user => ({
      ...user,
      daysAway: getDaysUntilBirthday(user.birthdayDay, user.birthdayMonth),
    }))
    .filter(user => user.daysAway >= 0 && user.daysAway <= 7)
    .sort((a, b) => a.daysAway - b.daysAway);

  if (usersWithDays.length === 0) return null;

  return (
    <div ref={cardRef} className="z-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 flex flex-col gap-4 mb-6 relative overflow-hidden">
      {showConfetti && cardSize.width > 0 && cardSize.height > 0 && (
        <Confetti width={cardSize.width} height={cardSize.height} numberOfPieces={300} recycle={true} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
      )}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <IconGift className="w-5 h-5 text-primary" />
        </div>
        <span className="text-lg font-medium text-gray-900 dark:text-white">Upcoming Birthdays</span>
      </div>
      <div className="flex flex-col gap-3">
        {usersWithDays.map(user => (
          <div
            key={user.userid}
            className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm"
            onMouseEnter={() => {
              if (user.daysAway === 0) {
                if (cardRef.current) {
                  setCardSize({
                    width: cardRef.current.offsetWidth,
                    height: cardRef.current.offsetHeight,
                  });
                }
                setShowConfetti(true);
              }
            }}
            onMouseLeave={() => {
              if (user.daysAway === 0) setShowConfetti(false);
            }}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${getRandomBg(user.userid)}`}>
              <img
                src={user.picture}
                alt={user.username}
                className="w-12 h-12 rounded-full object-cover border-2 border-white"
                style={{ background: "transparent" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-white">{user.username}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {user.daysAway === 0
                  ? "🎉 Birthday Today!"
                  : user.daysAway === 1
                  ? "Tomorrow"
                  : `In ${user.daysAway} days (${monthNames[user.birthdayMonth]} ${user.birthdayDay})`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}