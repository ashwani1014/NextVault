const assert = require("assert");
const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const listingRoutes = require("../routes/listing.js");
const reviewRoutes = require("../routes/review.js");

// Test Identity Fixtures
const ownerId = new mongoose.Types.ObjectId();
const authorId = new mongoose.Types.ObjectId();
const strangerId = new mongoose.Types.ObjectId();

const listing1Id = new mongoose.Types.ObjectId();
const listing2Id = new mongoose.Types.ObjectId();
const review1Id = new mongoose.Types.ObjectId();
const review2Id = new mongoose.Types.ObjectId();
const nonExistentId = new mongoose.Types.ObjectId();

// Save original Mongoose methods
const origListingFind = Listing.find;
const origListingFindById = Listing.findById;
const origListingFindByIdAndUpdate = Listing.findByIdAndUpdate;
const origListingFindByIdAndDelete = Listing.findByIdAndDelete;
const origListingExists = Listing.exists;
const origListingSave = Listing.prototype.save;

const origReviewFind = Review.find;
const origReviewFindById = Review.findById;
const origReviewFindByIdAndUpdate = Review.findByIdAndUpdate;
const origReviewFindByIdAndDelete = Review.findByIdAndDelete;
const origReviewDeleteMany = Review.deleteMany;
const origReviewSave = Review.prototype.save;

// In-Memory Test State
let dbState = {};

function resetDatabaseState() {
  dbState = {
    listings: new Map([
      [
        listing1Id.toString(),
        {
          _id: listing1Id,
          title: "Sunset Villa",
          description: "Cozy beach house",
          price: 2500,
          location: "Goa",
          country: "India",
          owner: { _id: ownerId, username: "listingOwner" },
          reviews: [review1Id],
        },
      ],
      [
        listing2Id.toString(),
        {
          _id: listing2Id,
          title: "Mountain Cabin",
          description: "Quiet mountain retreat",
          price: 1800,
          location: "Manali",
          country: "India",
          owner: { _id: ownerId, username: "listingOwner" },
          reviews: [review2Id],
        },
      ],
    ]),
    reviews: new Map([
      [
        review1Id.toString(),
        {
          _id: review1Id,
          comment: "Loved the sunset!",
          rating: 5,
          author: { _id: authorId, username: "reviewAuthor" },
        },
      ],
      [
        review2Id.toString(),
        {
          _id: review2Id,
          comment: "Chilly and scenic!",
          rating: 4,
          author: { _id: authorId, username: "reviewAuthor" },
        },
      ],
    ]),
  };
}

// Setup Express Test Application
const app = express();
app.use(express.json());

// Controlled Test Authentication Middleware
app.use((req, res, next) => {
  const role = req.headers["x-test-role"];
  if (role === "owner") {
    req.user = { _id: ownerId, username: "listingOwner" };
    req.isAuthenticated = () => true;
  } else if (role === "author") {
    req.user = { _id: authorId, username: "reviewAuthor" };
    req.isAuthenticated = () => true;
  } else if (role === "stranger") {
    req.user = { _id: strangerId, username: "strangerUser" };
    req.isAuthenticated = () => true;
  } else {
    req.user = null;
    req.isAuthenticated = () => false;
  }
  next();
});

// Mount the real application routers
app.use("/api/listings", listingRoutes);
app.use("/api/listings/:id/reviews", reviewRoutes);

let server;
let baseUrl;
let passedCount = 0;
let totalCount = 0;

