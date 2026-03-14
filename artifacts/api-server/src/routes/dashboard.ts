import { Router, type IRouter } from "express";
import { db, residentsTable, financesTable, inventoryTable, activitiesTable } from "@workspace/db";
import { eq, and, gte, lte, lt, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/stats", async (_req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const [allResidents, allFinances, allInventory, allActivities] = await Promise.all([
      db.select().from(residentsTable),
      db.select().from(financesTable).where(
        and(gte(financesTable.date, monthStart), lt(financesTable.date, nextMonth))
      ),
      db.select().from(inventoryTable),
      db.select().from(activitiesTable),
    ]);

    const activeResidents = allResidents.filter((r) => r.status === "active");
    const totalResidents = allResidents.length;

    const monthlyIncome = allFinances
      .filter((f) => f.type === "income" && f.status === "paid")
      .reduce((acc, f) => acc + Number(f.amount), 0);
    const monthlyExpenses = allFinances
      .filter((f) => f.type === "expense" && f.status === "paid")
      .reduce((acc, f) => acc + Number(f.amount), 0);
    const monthlyBalance = monthlyIncome - monthlyExpenses;

    const allFinancesAll = await db.select().from(financesTable);
    const pendingPayments = allFinancesAll.filter(
      (f) => f.status === "pending" || f.status === "overdue"
    ).length;

    const lowStockItems = allInventory.filter((i) => i.quantity <= i.minimumQuantity).length;

    const pendingActivities = allActivities.filter((a) => a.status === "pending").length;

    const recentFinances = await db
      .select({
        finance: financesTable,
        residentName: residentsTable.name,
      })
      .from(financesTable)
      .leftJoin(residentsTable, eq(financesTable.residentId, residentsTable.id))
      .orderBy(sql`${financesTable.createdAt} DESC`)
      .limit(5);

    const recentTransactions = recentFinances.map(({ finance, residentName }) => ({
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

    const today = now.toISOString().split("T")[0];
    const upcomingActivitiesRaw = await db
      .select({
        activity: activitiesTable,
        residentName: residentsTable.name,
      })
      .from(activitiesTable)
      .leftJoin(residentsTable, eq(activitiesTable.residentId, residentsTable.id))
      .where(and(gte(activitiesTable.scheduledDate, today), eq(activitiesTable.status, "pending")))
      .orderBy(activitiesTable.scheduledDate)
      .limit(5);

    const upcomingActivities = upcomingActivitiesRaw.map(({ activity, residentName }) => ({
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

    res.json({
      totalResidents,
      activeResidents: activeResidents.length,
      monthlyIncome,
      monthlyExpenses,
      monthlyBalance,
      pendingPayments,
      lowStockItems,
      pendingActivities,
      recentTransactions,
      upcomingActivities,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
