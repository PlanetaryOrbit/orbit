import React, { useEffect, useState, useRef } from "react";
import Confetti from "react-confetti";
import { useRouter } from "next/router";
import axios from "axios";
import { IconGift, IconConfetti } from "@tabler/icons-react";
import { HomeSection } from "@/components/home/shell";

type BirthdayUser = {
  userid: string;
  username: string;
  picture: string;
  birthdayDay: number;
  birthdayMonth: number;
};

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDaysUntilBirthday(day: number, month: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let nextBirthday = new Date(today.getFullYear(), month - 1, day);
  if (nextBirthday < today) {
    nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
  }
  return Math.round((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

type BirthdaysProps = {
  layout?: "section" | "strip";
};

export default function Birthdays({ layout = "section" }: BirthdaysProps) {
  const [birthdays, setBirthdays] = useState<BirthdayUser[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const router = useRouter();
  const { id: workspaceId } = router.query;
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!workspaceId) return;
    axios.get(`/api/workspace/${workspaceId}/home/upcoming?days=7`).then((res) => {
      if (res.status === 200) setBirthdays(res.data.birthdays);
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
    .map((user) => ({
      ...user,
      daysAway: getDaysUntilBirthday(user.birthdayDay, user.birthdayMonth),
    }))
    .filter((user) => user.daysAway >= 0 && user.daysAway <= 7);

  if (usersWithDays.length === 0) return null;

  const whenLabel = (daysAway: number, month: number, day: number) => {
    if (daysAway === 0) return "Today";
    if (daysAway === 1) return "Tomorrow";
    return `In ${daysAway} days`;
  };

  if (layout === "strip") {
    return (
      <div ref={cardRef} className="relative">
        {showConfetti && cardSize.width > 0 && cardSize.height > 0 && (
          <Confetti
            width={cardSize.width}
            height={cardSize.height}
            numberOfPieces={120}
            recycle
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 10 }}
          />
        )}
        <div className="flex gap-2.5 overflow-x-auto overscroll-x-contain px-4 pb-1 pt-1 scrollbar-hide sm:px-3">
          {usersWithDays.map((user) => {
            const isToday = user.daysAway === 0;
            return (
              <div
                key={user.userid}
                className="relative flex w-44 shrink-0 flex-col gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_3px_0_rgb(0,0,0,0.06),0_1px_2px_-1px_rgb(0,0,0,0.04)] dark:bg-zinc-900/80 dark:shadow-zinc-950/20"
                onMouseEnter={() => {
                  if (isToday) {
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
                  if (isToday) setShowConfetti(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <img
                    src={user.picture}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  {isToday ? (
                    <IconGift className="h-4 w-4 text-zinc-400 dark:text-zinc-500" stroke={1.5} />
                  ) : (
                    <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                      {whenLabel(user.daysAway, user.birthdayMonth, user.birthdayDay)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white leading-tight">
                    {user.username}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                    {isToday && <IconConfetti className="h-3 w-3 shrink-0" stroke={1.5} />}
                    {isToday ? "Today" : `${monthNames[user.birthdayMonth]} ${user.birthdayDay}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <HomeSection title="Birthdays" className="relative overflow-hidden">
      <div ref={cardRef}>
        {showConfetti && cardSize.width > 0 && cardSize.height > 0 && (
          <Confetti
            width={cardSize.width}
            height={cardSize.height}
            numberOfPieces={200}
            recycle
            style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
          />
        )}
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {usersWithDays.map((user) => (
            <li
              key={user.userid}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
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
              <img
                src={user.picture}
                alt=""
                className="h-9 w-9 rounded-md object-cover bg-zinc-100 dark:bg-zinc-800"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                  {user.username}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {whenLabel(user.daysAway, user.birthdayMonth, user.birthdayDay)}
                  {user.daysAway > 1 &&
                    ` · ${monthNames[user.birthdayMonth]} ${user.birthdayDay}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </HomeSection>
  );
}
