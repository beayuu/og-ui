import {
  type User,
  type InsertUser,
  type Coral,
  type InsertCoral,
  type UpdateCoral,
  type Adoption,
  type Donation,
  type InsertDonation,
  type VolunteerWork,
  type InsertVolunteerWork,
  type UpdateVolunteerWork,
  type VolunteerSignup,
  EXPENSE_CATEGORIES,
  type ExpenseBreakdown,
} from "@shared/schema";
import { randomUUID } from "crypto";

export type AdoptionResult =
  | { ok: true; adoption: Adoption }
  | { ok: false; reason: "not_found" | "out_of_stock" };

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { isAdmin?: boolean }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;

  getAllCorals(): Promise<Coral[]>;
  getCoral(id: string): Promise<Coral | undefined>;
  createCoral(coral: InsertCoral): Promise<Coral>;
  updateCoral(id: string, updates: UpdateCoral): Promise<Coral | undefined>;
  deleteCoral(id: string): Promise<boolean>;

  createAdoption(userId: string, coralId: string, amount: number): Promise<AdoptionResult>;
  getAdoptionsByUserId(userId: string): Promise<Adoption[]>;
  getAllAdoptions(): Promise<Adoption[]>;
  deleteAdoption(userId: string, adoptionId: string): Promise<boolean>;
  deleteAdoptionById(adoptionId: string): Promise<boolean>;

  createDonation(userId: string, donation: InsertDonation): Promise<Donation>;
  getDonationsByUserId(userId: string): Promise<Donation[]>;
  getAllDonations(): Promise<Donation[]>;

  getAllVolunteerWorks(): Promise<VolunteerWork[]>;
  getVolunteerWork(id: string): Promise<VolunteerWork | undefined>;
  createVolunteerWork(work: InsertVolunteerWork): Promise<VolunteerWork>;
  updateVolunteerWork(id: string, updates: UpdateVolunteerWork): Promise<VolunteerWork | undefined>;
  deleteVolunteerWork(id: string): Promise<boolean>;

  createVolunteerSignup(userId: string, workId: string): Promise<VolunteerSignup | null>;
  deleteVolunteerSignup(userId: string, workId: string): Promise<boolean>;
  getSignupsByUserId(userId: string): Promise<VolunteerSignup[]>;
  getSignupCountsByWorkId(): Promise<Record<string, number>>;

  getExpenseBreakdown(): Promise<ExpenseBreakdown>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private corals: Map<string, Coral>;
  private adoptions: Map<string, Adoption>;
  private donations: Map<string, Donation>;
  private volunteerWorks: Map<string, VolunteerWork>;
  private volunteerSignups: Map<string, VolunteerSignup>;

  constructor() {
    this.users = new Map();
    this.corals = new Map();
    this.adoptions = new Map();
    this.donations = new Map();
    this.volunteerWorks = new Map();
    this.volunteerSignups = new Map();
    this.seedCorals();
    this.seedVolunteerWorks();
  }

  private seedCorals() {
    const seed: InsertCoral[] = [
      {
        name: "Staghorn Coral",
        image: "/figmaAssets/adopt/coral-1.jpg",
        description: "Fast-growing branching coral that builds the reef's structural backbone.",
        price: 50,
        stock: 25,
      },
      {
        name: "Brain Coral",
        image: "/figmaAssets/adopt/coral-2.jpg",
        description: "Slow-growing dome coral known for its grooved, brain-like surface.",
        price: 75,
        stock: 15,
      },
      {
        name: "Elkhorn Coral",
        image: "/figmaAssets/adopt/coral-3.jpg",
        description: "Critically endangered shallow-water coral with broad, antler-like branches.",
        price: 90,
        stock: 10,
      },
    ];
    for (const c of seed) {
      const id = randomUUID();
      this.corals.set(id, { id, ...c });
    }
  }

  private seedVolunteerWorks() {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const seed: Array<Omit<VolunteerWork, "id">> = [
      {
        title: "Reef Cleanup Dive — Maui",
        description: "Join certified divers to remove ghost nets and debris from a reef site off Maui's southern coast.",
        location: "Maui, Hawaii",
        scheduledFor: new Date(now + 14 * day),
        endDate: new Date(now + 14 * day + 6 * 60 * 60 * 1000),
        hours: 6,
        status: "open",
        category: "cleanup",
        maxVolunteers: 20,
      },
      {
        title: "Coral Nursery Maintenance",
        description: "Help clean nursery trees, monitor growth, and prep coral fragments for outplanting.",
        location: "Key Largo, Florida",
        scheduledFor: new Date(now + 21 * day),
        endDate: null,
        hours: 4,
        status: "open",
        category: "replanting",
        maxVolunteers: 15,
      },
      {
        title: "Beach Plastic Pickup",
        description: "A morning shoreline cleanup focused on microplastics. Gloves and bags provided.",
        location: "Santa Monica, California",
        scheduledFor: new Date(now + 7 * day),
        endDate: null,
        hours: 3,
        status: "open",
        category: "cleanup",
        maxVolunteers: 30,
      },
      {
        title: "Mangrove Replanting Day",
        description: "Restore the coastal mangrove buffer that protects nearby reefs from runoff.",
        location: "Tampa Bay, Florida",
        scheduledFor: new Date(now + 30 * day),
        endDate: new Date(now + 31 * day),
        hours: 5,
        status: "open",
        category: "replanting",
        maxVolunteers: 25,
      },
      {
        title: "School Outreach Workshop",
        description: "We taught 120 students about coral biology and reef-safe sunscreen.",
        location: "San Diego, California",
        scheduledFor: new Date(now - 12 * day),
        endDate: null,
        hours: 4,
        status: "completed",
        category: "outreach",
        maxVolunteers: null,
      },
      {
        title: "Reef Survey — Great Barrier",
        description: "Volunteers logged bleaching observations across three reef sites.",
        location: "Cairns, Australia",
        scheduledFor: new Date(now - 28 * day),
        endDate: new Date(now - 25 * day),
        hours: 8,
        status: "completed",
        category: "survey",
        maxVolunteers: null,
      },
    ];
    for (const work of seed) {
      const id = randomUUID();
      this.volunteerWorks.set(id, { ...work, id });
    }
  }

  private autoUpdateWorkStatus(work: VolunteerWork, signupCount: number): VolunteerWork {
    const now = new Date();
    const endTime = work.endDate ?? work.scheduledFor;
    // Auto-complete if event date is past and not already completed/cancelled
    if (endTime < now && work.status !== "completed" && work.status !== "cancelled") {
      const updated = { ...work, status: "completed" as const };
      this.volunteerWorks.set(work.id, updated);
      return updated;
    }
    // Auto-close signups if maxVolunteers reached
    if (
      work.maxVolunteers != null &&
      signupCount >= work.maxVolunteers &&
      work.status === "open"
    ) {
      const updated = { ...work, status: "closed" as const };
      this.volunteerWorks.set(work.id, updated);
      return updated;
    }
    return work;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser & { isAdmin?: boolean }): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      isAdmin: insertUser.isAdmin ?? false,
      firstName: insertUser.firstName ?? null,
      lastName: insertUser.lastName ?? null,
      email: insertUser.email || null,
    };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => a.username.localeCompare(b.username));
  }

  async setUserAdmin(userId: string, isAdmin: boolean): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updated: User = { ...user, isAdmin };
    this.users.set(userId, updated);
    return updated;
  }

  async deleteUser(userId: string): Promise<boolean> {
    if (!this.users.has(userId)) return false;
    Array.from(this.adoptions.entries()).forEach(([aid, a]) => {
      if (a.userId === userId) this.adoptions.delete(aid);
    });
    Array.from(this.donations.entries()).forEach(([did, d]) => {
      if (d.userId === userId) this.donations.delete(did);
    });
    Array.from(this.volunteerSignups.entries()).forEach(([sid, s]) => {
      if (s.userId === userId) this.volunteerSignups.delete(sid);
    });
    return this.users.delete(userId);
  }

  async getAllCorals(): Promise<Coral[]> {
    return Array.from(this.corals.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCoral(id: string): Promise<Coral | undefined> {
    return this.corals.get(id);
  }

  async createCoral(insert: InsertCoral): Promise<Coral> {
    const id = randomUUID();
    const coral: Coral = { id, ...insert, description: insert.description ?? "" };
    this.corals.set(id, coral);
    return coral;
  }

  async updateCoral(id: string, updates: UpdateCoral): Promise<Coral | undefined> {
    const existing = this.corals.get(id);
    if (!existing) return undefined;
    const merged: Coral = { ...existing, ...updates };
    this.corals.set(id, merged);
    return merged;
  }

  async deleteCoral(id: string): Promise<boolean> {
    return this.corals.delete(id);
  }

  async createAdoption(userId: string, coralId: string, amount: number): Promise<AdoptionResult> {
    const coral = this.corals.get(coralId);
    if (!coral) return { ok: false, reason: "not_found" };
    if (coral.stock < amount) return { ok: false, reason: "out_of_stock" };
    this.corals.set(coralId, { ...coral, stock: coral.stock - amount });
    const id = randomUUID();
    const adoption: Adoption = {
      id,
      userId,
      coralId: coral.id,
      coralName: coral.name,
      coralImage: coral.image,
      amount,
      price: coral.price,
      adoptedAt: new Date(),
    };
    this.adoptions.set(id, adoption);
    return { ok: true, adoption };
  }

  async getAdoptionsByUserId(userId: string): Promise<Adoption[]> {
    return Array.from(this.adoptions.values())
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.adoptedAt.getTime() - a.adoptedAt.getTime());
  }

  async getAllAdoptions(): Promise<Adoption[]> {
    return Array.from(this.adoptions.values()).sort(
      (a, b) => b.adoptedAt.getTime() - a.adoptedAt.getTime(),
    );
  }

  async deleteAdoption(userId: string, adoptionId: string): Promise<boolean> {
    const adoption = this.adoptions.get(adoptionId);
    if (!adoption || adoption.userId !== userId) return false;
    return this.adoptions.delete(adoptionId);
  }

  async deleteAdoptionById(adoptionId: string): Promise<boolean> {
    return this.adoptions.delete(adoptionId);
  }

  async createDonation(userId: string, insertDonation: InsertDonation): Promise<Donation> {
    const id = randomUUID();
    const donation: Donation = {
      ...insertDonation,
      id,
      userId,
      donorName: insertDonation.donorName ?? null,
      donorEmail: insertDonation.donorEmail || null,
      donatedAt: new Date(),
    };
    this.donations.set(id, donation);
    return donation;
  }

  async getDonationsByUserId(userId: string): Promise<Donation[]> {
    return Array.from(this.donations.values())
      .filter((d) => d.userId === userId)
      .sort((a, b) => b.donatedAt.getTime() - a.donatedAt.getTime());
  }

  async getAllDonations(): Promise<Donation[]> {
    return Array.from(this.donations.values()).sort(
      (a, b) => b.donatedAt.getTime() - a.donatedAt.getTime(),
    );
  }

  async getAllVolunteerWorks(): Promise<VolunteerWork[]> {
    const counts = await this.getSignupCountsByWorkId();
    const order = (s: string) =>
      s === "open" ? 0 : s === "ongoing" ? 1 : s === "closed" ? 2 : s === "completed" ? 3 : 4;
    return Array.from(this.volunteerWorks.values())
      .map((w) => this.autoUpdateWorkStatus(w, counts[w.id] ?? 0))
      .sort((a, b) => {
        if (a.status !== b.status) return order(a.status) - order(b.status);
        return a.scheduledFor.getTime() - b.scheduledFor.getTime();
      });
  }

  async getVolunteerWork(id: string): Promise<VolunteerWork | undefined> {
    return this.volunteerWorks.get(id);
  }

  async createVolunteerWork(insert: InsertVolunteerWork): Promise<VolunteerWork> {
    const id = randomUUID();
    const work: VolunteerWork = {
      id,
      title: insert.title,
      description: insert.description,
      location: insert.location,
      scheduledFor: insert.scheduledFor,
      endDate: insert.endDate ?? null,
      hours: insert.hours,
      status: insert.status ?? "open",
      category: insert.category ?? "other",
      maxVolunteers: insert.maxVolunteers ?? null,
    };
    this.volunteerWorks.set(id, work);
    return work;
  }

  async updateVolunteerWork(id: string, updates: UpdateVolunteerWork): Promise<VolunteerWork | undefined> {
    const existing = this.volunteerWorks.get(id);
    if (!existing) return undefined;
    const merged: VolunteerWork = { ...existing, ...updates };
    this.volunteerWorks.set(id, merged);
    return merged;
  }

  async deleteVolunteerWork(id: string): Promise<boolean> {
    Array.from(this.volunteerSignups.entries()).forEach(([sid, s]) => {
      if (s.workId === id) this.volunteerSignups.delete(sid);
    });
    return this.volunteerWorks.delete(id);
  }

  async createVolunteerSignup(userId: string, workId: string): Promise<VolunteerSignup | null> {
    const existing = Array.from(this.volunteerSignups.values()).find(
      (s) => s.userId === userId && s.workId === workId,
    );
    if (existing) return existing;

    // Auto-close if max reached after this signup
    const work = this.volunteerWorks.get(workId);
    const counts = await this.getSignupCountsByWorkId();
    const currentCount = counts[workId] ?? 0;
    if (work?.maxVolunteers != null && currentCount >= work.maxVolunteers) {
      return null; // At capacity
    }

    const id = randomUUID();
    const signup: VolunteerSignup = { id, userId, workId, signedUpAt: new Date() };
    this.volunteerSignups.set(id, signup);

    // Check again after adding
    const newCount = currentCount + 1;
    if (work?.maxVolunteers != null && newCount >= work.maxVolunteers && work.status === "open") {
      this.volunteerWorks.set(workId, { ...work, status: "closed" });
    }

    return signup;
  }

  async deleteVolunteerSignup(userId: string, workId: string): Promise<boolean> {
    const entry = Array.from(this.volunteerSignups.entries()).find(
      ([, s]) => s.userId === userId && s.workId === workId,
    );
    if (!entry) return false;
    const deleted = this.volunteerSignups.delete(entry[0]);
    // Re-open if below max
    if (deleted) {
      const work = this.volunteerWorks.get(workId);
      if (work?.status === "closed" && work.maxVolunteers != null) {
        const counts = await this.getSignupCountsByWorkId();
        if ((counts[workId] ?? 0) < work.maxVolunteers) {
          this.volunteerWorks.set(workId, { ...work, status: "open" });
        }
      }
    }
    return deleted;
  }

  async getSignupsByUserId(userId: string): Promise<VolunteerSignup[]> {
    return Array.from(this.volunteerSignups.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.signedUpAt.getTime() - a.signedUpAt.getTime());
  }

  async getSignupCountsByWorkId(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    Array.from(this.volunteerSignups.values()).forEach((s) => {
      counts[s.workId] = (counts[s.workId] ?? 0) + 1;
    });
    return counts;
  }

  async getExpenseBreakdown(): Promise<ExpenseBreakdown> {
    const adoptionTotal = Array.from(this.adoptions.values()).reduce(
      (sum, a) => sum + a.amount * a.price,
      0,
    );
    const donationTotal = Array.from(this.donations.values()).reduce(
      (sum, d) => sum + d.amount,
      0,
    );
    const totalRaised = adoptionTotal + donationTotal;
    return {
      totalRaised,
      categories: EXPENSE_CATEGORIES.map((c) => ({
        ...c,
        amount: Math.round((totalRaised * c.percent) / 100),
      })),
    };
  }
}

export const storage = new MemStorage();
