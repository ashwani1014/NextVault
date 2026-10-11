const mongoose = require("mongoose");
const { data: sampleListings } = require("./data.js");
const Listing = require("../models/listing.js");
const connectDB = require("../config/db.js");

const initDB = async () => {
  await connectDB();
  await Listing.deleteMany({});
  await Listing.insertMany(sampleListings);
  console.log("✅ Sample data initialized successfully!");
  mongoose.connection.close();
};

initDB();
