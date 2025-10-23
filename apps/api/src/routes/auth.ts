// server/src/routes/auth.ts
import express from "express";
import { db } from "../db";
import { admins, voters } from "../schema";
import bcrypt from "bcrypt";
import { eq, and } from "drizzle-orm";

const router = express.Router();

// Admin login (returns success, no JWT/session for now)
router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Missing fields" });
  const found = await db.select().from(admins).where(eq(admins.email, email));
  const admin = found && found[0];
  if (!admin || !admin.password_hash) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  res.json({ success: true, admin: { id: admin.id, email: admin.email, full_name: admin.full_name } });
});

// Voter token check (valid/used)
router.post("/voter/check-token", async (req, res) => {
  const { electionId, token } = req.body;
  if (!electionId || !token) return res.status(400).json({ error: "Missing fields" });
  // Compute fingerprint
  const crypto = await import("crypto");
  const fingerprint = crypto.createHash("sha256").update(token).digest("hex");
  // Drizzle ORM does not support chaining .where, so combine with and()
  const found = await db.select().from(voters).where(
    and(eq(voters.election_id, electionId), eq(voters.token_fingerprint, fingerprint))
  );
  if (!found.length) return res.json({ valid: false, used: false });
  for (const row of found) {
    if (row.token_hash && await bcrypt.compare(token, row.token_hash)) {
      return res.json({ valid: true, used: !!row.token_used_at });
    }
  }
  res.json({ valid: false, used: false });
});

export default router;
