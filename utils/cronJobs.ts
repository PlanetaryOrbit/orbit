import cron from 'node-cron'
import axios from 'axios'

function getInternalBaseUrl(): string {
  if (process.env.PLANETARY_CLOUD_URL) {
    return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  }

  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export async function initCronJobs() {
  const baseUrl = getInternalBaseUrl();

  try {
    cron.schedule('* * * * *', async () => {
      await axios.post(`${baseUrl}/api/cron/update-sessions`);
    });
    cron.schedule('0 * * * *', async () => {
      await axios.post(`${baseUrl}/api/cron/update-roles`);
    });
    cron.schedule('0 0 * * *', async () => {
      await axios.post(`${baseUrl}/api/cron/birthday`);
    });
    cron.schedule('0 6 * * *', async () => {
      await axios.post(`${baseUrl}/api/cron/reset-activity`);
    });
    cron.schedule('* * * * *', async () => {
      await axios.post(`${baseUrl}/api/cron/milestone`);
    });
  } catch (err) {
    console.log(`[CRON JOBS]: An error occured while running a cron job: ${err}`);
  }

  console.log("[STARTUP] All crons scheduled.");
}
