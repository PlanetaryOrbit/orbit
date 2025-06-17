import React, { useState } from "react";
import { IconClipboard, IconPencil, IconUser, IconId, IconHash, IconCheck, IconX, IconCalendar } from "@tabler/icons";
import axios from "axios";
import Confetti from "react-confetti";

type InformationPanelProps = {
  user: {
    userid: string;
    username: string;
    displayname: string;
    rank?: string | number;
    registered: boolean;
    birthdayDay?: number | null;
    birthdayMonth?: number | null;
  };
  isUser?: boolean;
  isAdmin?: boolean;
};

const monthNames = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function InformationPanel({ user, isUser, isAdmin }: InformationPanelProps) {
  const [editing, setEditing] = useState(false);
  const [month, setMonth] = useState(user.birthdayMonth ?? "");
  const [day, setDay] = useState(user.birthdayDay ?? "");
  const [loading, setLoading] = useState(false);

  const canEdit = isUser || isAdmin;

  const daysInMonth = (month: number) => {
    if (month === 2) return 28;
    if ([4, 6, 9, 11].includes(month)) return 30;
    return 31;
  };
  const days =
    month && Number(month) > 0
      ? Array.from({ length: daysInMonth(Number(month)) }, (_, i) => i + 1)
      : [];

  const handleSave = async () => {
    setLoading(true);
    await axios.post("/api/user/birthdays", {
      targetUserId: user.userid,
      day: Number(day),
      month: Number(month),
    });
    user.birthdayDay = Number(day);
    user.birthdayMonth = Number(month);
    setEditing(false);
    setLoading(false);
  };

  let birthday = "Not set";
  if (
    user.birthdayDay &&
    user.birthdayMonth &&
    user.birthdayDay > 0 &&
    user.birthdayMonth > 0
  ) {
    birthday = `${monthNames[user.birthdayMonth]} ${user.birthdayDay}`;
  }

  const today = new Date();
  const isBirthday =
    user.birthdayDay === today.getDate() &&
    user.birthdayMonth === today.getMonth() + 1;

  return (
    <>
      {isBirthday && <Confetti />}
      <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Information</h2>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center">
            <span className="inline-flex items-center font-semibold text-gray-700 dark:text-white"><IconUser className="w-4 h-4 mr-2 text-primary" /> Username:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-200">{user.username}</span>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center font-semibold text-gray-700 dark:text-white"><IconId className="w-4 h-4 mr-2 text-primary" /> Display Name:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-200">{user.displayname}</span>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center font-semibold text-gray-700 dark:text-white"><IconHash className="w-4 h-4 mr-2 text-primary" /> UserId:</span>
            <span className="ml-2 text-gray-900 dark:text-gray-200">{user.userid}</span>
          </div>
          <div className="flex items-center">
            <span className="inline-flex items-center font-semibold text-gray-700 dark:text-white">
              {user.registered ? <IconCheck className="w-4 h-4 mr-2 text-primary" /> : <IconX className="w-4 h-4 mr-2 text-primary" />} Status:
            </span>
            <span className="ml-2 text-gray-900 dark:text-gray-200">{user.registered ? "Registered" : "Unregistered"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center font-semibold text-gray-700 dark:text-white"><IconCalendar className="w-4 h-4 mr-2 text-primary" /> Birthday:</span>
            {!editing ? (
              <>
                <span className="text-gray-900 dark:text-gray-200">{birthday}</span>
                {canEdit && (
                  <button
                    className="ml-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => {
                      setEditing(true);
                      setMonth(user.birthdayMonth ?? "");
                      setDay(user.birthdayDay ?? "");
                    }}
                    aria-label="Edit Birthday"
                    type="button"
                  >
                    <IconPencil className="h-4 w-4 text-primary" />
                  </button>
                )}
              </>
            ) : (
              <>
                <select
                  value={month}
                  onChange={e => {
                    setMonth(e.target.value);
                    setDay("");
                  }}
                  className="border rounded px-2 py-1 w-32"
                >
                  <option value="">Month</option>
                  {monthNames.slice(1).map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={day}
                  onChange={e => setDay(e.target.value)}
                  className="border rounded px-2 py-1 w-20"
                  disabled={!month}
                >
                  <option value="">Day</option>
                  {days.map(d => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleSave}
                  disabled={loading || !day || !month}
                  className="ml-2 bg-primary text-white px-3 py-1 rounded"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="ml-1 px-3 py-1 rounded border dark:text-white"
                  type="button"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default InformationPanel;