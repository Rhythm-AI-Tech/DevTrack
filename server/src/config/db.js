const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("Trying to connect to MongoDB...");
    console.log("MONGO_URI exists:", !!process.env.MONGO_URI);

    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log(
      `MongoDB connected: ${connection.connection.host}`
    );
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error);
    process.exit(1);
  }
};

module.exports = connectDB;