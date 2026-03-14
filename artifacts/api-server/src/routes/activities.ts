import { Router, type IRouter } from "express";
import { db, activitiesTable, residentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { status } = req.query as { status?: string };

    let results = await db
      .select({
        activity: activitiesTable,
        residentName: residentsTable.name,
      })
      .from(activitiesTable)
      .leftJoin(residentsTable, eq(activitiesTable.residentId, residentsTable.id))
      .orderBy(activitiesTable.scheduledDate);

    if (status && status !== "all") {
      results = results.filter((r) => r.activity.status === status);
    }

    const mapped = results.map(({ activity, residentName }) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description ?? null,
      type: activity.type,
      status: activity.status,
      scheduledDate: activity.scheduledDate,
      scheduledTime: activity.scheduledTime ?? null,
      responsible: activity.responsible ?? null,
      residentId: activity.residentId ?? null,
      residentName: residentName ?? null,
      notes: activity.notes ?? null,
      createdAt: activity.createdAt.toISOString(),
    }));

    res.json(mapped);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const [created] = await db
      .insert(activitiesTable)
      .values({
        title: body.title,
        description: body.description ?? null,
        type: body.type,
        status: body.status ?? "pending",
        scheduledDate: body.scheduledDate,
        scheduledTime: body.scheduledTime ?? null,
        responsible: body.responsible ?? null,
        residentId: body.residentId ?? null,
        notes: body.notes ?? null,
      })
      .returning();

    let residentName: string | null = null;
    if (created.residentId) {
      const [res2] = await db
        .select({ name: residentsTable.name })
        .from(residentsTable)
        .where(eq(residentsTable.id, created.residentId));
      residentName = res2?.name ?? null;
    }

    res.status(201).json({
      ...created,
      residentName,
      description: created.description ?? null,
      scheduledTime: created.scheduledTime ?? null,
      responsible: created.responsible ?? null,
      residentId: created.residentId ?? null,
      notes: created.notes ?? null,
      createdAt: created.createdAt.toISOString(),
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
      .update(activitiesTable)
      .set({
        title: body.title,
        description: body.description ?? null,
        type: body.type,
        status: body.status,
        scheduledDate: body.scheduledDate,
        scheduledTime: body.scheduledTime ?? null,
        responsible: body.responsible ?? null,
        residentId: body.residentId ?? null,
        notes: body.notes ?? null,
      })
      .where(eq(activitiesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    let residentName: string | null = null;
    if (updated.residentId) {
      const [res2] = await db
        .select({ name: residentsTable.name })
        .from(residentsTable)
        .where(eq(residentsTable.id, updated.residentId));
      residentName = res2?.name ?? null;
    }

    res.json({
      ...updated,
      residentName,
      description: updated.description ?? null,
      scheduledTime: updated.scheduledTime ?? null,
      responsible: updated.responsible ?? null,
      residentId: updated.residentId ?? null,
      notes: updated.notes ?? null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(activitiesTable).where(eq(activitiesTable.id, id));
    res.json({ success: true, message: "Atividade excluída com sucesso" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
