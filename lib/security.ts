import type {
  NextApiHandler,
  NextApiRequest,
  NextApiResponse
} from "next";

export function verifyWorkspace(req: NextApiRequest): boolean {
  const { id: workspaceId } = req.query;
  if (!workspaceId) return true;

  const workspace = Array.isArray(workspaceId) ? workspaceId[0] : workspaceId;

  const isValidWorkspaceId = /^[A-Za-z0-9_-]+$/.test(workspace);
  if (!isValidWorkspaceId) return false;
  return true
}

export function withHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => any,
): NextApiHandler {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      if (!verifyWorkspace(req)) return res.status(400).send({
        success: false,
        error: "Not valid workspace"
      });

      return handler(req, res);
    } catch (error) {
      console.error("Handler error:", error);

      return res.status(500).json({
        success: false,
        error: "Internal Server Error",
      });
    }
  };
}