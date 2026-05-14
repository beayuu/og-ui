import type { Express } from "express";
import { type Server } from "http";
import { setupAuth, requireAuth, requireAdmin } from "./auth";
import { storage } from "./storage";
import {
  insertCoralSchema,
  updateCoralSchema,
  insertDonationSchema,
  insertVolunteerWorkSchema,
  updateVolunteerWorkSchema,
  adoptionRequestSchema,
} from "@shared/schema";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);

  // ----------------- Public coral catalog -----------------
  app.get("/api/corals", async (_req, res, next) => {
    try {
      const corals = await storage.getAllCorals();
      res.json(corals);
    } catch (err) {
      next(err);
    }
  });

  // ----------------- User adoptions -----------------
  app.get("/api/adoptions", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const adoptions = await storage.getAdoptionsByUserId(userId);
      res.json(adoptions);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/adoptions", requireAuth, async (req, res, next) => {
    try {
      const parsed = adoptionRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
      }
      const userId = req.session.userId!;
      const result = await storage.createAdoption(userId, parsed.data.coralId, parsed.data.amount);
      if (!result.ok) {
        if (result.reason === "not_found") {
          return res.status(404).json({ message: "Coral not found" });
        }
        return res.status(400).json({ message: "Not enough stock available for that amount" });
      }
      res.status(201).json(result.adoption);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/adoptions/:id", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const ok = await storage.deleteAdoption(userId, String(req.params.id));
      if (!ok) return res.status(404).json({ message: "Adoption not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // ----------------- Donations -----------------
  app.get("/api/donations", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const donations = await storage.getDonationsByUserId(userId);
      res.json(donations);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/donations", requireAuth, async (req, res, next) => {
    try {
      const parsed = insertDonationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
      }
      const userId = req.session.userId!;
      const donation = await storage.createDonation(userId, parsed.data);
      res.status(201).json(donation);
    } catch (err) {
      next(err);
    }
  });

  // ----------------- Public volunteer endpoints -----------------
  app.get("/api/volunteer-works", async (_req, res, next) => {
    try {
      const works = await storage.getAllVolunteerWorks();
      const counts = await storage.getSignupCountsByWorkId();
      res.json(works.map((w) => ({ ...w, volunteerCount: counts[w.id] ?? 0 })));
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/volunteer-works/:id/signup", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const work = await storage.getVolunteerWork(String(req.params.id));
      if (!work) return res.status(404).json({ message: "Work not found" });
      if (work.status !== "open") {
        return res.status(400).json({ message: "This opportunity is no longer open for sign-ups" });
      }
      const signup = await storage.createVolunteerSignup(userId, work.id);
      if (!signup) {
        return res.status(400).json({ message: "This opportunity is full" });
      }
      res.status(201).json(signup);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/volunteer-works/:id/signup", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const ok = await storage.deleteVolunteerSignup(userId, String(req.params.id));
      if (!ok) return res.status(404).json({ message: "Signup not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/volunteer-signups", requireAuth, async (req, res, next) => {
    try {
      const userId = req.session.userId!;
      const signups = await storage.getSignupsByUserId(userId);
      const works = await storage.getAllVolunteerWorks();
      const workById = new Map(works.map((w) => [w.id, w]));
      res.json(
        signups
          .map((s) => {
            const work = workById.get(s.workId);
            if (!work) return null;
            return { ...s, work };
          })
          .filter(Boolean),
      );
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/expense-breakdown", async (_req, res, next) => {
    try {
      const breakdown = await storage.getExpenseBreakdown();
      res.json(breakdown);
    } catch (err) {
      next(err);
    }
  });

  // ----------------- Admin: corals -----------------
  app.post("/api/admin/corals", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertCoralSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
      }
      const coral = await storage.createCoral(parsed.data);
      res.status(201).json(coral);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/admin/corals/:id", requireAdmin, async (req, res, next) => {
    try {
      const parsed = updateCoralSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
      }
      const updated = await storage.updateCoral(String(req.params.id), parsed.data);
      if (!updated) return res.status(404).json({ message: "Coral not found" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/admin/corals/:id", requireAdmin, async (req, res, next) => {
    try {
      const ok = await storage.deleteCoral(String(req.params.id));
      if (!ok) return res.status(404).json({ message: "Coral not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // ----------------- Admin: volunteer works -----------------
  app.post("/api/admin/volunteer-works", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertVolunteerWorkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
      }
      const work = await storage.createVolunteerWork(parsed.data);
      res.status(201).json(work);
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/admin/volunteer-works/:id", requireAdmin, async (req, res, next) => {
    try {
      const parsed = updateVolunteerWorkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });
      }
      const updated = await storage.updateVolunteerWork(String(req.params.id), parsed.data);
      if (!updated) return res.status(404).json({ message: "Volunteer work not found" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.delete("/api/admin/volunteer-works/:id", requireAdmin, async (req, res, next) => {
    try {
      const ok = await storage.deleteVolunteerWork(String(req.params.id));
      if (!ok) return res.status(404).json({ message: "Volunteer work not found" });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // ----------------- Admin: data views -----------------
  app.get("/api/admin/adoptions", requireAdmin, async (_req, res, next) => {
    try {
      const adoptions = await storage.getAllAdoptions();
      const users = await storage.getAllUsers();
      const userById = new Map(users.map((u) => [u.id, u]));
      res.json(
        adoptions.map((a) => ({
          ...a,
          username: userById.get(a.userId)?.username ?? "Unknown",
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/donations", requireAdmin, async (_req, res, next) => {
    try {
      const donations = await storage.getAllDonations();
      const users = await storage.getAllUsers();
      const userById = new Map(users.map((u) => [u.id, u]));
      res.json(
        donations.map((d) => ({
          ...d,
          username: userById.get(d.userId)?.username ?? "Unknown",
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      const adoptions = await storage.getAllAdoptions();
      const donations = await storage.getAllDonations();
      const signups = await Promise.all(
        users.map((u) => storage.getSignupsByUserId(u.id)),
      );
      res.json(
        users.map((u, i) => {
          const userAdoptions = adoptions.filter((a) => a.userId === u.id);
          const userDonations = donations.filter((d) => d.userId === u.id);
          return {
            id: u.id,
            username: u.username,
            isAdmin: u.isAdmin,
            adoptionCount: userAdoptions.length,
            donationTotal: userDonations.reduce((s, d) => s + d.amount, 0),
            volunteerShifts: signups[i].length,
          };
        }),
      );
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/volunteer-signups", requireAdmin, async (_req, res, next) => {
    try {
      const works = await storage.getAllVolunteerWorks();
      const counts = await storage.getSignupCountsByWorkId();
      const users = await storage.getAllUsers();
      const userSignups = await Promise.all(users.map((u) => storage.getSignupsByUserId(u.id)));
      const allSignups = userSignups.flat();
      const workById = new Map(works.map((w) => [w.id, w]));
      const userById = new Map(users.map((u) => [u.id, u]));
      res.json(
        allSignups.map((s) => ({
          ...s,
          username: userById.get(s.userId)?.username ?? "Unknown",
          workTitle: workById.get(s.workId)?.title ?? "Unknown",
        })),
      );
    } catch (err) {
      next(err);
    }
  });

  return httpServer;
}
