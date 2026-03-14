import { Router, type IRouter } from "express";
import { db, notificationsTable, inventoryTable, financesTable } from "@workspace/db";
import { eq, desc, and, sql, lte } from "drizzle-orm";

const router: IRouter = Router();

async function generateAutoNotifications(userId?: string) {
  const notifications: Array<{
    type: string;
    title: string;
    message: string;
    icon: string;
    link: string;
  }> = [];

  try {
    const lowStockItems = await db
      .select()
      .from(inventoryTable)
      .where(sql`${inventoryTable.quantity} <= ${inventoryTable.minimumQuantity}`);

    if (lowStockItems.length > 0) {
      notifications.push({
        type: "low_stock",
        title: "Estoque Baixo",
        message: `${lowStockItems.length} item(ns) abaixo do estoque mínimo: ${lowStockItems.slice(0, 3).map(i => i.name).join(", ")}${lowStockItems.length > 3 ? "..." : ""}`,
        icon: "package",
        link: "/estoque",
      });
    }

    const pendingTransactions = await db
      .select({ count: sql<number>`count(*)` })
      .from(financesTable)
      .where(eq(financesTable.status, "pending"));

    const pendingCount = Number(pendingTransactions[0]?.count || 0);
    if (pendingCount > 0) {
      notifications.push({
        type: "pending_payments",
        title: "Pagamentos Pendentes",
        message: `Existem ${pendingCount} transação(ões) pendente(s) que precisam de atenção.`,
        icon: "wallet",
        link: "/financeiro",
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const overdueTransactions = await db
      .select({ count: sql<number>`count(*)` })
      .from(financesTable)
      .where(and(eq(financesTable.status, "pending"), lte(financesTable.date, today!)));

    const overdueCount = Number(overdueTransactions[0]?.count || 0);
    if (overdueCount > 0) {
      notifications.push({
        type: "overdue",
        title: "Transações Vencidas",
        message: `${overdueCount} transação(ões) pendente(s) já passaram da data prevista.`,
        icon: "alert-circle",
        link: "/financeiro",
      });
    }
  } catch (e) {
    console.error("Error generating auto notifications:", e);
  }

  return notifications;
}

router.get("/", async (req, res) => {
  try {
    const userId = (req as any).userId;

    const stored = await db
      .select()
      .from(notificationsTable)
      .where(userId ? eq(notificationsTable.userId, userId) : sql`${notificationsTable.userId} IS NULL`)
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    const auto = await generateAutoNotifications(userId);

    const autoNotifications = auto.map((n, i) => ({
      id: -(i + 1),
      ...n,
      userId: userId || null,
      read: false,
      createdAt: new Date().toISOString(),
      isAuto: true,
    }));

    const storedFormatted = stored.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
      isAuto: false,
    }));

    res.json([...autoNotifications, ...storedFormatted]);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/unread-count", async (req, res) => {
  try {
    const userId = (req as any).userId;
    const auto = await generateAutoNotifications(userId);

    const storedUnread = await db
      .select({ count: sql<number>`count(*)` })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.read, false),
          userId ? eq(notificationsTable.userId, userId) : sql`${notificationsTable.userId} IS NULL`
        )
      );

    const count = auto.length + Number(storedUnread[0]?.count || 0);
    res.json({ count });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/:id/read", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (id < 0) {
      res.json({ success: true });
      return;
    }
    const [updated] = await db
      .update(notificationsTable)
      .set({ read: true })
      .where(eq(notificationsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Notificação não encontrada" });
      return;
    }
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/read-all", async (req, res) => {
  try {
    const userId = (req as any).userId;
    await db
      .update(notificationsTable)
      .set({ read: true })
      .where(
        and(
          eq(notificationsTable.read, false),
          userId ? eq(notificationsTable.userId, userId) : sql`${notificationsTable.userId} IS NULL`
        )
      );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
