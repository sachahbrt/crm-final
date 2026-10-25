import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );
    console.log("MongoDb connected");
  } catch (error) {
    console.error("Error to connect MongoDB", error);
    process.exit(1);
  }
}
