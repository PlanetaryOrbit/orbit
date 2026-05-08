import cron from 'node-cron'
import axios from 'axios'

export async function initCronJobs() {
  if (!process.env.CRON_SECRET) {
    console.log("Cron processes will not run through because of CRON_SECRET not being set on environmental variables.")
    return;
  }
  if (!process.env.NEXTAUTH_URL) {
    console.log("Cron processes will not run through because of NEXTAUTH_URL not being set on environmental variables.")
    return;
  }
  try {
    cron.schedule('* * * * *', async () => {
      await axios.post(`${process.env.NEXTAUTH_URL}/api/cron/update-sessions`, {}, {
        headers: {
          "x-cron-secret": process.env.CRON_SECRET
        }
      })
    });

    cron.schedule('0 * * * *', async () => {
      await axios.post(`${process.env.NEXTAUTH_URL}/api/cron/update-roles`, {}, {
        headers: {
          "x-cron-secret": process.env.CRON_SECRET
        }
      })
    });

    cron.schedule('0 0 * * *', async () => {
      await axios.post(`${process.env.NEXTAUTH_URL}/api/cron/birthday`, {}, {
        headers: {
          "x-cron-secret": process.env.CRON_SECRET
        }
      })
    });

    cron.schedule('0 6 * * *', async () => {
      await axios.post(`${process.env.NEXTAUTH_URL}/api/cron/reset-activity`, {}, {
        headers: {
          "x-cron-secret": process.env.CRON_SECRET
        }
      })
    });

    cron.schedule('* * * * *', async () => {
      await axios.post(`${process.env.NEXTAUTH_URL}/api/cron/milestone`, {}, {
        headers: {
          "x-cron-secret": process.env.CRON_SECRET
        }
      })
    });
  } catch (err) {
    console.log(`[CRON JOBS]: An error occured while running a cron job: ${err}`)
  }

  console.log("[STARTUP]: All crons scheduled.")
}
