import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    photoUrl: { type: String },
    birthday: { type: Date },
    meetingDate: { type: Date },
    meetingPlace: { type: String },
    lastSeenAt: { type: Date },
    email: { type: String },
    phone: { type: String },
    company: { type: String },
    jobTitle: { type: String },
    socialNetworks: [{ platform: { type: String }, url: { type: String }, _id: false }],
    category: { type: String, required: true },
    notes: { type: String },
    status: {
      type: String,
      enum: ["actif", "inactif", "à recontacter"],
      default: "actif",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Contact", contactSchema);
