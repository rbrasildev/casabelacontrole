import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  clearSession,
  getSessionId,
  createSession,
  setSessionCookie,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

router.get("/auth/user", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.json({ user: null });
    return;
  }

  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.id))
    .limit(1);

  if (!dbUser) {
    res.json({ user: null });
    return;
  }

  res.json({
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      role: dbUser.role,
    },
  });
});

router.get("/auth/me", async (req: Request, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.id))
    .limit(1);

  if (!dbUser) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  res.json({
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    profileImageUrl: dbUser.profileImageUrl,
    role: dbUser.role,
    isActive: dbUser.isActive,
  });
});

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "E-mail e senha são obrigatórios" });
      return;
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "E-mail ou senha incorretos" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Conta desativada. Contate o administrador." });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "E-mail ou senha incorretos" });
      return;
    }

    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
    };

    const sid = await createSession(sessionData);
    setSessionCookie(res, sid);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

export default router;
