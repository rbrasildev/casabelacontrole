import { Router, type IRouter } from "express";
import { db, campaignsTable, contributionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

async function getCampaignWithStats(id: number) {
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
  if (!campaign) return null;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contributionsTable)
    .where(eq(contributionsTable.campaignId, id));

  const goalAmount = Number(campaign.goalAmount);
  const currentAmount = Number(campaign.currentAmount);
  const progressPercent = goalAmount > 0 ? Math.min(100, Math.round((currentAmount / goalAmount) * 100)) : 0;

  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description ?? null,
    goalAmount,
    currentAmount,
    progressPercent,
    status: campaign.status,
    startDate: campaign.startDate,
    endDate: campaign.endDate ?? null,
    pixKey: campaign.pixKey ?? null,
    contributionsCount: count,
    createdAt: campaign.createdAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  try {
    const campaigns = await db.select().from(campaignsTable).orderBy(sql`${campaignsTable.createdAt} DESC`);

    const result = await Promise.all(campaigns.map((c) => getCampaignWithStats(c.id)));
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const [created] = await db
      .insert(campaignsTable)
      .values({
        title: body.title,
        description: body.description ?? null,
        goalAmount: String(body.goalAmount),
        currentAmount: "0",
        status: body.status ?? "active",
        startDate: body.startDate,
        endDate: body.endDate ?? null,
        pixKey: body.pixKey ?? null,
      })
      .returning();

    const result = await getCampaignWithStats(created.id);
    res.status(201).json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const campaign = await getCampaignWithStats(id);
    if (!campaign) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(campaign);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body;
    const [updated] = await db
      .update(campaignsTable)
      .set({
        title: body.title,
        description: body.description ?? null,
        goalAmount: String(body.goalAmount),
        status: body.status,
        startDate: body.startDate,
        endDate: body.endDate ?? null,
        pixKey: body.pixKey ?? null,
      })
      .where(eq(campaignsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const result = await getCampaignWithStats(id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(contributionsTable).where(eq(contributionsTable.campaignId, id));
    await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
    res.json({ success: true, message: "Campanha excluída com sucesso" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.get("/:id/contributions", async (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const contributions = await db
      .select()
      .from(contributionsTable)
      .where(eq(contributionsTable.campaignId, campaignId))
      .orderBy(sql`${contributionsTable.createdAt} DESC`);

    res.json(
      contributions.map((c) => ({
        id: c.id,
        campaignId: c.campaignId,
        contributorName: c.contributorName,
        contributorContact: c.contributorContact ?? null,
        amount: Number(c.amount),
        paymentMethod: c.paymentMethod ?? null,
        notes: c.notes ?? null,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.post("/:id/contributions", async (req, res) => {
  try {
    const campaignId = Number(req.params.id);
    const body = req.body;

    const [created] = await db
      .insert(contributionsTable)
      .values({
        campaignId,
        contributorName: body.contributorName,
        contributorContact: body.contributorContact ?? null,
        amount: String(body.amount),
        paymentMethod: body.paymentMethod ?? null,
        notes: body.notes ?? null,
      })
      .returning();

    await db
      .update(campaignsTable)
      .set({
        currentAmount: sql`${campaignsTable.currentAmount} + ${String(body.amount)}`,
      })
      .where(eq(campaignsTable.id, campaignId));

    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, campaignId));
    if (campaign && Number(campaign.currentAmount) >= Number(campaign.goalAmount)) {
      await db
        .update(campaignsTable)
        .set({ status: "completed" })
        .where(eq(campaignsTable.id, campaignId));
    }

    res.status(201).json({
      id: created.id,
      campaignId: created.campaignId,
      contributorName: created.contributorName,
      contributorContact: created.contributorContact ?? null,
      amount: Number(created.amount),
      paymentMethod: created.paymentMethod ?? null,
      notes: created.notes ?? null,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

router.delete("/contributions/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [contribution] = await db
      .select()
      .from(contributionsTable)
      .where(eq(contributionsTable.id, id));

    if (contribution) {
      await db
        .update(campaignsTable)
        .set({
          currentAmount: sql`GREATEST(0, ${campaignsTable.currentAmount} - ${String(contribution.amount)})`,
        })
        .where(eq(campaignsTable.id, contribution.campaignId));
    }

    await db.delete(contributionsTable).where(eq(contributionsTable.id, id));
    res.json({ success: true, message: "Contribuição excluída com sucesso" });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;
