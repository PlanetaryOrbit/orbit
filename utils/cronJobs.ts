import cron from 'node-cron'
import axios from 'axios'

export async function initCronJobs() {
  try {
    cron.schedule('* * * * *', async () => {
      await axios.post(`${process.env.NEXTAUTH_URL}/api/cron/update-sessions`)
    });

    cron.schedule('0 * * * *', async () => {
      await axios.post(`${process.env.NEXTAUTH_URL}/api/cron/update-roles`)
    });

    cron.schedule('0 0 * * *', async () => {
      await axios.post(`${process.env.NEXTAUTH_URL}/api/cron/birthday`)
    });

    cron.schedule('0 6 * * *', async () => {
      await axios.post(`${process.env.NEXTAUTH_URL}/api/cron/reset-activity`)
    });

    cron.schedule('* * * * *', async () => {
      await axios.post(`${process.env.NEXTAUTH_URL}/api/cron/milestone`)
    });
  } catch (err) {
    console.log(`[CRON JOBS]: An error occured while running a cron job: ${err}`)
  }

  console.log("[STARTUP] All crons scheduled.")
}
