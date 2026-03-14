import { Router, type IRouter } from "express";
import { db, residentsTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { status, search } = req.query as { status?: string; search?: string };
    let results = await db.select().from(residentsTable).orderBy(residentsTable.name);

    if (status && status !== "all") {
      results = results.filter((r) => r.status === status);
    }
    if (search) {
      const s = search.toLowerCase();
      results = results.filter(
        (r) =>
          r.name.toLowerCase().includes(s) ||
          r.cpf.includes(s) ||
          (r.room && r.room.toLowerCase().includes(s))
      );
    }

    const mapped = results.map((r) => ({
      id: r.id,
      name: r.name,
      cpf: r.cpf,
      dateOfBirth: r.dateOfBirth,
      phone: r.phone,
      emergencyContact: r.emergencyContact,
      emergencyPhone: r.emergencyPhone,
      entryDate: r.entryDate,
      exitDate: r.exitDate ?? null,
      status: r.status,
      room: r.room ?? null,
      monthlyFee: Number(r.monthlyFee),
      notes: r.notes ?? null,
      createdAt: r.createdAt.toISOString(),
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
      .insert(residentsTable)
      .values({
        name: body.name,
        cpf: body.cpf,
        dateOfBirth: body.dateOfBirth,
        phone: body.phone,
        emergencyContact: body.emergencyContact,
        emergencyPhone: body.emergencyPhone,
        entryDate: body.entryDate,
        exitDate: body.exitDate ?? null,
        status: body.status ?? "active",
        room: body.room ?? null,
        monthlyFee: String(body.monthlyFee),
        notes: body.notes ?? null,
      })
      .returning();

    res.status(201).json({
      ...created,
      monthlyFee: Number(created.monthlyFee),
      exitDate: created.exitDate ?? null,
      room: created.room ?? null,
      notes: created.notes ?? null,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [resident] = await db.select().from(residentsTable).where(eq(residentsTable.id, id));
    if (!resident) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({
      ...resident,
      monthlyFee: Number(resident.monthlyFee),
      exitDate: resident.exitDate ?? null,
      room: resident.room ?? null,
      notes: resident.notes ?? null,
      createdAt: resident.createdAt.toISOString(),
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
      .update(residentsTable)
      .set({
        name: body.name,
        cpf: body.cpf,
        dateOfBirth: body.dateOfBirth,
        phone: body.phone,
        emergencyContact: body.emergencyContact,
        emergencyPhone: body.emergencyPhone,
        entryDate: body.entryDate,
        exitDate: body.exitDate ?? null,
        status: body.status,
        room: body.room ?? null,
        monthlyFee: String(body.monthlyFee),
        notes: body.notes ?? null,
      })
      .where(eq(residentsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      ...updated,
      monthlyFee: Number(updated.monthlyFee),
      exitDate: updated.exitDate ?? null,
      room: updated.room ?? null,
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
    await db.delete(residentsTable).where(eq(residentsTable.id, id));
    res.json({ success: true, message: "Residente excluído com sucesso" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
