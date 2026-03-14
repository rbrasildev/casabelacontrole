import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    const userId = req.user!.id;
    const [user] = await db
      .select({ role: usersTable.role, isActive: usersTable.isActive })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user || !user.isActive) {
      return res.status(403).json({ error: "Conta desativada" });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Sem permissão" });
    }

    next();
  };
}
