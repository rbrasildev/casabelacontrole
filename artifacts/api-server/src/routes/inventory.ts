import { Router, type IRouter } from "express";
import { db, inventoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const results = await db.select().from(inventoryTable).orderBy(inventoryTable.name);
    res.json(
      results.map((r) => ({
        ...r,
        lastUpdated: r.lastUpdated.toISOString(),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const [created] = await db
      .insert(inventoryTable)
      .values({
        name: body.name,
        category: body.category,
        quantity: body.quantity,
        unit: body.unit,
        minimumQuantity: body.minimumQuantity,
        location: body.location ?? null,
        notes: body.notes ?? null,
      })
      .returning();

    res.status(201).json({
      ...created,
      lastUpdated: created.lastUpdated.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body;
    const [updated] = await db
      .update(inventoryTable)
      .set({
        name: body.name,
        category: body.category,
        quantity: body.quantity,
        unit: body.unit,
        minimumQuantity: body.minimumQuantity,
        location: body.location ?? null,
        notes: body.notes ?? null,
        lastUpdated: new Date(),
      })
      .where(eq(inventoryTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      ...updated,
      lastUpdated: updated.lastUpdated.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(inventoryTable).where(eq(inventoryTable.id, id));
    res.json({ success: true, message: "Item excluído com sucesso" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