async function test(name, fn) {
  totalCount++;
  resetDatabaseState();
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}\n     ${err.message}`);
  }
}

// Helper to make real HTTP requests to the test server
async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const fetchOptions = {
    method: options.method || "GET",
    headers,
  };
  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, fetchOptions);
  let data = null;
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, data };
}

// Install Stubs on Mongoose Models
function installMongooseStubs() {
  Listing.find = function () {
    const list = Array.from(dbState.listings.values()).map((l) => ({
      ...l,
      owner: l.owner ? { ...l.owner } : null,
    }));
    return {
      populate: function (path, select) {
        // Strip fields not in select
        if (path === "owner" && select === "username") {
          list.forEach((item) => {
            if (item.owner) {
              item.owner = { _id: item.owner._id, username: item.owner.username };
            }
          });
        }
        return Promise.resolve(list);
      },
      then: function (resolve) {
        return Promise.resolve(list).then(resolve);
      },
    };
  };

  Listing.findById = function (id) {
    const idStr = id ? id.toString() : null;
    const found = dbState.listings.get(idStr);
    if (!found) {
      return {
        populate: () => ({ populate: () => Promise.resolve(null), then: (r) => Promise.resolve(null).then(r) }),
        then: (resolve) => Promise.resolve(null).then(resolve),
      };
    }

    const item = {
      ...found,
      owner: found.owner ? { ...found.owner } : null,
      reviews: (found.reviews || []).slice(),
      save: async function () {
        dbState.listings.set(idStr, this);
        return this;
      },
    };

    return {
      populate: function (path, select) {
        if (path === "owner") {
          if (select === "username" && item.owner) {
            item.owner = { _id: item.owner._id, username: item.owner.username };
          }
        }
        return {
          populate: function (nested) {
            if (nested && nested.path === "reviews") {
              item.reviews = item.reviews.map((rId) => {
                const r = dbState.reviews.get(rId.toString());
                if (!r) return rId;
                const author = r.author ? { ...r.author } : null;
                if (nested.populate && nested.populate.select === "username" && author) {
                  return { ...r, author: { _id: author._id, username: author.username } };
                }
                return { ...r, author };
              });
            }
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

  Listing.findByIdAndUpdate = function (id, update) {
    const idStr = id ? id.toString() : null;
    const existing = dbState.listings.get(idStr);
    if (!existing) return Promise.resolve(null);
    let updatedReviews = existing.reviews ? existing.reviews.slice() : [];
    if (update && update.$pull && update.$pull.reviews) {
      const pullId = update.$pull.reviews.toString();
      updatedReviews = updatedReviews.filter((r) => r.toString() !== pullId);
    }
    const merged = { ...existing, ...update, reviews: updatedReviews };
    delete merged.$pull;
    dbState.listings.set(idStr, merged);
    return Promise.resolve(merged);
  };

  Listing.findByIdAndDelete = function (id) {
    const idStr = id ? id.toString() : null;
    const existing = dbState.listings.get(idStr);
    dbState.listings.delete(idStr);
    return Promise.resolve(existing || null);
  };

  Listing.exists = function (filter) {
    if (filter && filter._id && filter.reviews) {
      const listingIdStr = filter._id.toString();
      const reviewIdStr = filter.reviews.toString();
      const listing = dbState.listings.get(listingIdStr);
      if (!listing) return Promise.resolve(null);
      const hasReview = listing.reviews && listing.reviews.some((r) => r.toString() === reviewIdStr);
      return Promise.resolve(hasReview ? { _id: listing._id } : null);
    }
    if (filter && filter._id) {
      const listingIdStr = filter._id.toString();
      const exists = dbState.listings.has(listingIdStr);
      return Promise.resolve(exists ? { _id: filter._id } : null);
    }
    return Promise.resolve(null);
  };

  Listing.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    const idStr = this._id.toString();
    const doc = {
      _id: this._id,
      title: this.title,
      description: this.description,
      price: this.price,
      location: this.location,
      country: this.country,
      image: this.image,
      owner: this.owner,
      reviews: this.reviews || [],
    };
    dbState.listings.set(idStr, doc);
    return doc;
  };

  Review.findById = function (id) {
    const idStr = id ? id.toString() : null;
    const found = dbState.reviews.get(idStr);
    if (!found) return Promise.resolve(null);
    return Promise.resolve({
      ...found,
      author: found.author ? { ...found.author } : null,
    });
  };

  Review.findByIdAndUpdate = function (id, update) {
    const idStr = id ? id.toString() : null;
    const existing = dbState.reviews.get(idStr);
    if (!existing) return Promise.resolve(null);
    const updated = { ...existing, ...update };
    dbState.reviews.set(idStr, updated);
    return Promise.resolve(updated);
  };

  Review.findByIdAndDelete = function (id) {
    const idStr = id ? id.toString() : null;
    const existing = dbState.reviews.get(idStr);
    dbState.reviews.delete(idStr);
    return Promise.resolve(existing || null);
  };

  Review.deleteMany = function () {
    return Promise.resolve({ deletedCount: 1 });
  };

  Review.prototype.save = async function () {
    if (!this._id) this._id = new mongoose.Types.ObjectId();
    const idStr = this._id.toString();
    const doc = {
      _id: this._id,
      comment: this.comment,
      rating: this.rating,
      author: this.author,
    };
    dbState.reviews.set(idStr, doc);
    return doc;
  };
}

function restoreMongooseMethods() {
  Listing.find = origListingFind;
  Listing.findById = origListingFindById;
  Listing.findByIdAndUpdate = origListingFindByIdAndUpdate;
  Listing.findByIdAndDelete = origListingFindByIdAndDelete;
  Listing.exists = origListingExists;
  Listing.prototype.save = origListingSave;

  Review.find = origReviewFind;
  Review.findById = origReviewFindById;
  Review.findByIdAndUpdate = origReviewFindByIdAndUpdate;
  Review.findByIdAndDelete = origReviewFindByIdAndDelete;
  Review.deleteMany = origReviewDeleteMany;
  Review.prototype.save = origReviewSave;
}

async function runAllTests() {
  console.log("\n========================================================");
  console.log("🛡️  NEXTVAULT ROUTE-LEVEL AUTHORIZATION & CONSISTENCY SUITE");
  console.log("========================================================\n");

  installMongooseStubs();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // 1. Unauthenticated Requests
  console.log("1. Unauthenticated Requests (Must Return 401)");
  await test("POST /api/listings unauthenticated -> 401", async () => {
    const res = await request("/api/listings", { method: "POST", body: { title: "Test" } });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.data.success, false);
  });

  await test("PUT /api/listings/:id unauthenticated -> 401", async () => {
    const res = await request(`/api/listings/${listing1Id}`, { method: "PUT", body: { title: "New" } });
    assert.strictEqual(res.status, 401);
  });

  await test("DELETE /api/listings/:id unauthenticated -> 401", async () => {
    const res = await request(`/api/listings/${listing1Id}`, { method: "DELETE" });
    assert.strictEqual(res.status, 401);
  });

  await test("POST /api/listings/:id/reviews unauthenticated -> 401", async () => {
    const res = await request(`/api/listings/${listing1Id}/reviews`, { method: "POST", body: { comment: "Great", rating: 5 } });
    assert.strictEqual(res.status, 401);
  });

  await test("PUT /api/listings/:id/reviews/:reviewId unauthenticated -> 401", async () => {
    const res = await request(`/api/listings/${listing1Id}/reviews/${review1Id}`, { method: "PUT", body: { comment: "Updated" } });
    assert.strictEqual(res.status, 401);
  });

  await test("DELETE /api/listings/:id/reviews/:reviewId unauthenticated -> 401", async () => {
    const res = await request(`/api/listings/${listing1Id}/reviews/${review1Id}`, { method: "DELETE" });
    assert.strictEqual(res.status, 401);
  });

  // 2. Listing Ownership Authorization
  console.log("\n2. Listing Ownership Authorization");
  await test("PUT /api/listings/:id by non-owner -> 403 Forbidden", async () => {
    const res = await request(`/api/listings/${listing1Id}`, {
      method: "PUT",
      headers: { "x-test-role": "stranger" },
      body: { title: "Hijacked Title" },
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(dbState.listings.get(listing1Id.toString()).title, "Sunset Villa");
  });

  await test("DELETE /api/listings/:id by non-owner -> 403 Forbidden", async () => {
    const res = await request(`/api/listings/${listing1Id}`, {
      method: "DELETE",
      headers: { "x-test-role": "stranger" },
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(dbState.listings.has(listing1Id.toString()), true);
  });

  await test("PUT /api/listings/:id by legitimate owner -> 200 Success", async () => {
    const res = await request(`/api/listings/${listing1Id}`, {
      method: "PUT",
      headers: { "x-test-role": "owner" },
      body: { title: "Owner Updated Title", price: 3200 },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(dbState.listings.get(listing1Id.toString()).title, "Owner Updated Title");
    assert.strictEqual(dbState.listings.get(listing1Id.toString()).price, 3200);
  });

  await test("DELETE /api/listings/:id by legitimate owner -> 200 Success", async () => {
    const res = await request(`/api/listings/${listing1Id}`, {
      method: "DELETE",
      headers: { "x-test-role": "owner" },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(dbState.listings.has(listing1Id.toString()), false);
  });

  // 3. Review Author Authorization
  console.log("\n3. Review Author Authorization");
  await test("PUT /api/listings/:id/reviews/:reviewId by non-author -> 403 Forbidden", async () => {
    const res = await request(`/api/listings/${listing1Id}/reviews/${review1Id}`, {
      method: "PUT",
      headers: { "x-test-role": "stranger" },
      body: { comment: "Hacked comment" },
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(dbState.reviews.get(review1Id.toString()).comment, "Loved the sunset!");
  });

  await test("DELETE /api/listings/:id/reviews/:reviewId by non-author -> 403 Forbidden", async () => {
    const res = await request(`/api/listings/${listing1Id}/reviews/${review1Id}`, {
      method: "DELETE",
      headers: { "x-test-role": "stranger" },
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(dbState.reviews.has(review1Id.toString()), true);
  });

  await test("PUT /api/listings/:id/reviews/:reviewId by verified author -> 200 Success", async () => {
    const res = await request(`/api/listings/${listing1Id}/reviews/${review1Id}`, {
      method: "PUT",
      headers: { "x-test-role": "author" },
      body: { comment: "Author updated review", rating: 4 },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(dbState.reviews.get(review1Id.toString()).comment, "Author updated review");
    assert.strictEqual(dbState.reviews.get(review1Id.toString()).rating, 4);
  });

  await test("DELETE /api/listings/:id/reviews/:reviewId by verified author -> 200 Success", async () => {
    const res = await request(`/api/listings/${listing1Id}/reviews/${review1Id}`, {
      method: "DELETE",
      headers: { "x-test-role": "author" },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(dbState.reviews.has(review1Id.toString()), false);
    // Listing references must be updated
    const updatedListing = dbState.listings.get(listing1Id.toString());
    assert.strictEqual(updatedListing.reviews.includes(review1Id.toString()), false);
  });

  // 4. Anti-Spoofing & Parameter Tampering
  console.log("\n4. Anti-Spoofing & Parameter Tampering on Real Endpoints");
  await test("POST /api/listings ignores spoofed owner field in request body", async () => {
    const spoofedOwner = new mongoose.Types.ObjectId();
    const res = await request("/api/listings", {
      method: "POST",
      headers: { "x-test-role": "owner" },
      body: {
        title: "New Villa",
        price: 2000,
        owner: spoofedOwner.toString(), // Attacker tries to set owner
      },
    });
    assert.strictEqual(res.status, 201);
    const createdId = res.data.data._id.toString();
    const created = dbState.listings.get(createdId);
    assert.strictEqual(created.owner.toString(), ownerId.toString());
    assert.notStrictEqual(created.owner.toString(), spoofedOwner.toString());
  });

  await test("PUT /api/listings/:id strips owner field tampering", async () => {
    const attackerOwner = new mongoose.Types.ObjectId();
    const res = await request(`/api/listings/${listing1Id}`, {
      method: "PUT",
      headers: { "x-test-role": "owner" },
      body: {
        title: "Changed Title",
        owner: attackerOwner.toString(),
      },
    });
    assert.strictEqual(res.status, 200);
    const updated = dbState.listings.get(listing1Id.toString());
    assert.strictEqual(updated.title, "Changed Title");
    assert.strictEqual(updated.owner._id.toString(), ownerId.toString());
    assert.notStrictEqual(updated.owner._id.toString(), attackerOwner.toString());
  });

  await test("POST /api/listings/:id/reviews ignores spoofed author field in request body", async () => {
    const spoofedAuthor = new mongoose.Types.ObjectId();
    const res = await request(`/api/listings/${listing1Id}/reviews`, {
      method: "POST",
      headers: { "x-test-role": "author" },
      body: {
        comment: "Nice place",
        rating: 5,
        author: spoofedAuthor.toString(),
      },
    });
    assert.strictEqual(res.status, 201);
    const createdReviewId = res.data.data._id.toString();
    const created = dbState.reviews.get(createdReviewId);
    assert.strictEqual(created.author.toString(), authorId.toString());
    assert.notStrictEqual(created.author.toString(), spoofedAuthor.toString());
  });

  await test("PUT /api/listings/:id/reviews/:reviewId strips author tampering", async () => {
    const spoofedAuthor = new mongoose.Types.ObjectId();
    const res = await request(`/api/listings/${listing1Id}/reviews/${review1Id}`, {
      method: "PUT",
      headers: { "x-test-role": "author" },
      body: {
        comment: "Legit update",
        author: spoofedAuthor.toString(),
      },
    });
    assert.strictEqual(res.status, 200);
    const updated = dbState.reviews.get(review1Id.toString());
    assert.strictEqual(updated.comment, "Legit update");
    assert.strictEqual(updated.author._id.toString(), authorId.toString());
    assert.notStrictEqual(updated.author._id.toString(), spoofedAuthor.toString());
  });

  // 5. Review-Listing Consistency (Finding 1)
  console.log("\n5. Review-Listing Consistency (Cross-Listing Tampering Prevention)");
  await test("PUT review belonging to Listing 1 via Listing 2 URL returns 404", async () => {
    const res = await request(`/api/listings/${listing2Id}/reviews/${review1Id}`, {
      method: "PUT",
      headers: { "x-test-role": "author" },
      body: { comment: "Tampering across listings" },
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.success, false);
    // Ensure review was not modified
    assert.strictEqual(dbState.reviews.get(review1Id.toString()).comment, "Loved the sunset!");
  });

  await test("DELETE review belonging to Listing 1 via Listing 2 URL returns 404", async () => {
    const res = await request(`/api/listings/${listing2Id}/reviews/${review1Id}`, {
      method: "DELETE",
      headers: { "x-test-role": "author" },
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.success, false);
    // Ensure neither review nor listing was touched
    assert.strictEqual(dbState.reviews.has(review1Id.toString()), true);
    assert.strictEqual(dbState.listings.get(listing2Id.toString()).reviews.includes(review2Id), true);
  });

  await test("Cross-listing review update via wrong listing is rejected regardless of implementation", async () => {
    // Review1 belongs to Listing1, Review2 belongs to Listing2.
    // Attempting to update Review2 through Listing1's URL must fail.
    const res = await request(`/api/listings/${listing1Id}/reviews/${review2Id}`, {
      method: "PUT",
      headers: { "x-test-role": "author" },
      body: { comment: "Cross-listing tamper attempt" },
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.success, false);
    // Ensure Review2 was not modified
    assert.strictEqual(dbState.reviews.get(review2Id.toString()).comment, "Chilly and scenic!");
  });

  await test("Cross-listing review delete via wrong listing is rejected regardless of implementation", async () => {
    // Review2 belongs to Listing2. Attempting to delete it via Listing1 must fail.
    const res = await request(`/api/listings/${listing1Id}/reviews/${review2Id}`, {
      method: "DELETE",
      headers: { "x-test-role": "author" },
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(dbState.reviews.has(review2Id.toString()), true);
    // Listing2 must still reference its review
    assert.strictEqual(dbState.listings.get(listing2Id.toString()).reviews.some(r => r.toString() === review2Id.toString()), true);
  });

  // 6. Database Failure Rollback on Review Creation (Finding 2 & 3)
  console.log("\n6. Database Failure Rollback on Review Creation (Safe Error Responses)");
  await test("Database failure on listing.save() rolls back created review, returns 500 without leaking raw error", async () => {
    // Stub listing.save to throw a genuine database error
    const origFindById = Listing.findById;
    Listing.findById = function (id) {
      const idStr = id.toString();
      const listing = dbState.listings.get(idStr);
      return Promise.resolve({
        ...listing,
        reviews: (listing.reviews || []).slice(),
        save: async function () {
          throw new Error("Simulated Disk Full DB Failure");
        },
      });
    };

    const initialReviewCount = dbState.reviews.size;
    const res = await request(`/api/listings/${listing1Id}/reviews`, {
      method: "POST",
      headers: { "x-test-role": "author" },
      body: { comment: "This will fail on listing save", rating: 3 },
    });

    Listing.findById = origFindById; // restore

    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.data.success, false);
    // Generic, safe error message to client - no internal details leaked
    assert.strictEqual(res.data.message, "Failed to create review. Please try again.");
    assert.strictEqual(res.data.message.includes("Simulated Disk Full"), false);
    // Ensure no orphan review was left behind
    assert.strictEqual(dbState.reviews.size, initialReviewCount);
  });

  // 7. Email Privacy on Public Endpoints (Finding 3)
  console.log("\n7. Email Privacy on Public Endpoints");
  await test("GET /api/listings does not expose owner email", async () => {
    const res = await request("/api/listings");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(Array.isArray(res.data.data), true);
    res.data.data.forEach((listing) => {
      if (listing.owner) {
        assert.strictEqual(listing.owner.email, undefined);
        assert.strictEqual(typeof listing.owner.username, "string");
      }
    });
  });

  await test("GET /api/listings/:id does not expose owner or review author emails", async () => {
    const res = await request(`/api/listings/${listing1Id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.owner.email, undefined);
    assert.strictEqual(res.data.data.reviews[0].author.email, undefined);
    assert.strictEqual(res.data.data.owner.username, "listingOwner");
    assert.strictEqual(res.data.data.reviews[0].author.username, "reviewAuthor");
  });

  await test("GET /api/listings/:id/reviews does not expose review author email", async () => {
    const res = await request(`/api/listings/${listing1Id}/reviews`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(Array.isArray(res.data.data), true);
    res.data.data.forEach((review) => {
      if (review.author) {
        assert.strictEqual(review.author.email, undefined);
        assert.strictEqual(typeof review.author.username, "string");
      }
    });
  });

  // 8. Invalid IDs and Missing Resources
  console.log("\n8. Invalid IDs and Missing Resources");
  await test("GET /api/listings/invalid-id -> 400 Bad Request", async () => {
    const res = await request("/api/listings/not-a-valid-object-id");
    assert.strictEqual(res.status, 400);
  });

  await test("GET /api/listings/:nonExistentId -> 404 Not Found", async () => {
    const res = await request(`/api/listings/${nonExistentId}`);
    assert.strictEqual(res.status, 404);
  });

  await test("POST /api/listings/invalid-id/reviews -> 400 Bad Request", async () => {
    const res = await request("/api/listings/not-a-valid-id/reviews", {
      method: "POST",
      headers: { "x-test-role": "author" },
      body: { comment: "Hi", rating: 5 },
    });
    assert.strictEqual(res.status, 400);
  });

  await test("POST /api/listings/:nonExistentId/reviews -> 404 Not Found", async () => {
    const res = await request(`/api/listings/${nonExistentId}/reviews`, {
      method: "POST",
      headers: { "x-test-role": "author" },
      body: { comment: "Hi", rating: 5 },
    });
    assert.strictEqual(res.status, 404);
  });

  await test("PUT /api/listings/:id/reviews/invalid-id -> 400 Bad Request", async () => {
    const res = await request(`/api/listings/${listing1Id}/reviews/bad-id`, {
      method: "PUT",
      headers: { "x-test-role": "author" },
      body: { comment: "Hi" },
    });
    assert.strictEqual(res.status, 400);
  });

  await test("PUT /api/listings/:id/reviews/:nonExistentId -> 404 Not Found", async () => {
    const res = await request(`/api/listings/${listing1Id}/reviews/${nonExistentId}`, {
      method: "PUT",
      headers: { "x-test-role": "author" },
      body: { comment: "Hi" },
    });
    assert.strictEqual(res.status, 404);
  });

  // 9. PUT Listing Price Validation (CastError vs DB Failure)
  console.log("\n9. PUT Listing Price Validation");
  await test("PUT /api/listings/:id with non-numeric price returns 400", async () => {
    // Stub findByIdAndUpdate to throw a CastError like Mongoose does for bad price
    const origUpdate = Listing.findByIdAndUpdate;
    Listing.findByIdAndUpdate = function () {
      const err = new Error('Cast to Number failed for value "abc" at path "price"');
      err.name = "CastError";
      return Promise.reject(err);
    };
    const res = await request(`/api/listings/${listing1Id}`, {
      method: "PUT",
      headers: { "x-test-role": "owner" },
      body: { price: "abc" },
    });
    Listing.findByIdAndUpdate = origUpdate;
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.data.success, false);
    // Must not contain raw internal error details
    assert.strictEqual(res.data.message.includes("CastError"), false);
  });

  await test("PUT /api/listings/:id with genuine DB failure returns 500", async () => {
    const origUpdate = Listing.findByIdAndUpdate;
    Listing.findByIdAndUpdate = function () {
      return Promise.reject(new Error("Simulated disk I/O failure"));
    };
    const res = await request(`/api/listings/${listing1Id}`, {
      method: "PUT",
      headers: { "x-test-role": "owner" },
      body: { title: "Valid title" },
    });
    Listing.findByIdAndUpdate = origUpdate;
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.data.success, false);
    assert.strictEqual(res.data.message.includes("Simulated"), false);
  });

  // Teardown
  await new Promise((resolve) => server.close(resolve));
  restoreMongooseMethods();

  console.log("\n--------------------------------------------------------");
  console.log(`Results: ${passedCount}/${totalCount} tests passed (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log("--------------------------------------------------------\n");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test execution error:", err);
  if (server) server.close();
  restoreMongooseMethods();
  process.exit(1);
});
