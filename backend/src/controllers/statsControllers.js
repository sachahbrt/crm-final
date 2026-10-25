import mongoose from "mongoose";
import Contact from "../models/Contact.js";

export async function getStatsByCategory(req, res, next) {
  try {
    const owner = new mongoose.Types.ObjectId(req.user.id);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    const [byCategory, byLocation, byMonth, toRecontactContacts] = await Promise.all([
      Contact.aggregate([
        { $match: { owner } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $project: { _id: 0, category: "$_id", count: 1 } },
      ]),
      Contact.aggregate([
        { $match: { owner, meetingPlace: { $nin: [null, ""] } } },
        { $group: { _id: "$meetingPlace", count: { $sum: 1 } } },
        { $project: { _id: 0, location: "$_id", count: 1 } },
      ]),
      Contact.aggregate([
        { $match: { owner, createdAt: { $gte: twelveMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $project: { _id: 0, month: "$_id", count: 1 } },
        { $sort: { month: 1 } },
      ]),
      Contact.find({ owner, status: "à recontacter" }, "firstName lastName"),
    ]);

    res.json({
      byCategory,
      byMonth,
      byLocation,
      toRecontact: {
        count: toRecontactContacts.length,
        contacts: toRecontactContacts.map((c) => ({ id: c._id, firstName: c.firstName, lastName: c.lastName })),
      },
    });
  } catch (err) {
    next(err);
  }
}
