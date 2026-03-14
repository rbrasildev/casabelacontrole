import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const SETTING_KEYS = [
  "org_name",
  "org_description",
  "org_cnpj",
  "org_phone",
  "org_email",
  "org_address",
  "org_city",
  "org_state",
  "org_zip",
  "org_logo",
  "org_favicon",
  "org_pix_key",
  "org_website",
  "org_instagram",
  "org_facebook",
];

router.get("/", async (_req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const result: Record<string, string | null> = {};
    for (const key of SETTING_KEYS) {
      result[key] = null;
    }
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/", async (req, res) => {
  try {
    const body = req.body as Record<string, string | null>;
    for (const [key, value] of Object.entries(body)) {
      if (!SETTING_KEYS.includes(key)) continue;
      const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(settingsTable).set({ value: value ?? null, updatedAt: new Date() }).where(eq(settingsTable.key, key));
      } else {
        await db.insert(settingsTable).values({ key, value: value ?? null });
      }
    }
    const rows = await db.select().from(settingsTable);
    const result: Record<string, string | null> = {};
    for (const key of SETTING_KEYS) {
      result[key] = null;
    }
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/upload-logo", async (req, res) => {
  try {
    const { type } = req.body;
    const settingKey = type === "favicon" ? "org_favicon" : "org_logo";

    const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadUrl);

    res.json({ uploadUrl, objectPath, settingKey });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/confirm-logo", async (req, res) => {
  try {
    const { objectPath, settingKey } = req.body;
    if (!objectPath || !settingKey) {
      res.status(400).json({ error: "objectPath e settingKey são obrigatórios" });
      return;
    }

    const normalizedPath = objectPath.startsWith("/") ? objectPath : `/${objectPath}`;
    const storagePath = `/api/storage${normalizedPath}`;

    const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, settingKey)).limit(1);
    if (existing.length > 0) {
      await db.update(settingsTable).set({ value: storagePath, updatedAt: new Date() }).where(eq(settingsTable.key, settingKey));
    } else {
      await db.insert(settingsTable).values({ key: settingKey, value: storagePath });
    }

    res.json({ path: storagePath });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
