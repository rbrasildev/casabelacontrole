import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";

const VALID_ROLES = ["admin", "manager", "staff", "viewer"];

const router = Router();

router.use(requireRole("admin", "manager"));

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    profileImageUrl: u.profileImageUrl,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}

router.post("/", requireRole("admin"), async (req, res): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "E-mail e senha são obrigatórios" });
      return;
    }

    if (typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "E-mail inválido" });
      return;
    }

    if (typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
      return;
    }

    if (role && !VALID_ROLES.includes(role)) {
      res.status(400).json({ error: "Cargo inválido" });
      return;
    }

    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Este e-mail já está cadastrado" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db
      .insert(usersTable)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        role: role || "viewer",
      })
      .returning();

    res.status(201).json(formatUser(user));
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const users = await db
      .select()
      .from(usersTable)
      .orderBy(usersTable.createdAt);
    res.json(users.map(formatUser));
  } catch (err) {
    console.error("Error listing users:", err);
    res.status(500).json({ error: "Erro ao listar usuários" });
  }
});

router.get("/:id", async (req, res): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.params.id))
      .limit(1);

    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json(formatUser(user));
  } catch (err) {
    console.error("Error getting user:", err);
    res.status(500).json({ error: "Erro ao buscar usuário" });
  }
});

router.put("/:id", async (req, res): Promise<void> => {
  try {
    const { role, isActive, firstName, lastName, email } = req.body;
    const updates: Record<string, unknown> = {};

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        res.status(400).json({ error: "Cargo inválido" });
        return;
      }
      updates.role = role;
    }
    if (typeof isActive === "boolean") updates.isActive = isActive;
    if (typeof firstName === "string" || firstName === null) updates.firstName = firstName;
    if (typeof lastName === "string" || lastName === null) updates.lastName = lastName;
    if (typeof email === "string" || email === null) updates.email = email;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Nenhum campo para atualizar" });
      return;
    }

    const [user] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, req.params.id))
      .returning();

    if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json(formatUser(user));
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
});

router.delete("/:id", async (req, res): Promise<void> => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: "Não é possível excluir sua própria conta" });
      return;
    }

    const [deleted] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, req.params.id))
      .returning();

    if (!deleted) { res.status(404).json({ error: "Usuário não encontrado" }); return; }
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Erro ao excluir usuário" });
  }
});

export default router;
