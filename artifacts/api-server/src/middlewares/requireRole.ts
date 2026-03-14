import { type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    const userId = req.user!.id;
    const [user] = await db
      .select({ role: usersTable.role, isActive: usersTable.isActive })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user || !user.isActive) {
      res.status(403).json({ error: "Conta desativada" });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }

    next();
  };
}
