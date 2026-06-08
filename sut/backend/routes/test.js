/**
 * Test-only routes — deterministic database reset/seed for automated tests.
 *
 * Mounted at /api/test ONLY when ENABLE_TEST_ENDPOINTS=1 (see index.js), so it
 * never ships to a real production deployment. This is the mechanism that keeps
 * Playwright happy: every test run starts from a known, stable database state.
 */

const express = require("express");
const router = express.Router();
const { sequelize, User, Article } = require("../models");
const { bcryptHash } = require("../helper/bcrypt");

// Deterministic seed users — fixed credentials so login flows are stable.
const SEED_USERS = [
  { username: "playwright", email: "playwright@test.io", password: "Password123!", bio: "Automation account", image: null },
  { username: "alice",      email: "alice@test.io",      password: "Password123!", bio: "Writer Alice",        image: null },
  { username: "bob",        email: "bob@test.io",        password: "Password123!", bio: null,                  image: null },
];

async function createUser({ username, email, password, bio = null, image = null }) {
  // Hash exactly like the signUp controller so these users can log in.
  return User.create({ username, email, bio, image, password: await bcryptHash(password) });
}

async function seedDatabase() {
  const created = {};
  for (const u of SEED_USERS) created[u.username] = await createUser(u);

  // One deterministic article so read/list tests have data without setup.
  await Article.create({
    slug: "welcome-to-inkwell",
    title: "Welcome to Inkwell",
    description: "Seeded article for deterministic tests",
    body: "Created by POST /api/test/reset so UI and API tests start with stable data.",
    userId: created.alice.id,
  });

  return {
    users: SEED_USERS.map((u) => ({ username: u.username, email: u.email, password: u.password })),
    article: "welcome-to-inkwell",
  };
}

// POST /api/test/reset — drop & recreate every table, then reseed known data.
router.post("/reset", async (req, res, next) => {
  try {
    await sequelize.sync({ force: true });
    const summary = await seedDatabase();
    res.json({ status: "reset", ...summary });
  } catch (error) {
    next(error);
  }
});

// POST /api/test/seed — create extra users on demand without wiping existing data.
// Body: { users: [{ username, email, password, bio? }] }
router.post("/seed", async (req, res, next) => {
  try {
    const list = Array.isArray(req.body && req.body.users) ? req.body.users : [];
    const created = [];
    for (const u of list) created.push((await createUser(u)).username);
    res.status(201).json({ status: "seeded", users: created });
  } catch (error) {
    next(error);
  }
});

// GET /api/test/health — readiness probe for tooling.
router.get("/health", (req, res) => res.json({ status: "ok" }));

module.exports = router;
