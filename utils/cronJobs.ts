import cron from "node-cron";

import { runSessionUpdateCron } from "@/utils/crons/sessions";
import { runRoleSyncCron } from "@/utils/crons/update-roles";
import { runBirthdayCron } from "@/utils/crons/birthday";
import { runActivityReset } from "@/utils/crons/resetActivity";
import { runMilestoneCron } from "@/utils/crons/milestones";
import { runSessionCron } from "./crons/authSessions";
import { runOAuthCron } from "./crons/authState";
import { runPendingVerificationCron } from "./crons/pVerification";

let initialized = false;

export async function initCronJobs() {
  if (initialized) return;
  initialized = true;

  try {
    cron.schedule("* * * * *", async () => {
      try {
        await runSessionUpdateCron();
      } catch (err) {
        console.error("[CRON][SESSIONS]", err);
      }
    });

    cron.schedule("*/15 * * * *", async () => {
      try {
        await runRoleSyncCron();
      } catch (err) {
        console.error("[CRON][ROLES]", err);
      }
    });

    cron.schedule("0 0 * * *", async () => {
      try {
        await runBirthdayCron();
      } catch (err) {
        console.error("[CRON][BIRTHDAYS]", err);
      }
    });

    cron.schedule("0 6 * * *", async () => {
      try {
        await runActivityReset();
      } catch (err) {
        console.error("[CRON][ACTIVITY RESET]", err);
      }
    });

    cron.schedule("*/5 * * * *", async () => {
      try {
        await runMilestoneCron();
      } catch (err) {
        console.error("[CRON][MILESTONES]", err);
      }
    });

    cron.schedule("*/30 * * * *", async () => {
      try {
        await runSessionCron();
      } catch (err) {
        console.error("[CRON][AUTH]", err);
      }
    });

    cron.schedule("*/5 * * * *", async () => {
      try {
        await runOAuthCron();
      } catch (err) {
        console.error("[CRON][OAUTH]", err);
      }
    });

    cron.schedule("*/5 * * * *", async () => {
      try {
        await runPendingVerificationCron();
      } catch (err) {
        console.error("[CRON][OAUTH]", err);
      }
    });

    console.log("[STARTUP] All crons scheduled.");
  } catch (err) {
    console.error(
      "[CRON JOBS] Failed to register cron jobs:",
      err
    );

    initialized = false;
  }
}