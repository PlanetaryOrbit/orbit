import axios, { AxiosError } from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST')
    return res.status(402).json({ error: true, message: 'Method not allowed' });

  const body = req.body;
  if (!body.keyword) return res.status(400).json({ error: true, message: "Missing 'keyword'" });

  console.log("we're getting the user id from the api");
  console.log(body.keyword);

  try {
    const { data } = await axios.post(
      `https://users.roblox.com/v1/usernames/users`,
      {
        usernames: [body.keyword],
        excludeBannedUsers: true,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('we got the user id from the api');
    console.log(data);

    return res.status(200).json({
      error: false,
      data: data.data,
    });
  } catch (error) {
    console.log('we got an error from the api');
    console.log(error);
    if (error instanceof AxiosError) {
      console.error(`${error.response?.status} - ${error.code} - ${error.message}`);

      return res.status(500).json({
        error: false,
        message: `${error.response?.status} - ${error.code} - ${error.message}`,
      });
    }
  }
}
