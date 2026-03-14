import { Router, type IRouter } from "express";
import { db, residentsTable, residentDocumentsTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";

const router: IRouter = Router();

function formatResident(r: typeof residentsTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    cpf: r.cpf,
    dateOfBirth: r.dateOfBirth,
    phone: r.phone,
    address: r.address ?? null,
    city: r.city ?? null,
    state: r.state ?? null,
    emergencyContact: r.emergencyContact,
    emergencyPhone: r.emergencyPhone,
    entryDate: r.entryDate,
    exitDate: r.exitDate ?? null,
    status: r.status,
    room: r.room ?? null,
    monthlyFee: Number(r.monthlyFee),
    notes: r.notes ?? null,
    photoUrl: r.photoUrl ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

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

    res.json(results.map(formatResident));
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
        address: body.address ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
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

    res.status(201).json(formatResident(created));
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
    res.json(formatResident(resident));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body;
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.cpf !== undefined) updateData.cpf = body.cpf;
    if (body.dateOfBirth !== undefined) updateData.dateOfBirth = body.dateOfBirth;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.address !== undefined) updateData.address = body.address ?? null;
    if (body.city !== undefined) updateData.city = body.city ?? null;
    if (body.state !== undefined) updateData.state = body.state ?? null;
    if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact;
    if (body.emergencyPhone !== undefined) updateData.emergencyPhone = body.emergencyPhone;
    if (body.entryDate !== undefined) updateData.entryDate = body.entryDate;
    if (body.exitDate !== undefined) updateData.exitDate = body.exitDate ?? null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.room !== undefined) updateData.room = body.room ?? null;
    if (body.monthlyFee !== undefined) updateData.monthlyFee = String(body.monthlyFee);
    if (body.notes !== undefined) updateData.notes = body.notes ?? null;
    if (body.photoUrl !== undefined) updateData.photoUrl = body.photoUrl ?? null;

    const [updated] = await db
      .update(residentsTable)
      .set(updateData)
      .where(eq(residentsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(formatResident(updated));
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

router.get("/:id/documents", async (req, res) => {
  try {
    const residentId = Number(req.params.id);
    const docs = await db
      .select()
      .from(residentDocumentsTable)
      .where(eq(residentDocumentsTable.residentId, residentId))
      .orderBy(residentDocumentsTable.createdAt);

    res.json(docs.map((d) => ({
      id: d.id,
      residentId: d.residentId,
      name: d.name,
      objectPath: d.objectPath,
      contentType: d.contentType,
      size: d.size ? Number(d.size) : null,
      createdAt: d.createdAt.toISOString(),
    })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/:id/documents", async (req, res) => {
  try {
    const residentId = Number(req.params.id);
    const { name, objectPath, contentType, size } = req.body;

    if (!name || !objectPath) {
      res.status(400).json({ error: "name and objectPath are required" });
      return;
    }

    const [doc] = await db
      .insert(residentDocumentsTable)
      .values({
        residentId,
        name,
        objectPath,
        contentType: contentType || null,
        size: size ? String(size) : null,
      })
      .returning();

    res.status(201).json({
      id: doc.id,
      residentId: doc.residentId,
      name: doc.name,
      objectPath: doc.objectPath,
      contentType: doc.contentType,
      size: doc.size ? Number(doc.size) : null,
      createdAt: doc.createdAt.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/:residentId/documents/:docId", async (req, res) => {
  try {
    const residentId = Number(req.params.residentId);
    const docId = Number(req.params.docId);

    const [doc] = await db
      .select()
      .from(residentDocumentsTable)
      .where(eq(residentDocumentsTable.id, docId))
      .limit(1);

    if (!doc || doc.residentId !== residentId) {
      res.status(404).json({ error: "Documento não encontrado" });
      return;
    }

    await db.delete(residentDocumentsTable).where(eq(residentDocumentsTable.id, docId));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
