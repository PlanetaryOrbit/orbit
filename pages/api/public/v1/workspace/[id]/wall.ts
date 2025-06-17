import type { NextApiRequest, NextApiResponse } from "next"
import prisma from "@/utils/database"
import { validateApiKey } from "@/utils/api-auth"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" })
  }

  const apiKey = req.headers.authorization?.replace("Bearer ", "")
  if (!apiKey) return res.status(401).json({ success: false, error: "Missing API key" })

  const workspaceId = Number.parseInt(req.query.id as string)
  if (!workspaceId) return res.status(400).json({ success: false, error: "Missing workspace ID" })

  try {
    // Validate API key
    const key = await validateApiKey(apiKey, workspaceId.toString())
    if (!key) {
      return res.status(401).json({ success: false, error: "Invalid API key" })
    }

    // GET: Fetch wall posts
    if (req.method === "GET") {
      const { limit = "20", before } = req.query

      const where: any = {
        workspaceGroupId: workspaceId,
      }

      // Pagination using cursor
      if (before) {
        where.id = {
          lt: Number(before),
        }
      }

      const posts = await prisma.wallPost.findMany({
        where,
        include: {
          author: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: Number(limit),
      })

      const formattedPosts = posts.map((post) => ({
        id: post.id,
        content: post.content,
        image: post.image,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: {
          userId: Number(post.author.userid),
          username: post.author.username,
          thumbnail: post.author.picture,
        },
      }))

      return res.status(200).json({
        success: true,
        posts: formattedPosts,
        total: formattedPosts.length,
        nextCursor: formattedPosts.length > 0 ? formattedPosts[formattedPosts.length - 1].id : null,
      })
    }

    // POST: Create a new wall post
    if (req.method === "POST") {
      const { content, authorId, image } = req.body

      if (!content) {
        return res.status(400).json({ success: false, error: "Content is required" })
      }

      if (!authorId) {
        return res.status(400).json({ success: false, error: "Author ID is required" })
      }

      // Check if author exists and has permission in this workspace
      const author = await prisma.user.findFirst({
        where: {
          userid: BigInt(authorId),
          roles: {
            some: {
              workspaceGroupId: workspaceId,
            },
          },
        },
      })

      if (!author) {
        return res.status(403).json({ success: false, error: "Author does not have permission in this workspace" })
      }

      // Create the post
      const post = await prisma.wallPost.create({
        data: {
          content,
          image,
          workspaceGroupId: workspaceId,
          authorId: BigInt(authorId),
        },
        include: {
          author: {
            select: {
              userid: true,
              username: true,
              picture: true,
            },
          },
        },
      })

      return res.status(201).json({
        success: true,
        post: {
          id: post.id,
          content: post.content,
          image: post.image,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          author: {
            userId: Number(post.author.userid),
            username: post.author.username,
            thumbnail: post.author.picture,
          },
        },
      })
    }
  } catch (error) {
    console.error("Error in public API:", error)
    return res.status(500).json({ success: false, error: "Internal server error" })
  }
}
