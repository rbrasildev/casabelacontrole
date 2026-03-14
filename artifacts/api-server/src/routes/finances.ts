import { Router, type IRouter } from "express";
import { db, financesTable, residentsTable, recurringExpensesTable } from "@workspace/db";
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
      receiptPath: finance.receiptPath ?? null,
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
        receiptPath: body.receiptPath ?? null,
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
      receiptPath: created.receiptPath ?? null,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/recurring", async (_req, res) => {
  try {
    const items = await db.select().from(recurringExpensesTable).orderBy(recurringExpensesTable.description);
    res.json(items.map((r) => ({
      id: r.id,
      category: r.category,
      description: r.description,
      amount: Number(r.amount),
      dayOfMonth: r.dayOfMonth,
      active: r.active,
      notes: r.notes ?? null,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/recurring", async (req, res) => {
  try {
    const body = req.body;
    const [created] = await db.insert(recurringExpensesTable).values({
      category: body.category,
      description: body.description,
      amount: String(body.amount),
      dayOfMonth: body.dayOfMonth ?? 1,
      active: body.active ?? true,
      notes: body.notes ?? null,
    }).returning();
    res.status(201).json({
      ...created,
      amount: Number(created.amount),
      notes: created.notes ?? null,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/recurring/generate", async (req, res) => {
  try {
    const { month, year } = req.body as { month: number; year: number };
    if (!month || !year) { res.status(400).json({ error: "month and year required" }); return; }

    const actives = await db.select().from(recurringExpensesTable).where(eq(recurringExpensesTable.active, true));
    const created = [];

    for (const r of actives) {
      const day = Math.min(r.dayOfMonth, new Date(year, month, 0).getDate());
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const [t] = await db.insert(financesTable).values({
        type: "expense",
        category: r.category,
        description: `${r.description} (Fixa)`,
        amount: r.amount,
        date: dateStr,
        status: "pending",
        notes: r.notes ?? null,
      }).returning();
      created.push(t);
    }

    res.json({ generated: created.length, message: `${created.length} despesa(s) fixa(s) gerada(s) para ${String(month).padStart(2, "0")}/${year}` });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/recurring/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body;
    const [updated] = await db.update(recurringExpensesTable).set({
      category: body.category,
      description: body.description,
      amount: String(body.amount),
      dayOfMonth: body.dayOfMonth ?? 1,
      active: body.active ?? true,
      notes: body.notes ?? null,
    }).where(eq(recurringExpensesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({
      ...updated,
      amount: Number(updated.amount),
      notes: updated.notes ?? null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/recurring/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(recurringExpensesTable).where(eq(recurringExpensesTable.id, id));
    res.json({ success: true });
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
        receiptPath: body.receiptPath ?? null,
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
      receiptPath: updated.receiptPath ?? null,
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
