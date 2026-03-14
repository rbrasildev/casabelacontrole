import { Router, type IRouter } from "express";
import { db, financesTable, residentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { type, month, year } = req.query as { type?: string; month?: string; year?: string };

    let results = await db
      .select({
        finance: financesTable,
        residentName: residentsTable.name,
      })
      .from(financesTable)
      .leftJoin(residentsTable, eq(financesTable.residentId, residentsTable.id))
      .orderBy(financesTable.date);

    if (type && type !== "all") {
      results = results.filter((r) => r.finance.type === type);
    }
    if (month) {
      results = results.filter((r) => {
        const d = new Date(r.finance.date + "T00:00:00");
        return d.getMonth() + 1 === Number(month);
      });
    }
    if (year) {
      results = results.filter((r) => {
        const d = new Date(r.finance.date + "T00:00:00");
        return d.getFullYear() === Number(year);
      });
    }

    const mapped = results.map(({ finance, residentName }) => ({
      id: finance.id,
      type: finance.type,
      category: finance.category,
      description: finance.description,
      amount: Number(finance.amount),
      date: finance.date,
      residentId: finance.residentId ?? null,
      residentName: residentName ?? null,
      paymentMethod: finance.paymentMethod ?? null,
      status: finance.status,
      notes: finance.notes ?? null,
      createdAt: finance.createdAt.toISOString(),
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
      .insert(financesTable)
      .values({
        type: body.type,
        category: body.category,
        description: body.description,
        amount: String(body.amount),
        date: body.date,
        residentId: body.residentId ?? null,
        paymentMethod: body.paymentMethod ?? null,
        status: body.status,
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
      amount: Number(created.amount),
      residentId: created.residentId ?? null,
      residentName,
      paymentMethod: created.paymentMethod ?? null,
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
      .update(financesTable)
      .set({
        type: body.type,
        category: body.category,
        description: body.description,
        amount: String(body.amount),
        date: body.date,
        residentId: body.residentId ?? null,
        paymentMethod: body.paymentMethod ?? null,
        status: body.status,
        notes: body.notes ?? null,
      })
      .where(eq(financesTable.id, id))
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
      amount: Number(updated.amount),
      residentId: updated.residentId ?? null,
      residentName,
      paymentMethod: updated.paymentMethod ?? null,
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
    await db.delete(financesTable).where(eq(financesTable.id, id));
    res.json({ success: true, message: "Transação excluída com sucesso" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
