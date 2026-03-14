import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body || {};

  if (!name || !contentType) {
    res.status(400).json({ error: "Missing required fields: name, contentType" });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json({ uploadURL, objectPath });
  } catch (err: any) {
    console.error("Error generating upload URL:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.get("/storage/objects/uploads/:objectId", async (req: Request, res: Response) => {
  try {
    const objectPath = `/objects/uploads/${(req.params as any).objectId}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const downloadResponse = await objectStorageService.downloadObject(objectFile);

    res.setHeader("Content-Type", downloadResponse.headers.get("Content-Type") || "application/octet-stream");
    const cacheControl = downloadResponse.headers.get("Cache-Control");
    if (cacheControl) res.setHeader("Cache-Control", cacheControl);

    const body = downloadResponse.body;
    if (body) {
      const nodeStream = Readable.fromWeb(body as any);
      nodeStream.pipe(res);
    } else {
      res.status(500).json({ error: "No response body" });
    }
  } catch (err: any) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
    } else {
      console.error("Error serving object:", err);
      res.status(500).json({ error: "Failed to serve object" });
    }
  }
});

export default router;
