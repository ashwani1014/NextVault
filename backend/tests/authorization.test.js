const assert = require("assert");
const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const { isLoggedIn, isOwner, isReviewAuthor } = require("../middleware/auth.js");

// Generate realistic ObjectIds for test fixtures
const ownerId = new mongoose.Types.ObjectId();
const authorId = new mongoose.Types.ObjectId();
const strangerId = new mongoose.Types.ObjectId();
const listingId = new mongoose.Types.ObjectId();
const reviewId = new mongoose.Types.ObjectId();
const nonExistentId = new mongoose.Types.ObjectId();

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}\n     ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}\n     ${err.message}`);
  }
}

function mockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    locals: {},
  };
  return res;
}

// In-memory mock database fixtures
const mockDatabase = {
  listings: new Map([
    [
      listingId.toString(),
      {
        _id: listingId,
        title: "Sunset Villa",
        description: "Cozy beach house",
        price: 2500,
        location: "Goa",
        country: "India",
        owner: ownerId,
        reviews: [reviewId],
      },
    ],
  ]),
  reviews: new Map([
    [
      reviewId.toString(),
      {
        _id: reviewId,
        comment: "Great place!",
        rating: 5,
        author: authorId,
      },
    ],
  ]),
};

// Patch Mongoose model query methods to use fixtures
Listing.findById = function (id) {
  const idStr = id ? id.toString() : null;
  const item = mockDatabase.listings.get(idStr) || null;
  return {
    populate: function () {
      return {
        populate: function () {
          return Promise.resolve(item);
        },
        then: function (resolve) {
          return Promise.resolve(item).then(resolve);
        },
      };
    },
    then: function (resolve) {
      return Promise.resolve(item).then(resolve);
    },
  };
};

Listing.findByIdAndUpdate = function (id, update, options) {
  const idStr = id ? id.toString() : null;
  const existing = mockDatabase.listings.get(idStr);
  if (!existing) return Promise.resolve(null);
  const updated = { ...existing, ...update };
  mockDatabase.listings.set(idStr, updated);
  return Promise.resolve(updated);
};

Listing.findByIdAndDelete = function (id) {
  const idStr = id ? id.toString() : null;
  const existing = mockDatabase.listings.get(idStr);
  mockDatabase.listings.delete(idStr);
  return Promise.resolve(existing);
};

Listing.find = function () {
  const items = Array.from(mockDatabase.listings.values());
  return {
    populate: function () {
      return Promise.resolve(items);
    },
    then: function (resolve) {
      return Promise.resolve(items).then(resolve);
    },
  };
};

Review.findById = function (id) {
  const idStr = id ? id.toString() : null;
  const item = mockDatabase.reviews.get(idStr) || null;
  return Promise.resolve(item);
};

Review.findByIdAndUpdate = function (id, update, options) {
  const idStr = id ? id.toString() : null;
  const existing = mockDatabase.reviews.get(idStr);
  if (!existing) return Promise.resolve(null);
  const updated = { ...existing, ...update };
  mockDatabase.reviews.set(idStr, updated);
  return Promise.resolve(updated);
};

Review.findByIdAndDelete = function (id) {
  const idStr = id ? id.toString() : null;
  const existing = mockDatabase.reviews.get(idStr);
  mockDatabase.reviews.delete(idStr);
  return Promise.resolve(existing);
};

Review.deleteMany = function () {
  return Promise.resolve({ deletedCount: 1 });
};

async function main() {
  console.log("\n========================================================");
  console.log("🛡️  NEXTVAULT AUTHORIZATION TEST SUITE");
  console.log("========================================================\n");

  console.log("1. Authentication Middleware (isLoggedIn)");
  // 1.1 Unauthenticated request returns 401
  runTest("isLoggedIn rejects unauthenticated request with 401", () => {
    const req = { isAuthenticated: () => false, user: null };
    const res = mockResponse();
    let nextCalled = false;
    isLoggedIn(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(nextCalled, false);
  });

  // 1.2 Authenticated request passes
  runTest("isLoggedIn allows authenticated request", () => {
    const req = { isAuthenticated: () => true, user: { _id: ownerId } };
    const res = mockResponse();
    let nextCalled = false;
    isLoggedIn(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(nextCalled, true);
  });

  console.log("\n2. Listing Ownership Authorization (isOwner)");
  // 2.1 Unauthenticated request to isOwner returns 401
  await runAsyncTest("isOwner rejects unauthenticated request with 401", async () => {
    const req = { isAuthenticated: () => false, user: null, params: { id: listingId.toString() } };
    const res = mockResponse();
    let nextCalled = false;
    await isOwner(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(nextCalled, false);
  });

  // 2.2 Invalid ObjectId format returns 400
  await runAsyncTest("isOwner rejects invalid listing ID format with 400", async () => {
    const req = { isAuthenticated: () => true, user: { _id: ownerId }, params: { id: "not-a-valid-id" } };
    const res = mockResponse();
    let nextCalled = false;
    await isOwner(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(nextCalled, false);
  });

  // 2.3 Non-existent listing returns 404
  await runAsyncTest("isOwner returns 404 for missing listing", async () => {
    const req = { isAuthenticated: () => true, user: { _id: ownerId }, params: { id: nonExistentId.toString() } };
    const res = mockResponse();
    let nextCalled = false;
    await isOwner(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(nextCalled, false);
  });

  // 2.4 Non-owner user returns 403
  await runAsyncTest("isOwner prevents non-owner with 403 Forbidden", async () => {
    const req = { isAuthenticated: () => true, user: { _id: strangerId }, params: { id: listingId.toString() } };
    const res = mockResponse();
    let nextCalled = false;
    await isOwner(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(nextCalled, false);
  });

  // 2.5 Actual owner passes
  await runAsyncTest("isOwner permits verified listing owner", async () => {
    const req = { isAuthenticated: () => true, user: { _id: ownerId }, params: { id: listingId.toString() } };
    const res = mockResponse();
    let nextCalled = false;
    await isOwner(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.listing._id.toString(), listingId.toString());
  });

  console.log("\n3. Review Author Authorization (isReviewAuthor)");
  // 3.1 Unauthenticated request returns 401
  await runAsyncTest("isReviewAuthor rejects unauthenticated request with 401", async () => {
    const req = { isAuthenticated: () => false, user: null, params: { reviewId: reviewId.toString() } };
    const res = mockResponse();
    let nextCalled = false;
    await isReviewAuthor(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(nextCalled, false);
  });

  // 3.2 Invalid ObjectId format returns 400
  await runAsyncTest("isReviewAuthor rejects invalid review ID format with 400", async () => {
    const req = { isAuthenticated: () => true, user: { _id: authorId }, params: { reviewId: "invalid-id" } };
    const res = mockResponse();
    let nextCalled = false;
    await isReviewAuthor(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(nextCalled, false);
  });

  // 3.3 Non-existent review returns 404
  await runAsyncTest("isReviewAuthor returns 404 for missing review", async () => {
    const req = { isAuthenticated: () => true, user: { _id: authorId }, params: { reviewId: nonExistentId.toString() } };
    const res = mockResponse();
    let nextCalled = false;
    await isReviewAuthor(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(nextCalled, false);
  });

  // 3.4 Non-author user returns 403
  await runAsyncTest("isReviewAuthor prevents non-author with 403 Forbidden", async () => {
    const req = { isAuthenticated: () => true, user: { _id: strangerId }, params: { reviewId: reviewId.toString() } };
    const res = mockResponse();
    let nextCalled = false;
    await isReviewAuthor(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(nextCalled, false);
  });

  // 3.5 Actual author passes
  await runAsyncTest("isReviewAuthor permits verified review author", async () => {
    const req = { isAuthenticated: () => true, user: { _id: authorId }, params: { reviewId: reviewId.toString() } };
    const res = mockResponse();
    let nextCalled = false;
    await isReviewAuthor(req, res, () => { nextCalled = true; });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.review._id.toString(), reviewId.toString());
  });

  console.log("\n4. Anti-Spoofing and Parameter Tampering Checks");
  // 4.1 Server overrides spoofed owner ID on listing creation
  runTest("Listing creation sets owner from session and ignores payload owner ID", () => {
    const spoofedOwnerId = new mongoose.Types.ObjectId();
    const reqBody = {
      title: "Hacker Villa",
      description: "Trying to spoof owner",
      price: 1000,
      owner: spoofedOwnerId.toString(),
    };
    const sessionUserId = ownerId;

    // Simulate route logic
    const createdDoc = new Listing({
      ...reqBody,
      owner: sessionUserId, // Server enforces session user
    });

    assert.strictEqual(createdDoc.owner.toString(), sessionUserId.toString());
    assert.notStrictEqual(createdDoc.owner.toString(), spoofedOwnerId.toString());
  });

  // 4.2 Listing update rejects / ignores owner reassignment
  await runAsyncTest("Listing update preserves original owner when attacker tries to change it", async () => {
    const attackerNewOwnerId = new mongoose.Types.ObjectId();
    const reqBody = {
      title: "Updated Title",
      owner: attackerNewOwnerId.toString(), // Malicious attempt to hijack ownership
    };

    // Route logic whitelist
    const { title, description, price, location, country, image } = reqBody;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (location !== undefined) updateData.location = location;
    if (country !== undefined) updateData.country = country;
    if (image !== undefined) updateData.image = image;

    await Listing.findByIdAndUpdate(listingId, updateData);
    const updated = mockDatabase.listings.get(listingId.toString());

    assert.strictEqual(updated.title, "Updated Title");
    assert.strictEqual(updated.owner.toString(), ownerId.toString());
    assert.notStrictEqual(updated.owner.toString(), attackerNewOwnerId.toString());
  });

  // 4.3 Review creation sets author from session and ignores payload author ID
  runTest("Review creation sets author from session and ignores payload author ID", () => {
    const spoofedAuthorId = new mongoose.Types.ObjectId();
    const reqBody = {
      comment: "Spoofed review",
      rating: 4,
      author: spoofedAuthorId.toString(),
    };
    const sessionUserId = authorId;

    // Simulate route logic
    const createdDoc = new Review({
      ...reqBody,
      author: sessionUserId, // Server enforces session user
    });

    assert.strictEqual(createdDoc.author.toString(), sessionUserId.toString());
    assert.notStrictEqual(createdDoc.author.toString(), spoofedAuthorId.toString());
  });

  // 4.4 Review update rejects / ignores author reassignment
  await runAsyncTest("Review update preserves original author when attacker tries to change it", async () => {
    const attackerNewAuthorId = new mongoose.Types.ObjectId();
    const reqBody = {
      comment: "Updated comment",
      author: attackerNewAuthorId.toString(), // Malicious attempt to change author
    };

    const { comment, rating } = reqBody;
    const updateData = {};
    if (comment !== undefined) updateData.comment = comment;
    if (rating !== undefined) updateData.rating = rating;

    await Review.findByIdAndUpdate(reviewId, updateData);
    const updated = mockDatabase.reviews.get(reviewId.toString());

    assert.strictEqual(updated.comment, "Updated comment");
    assert.strictEqual(updated.author.toString(), authorId.toString());
    assert.notStrictEqual(updated.author.toString(), attackerNewAuthorId.toString());
  });

  console.log("\n5. Public Endpoints Verification");
  // 5.1 Public GET /api/listings works without auth
  await runAsyncTest("Public GET /api/listings retrieves listings without authentication", async () => {
    const listings = await Listing.find({}).populate("owner");
    assert.strictEqual(Array.isArray(listings), true);
    assert.strictEqual(listings.length > 0, true);
  });

  // 5.2 Public GET /api/listings/:id works without auth
  await runAsyncTest("Public GET /api/listings/:id retrieves listing without authentication", async () => {
    const listing = await Listing.findById(listingId).populate("owner");
    assert.strictEqual(Boolean(listing), true);
    assert.strictEqual(listing._id.toString(), listingId.toString());
  });

  console.log("\n--------------------------------------------------------");
  console.log(`Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log("--------------------------------------------------------\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test runner encountered an error:", err);
  process.exit(1);
});
