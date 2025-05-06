// /api/admin/roblox -- GET / POST
// roblox calls to retrieve or update Roblox-related data for the admin panel

import type { NextApiRequest, NextApiResponse } from 'next'
 
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
	// Handle GET requests for Roblox data
	res.status(200).json({ message: 'GET request to /api/admin/roblox' });
  } else {
    // Handle any other HTTP method
  }
}