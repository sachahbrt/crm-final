import mongoose from "mongoose";
import { z } from "zod";
import Contact from "../models/Contact.js";

const rangeSchema = z.enum(["7d", "30d", "12m"]).catch("12m");

// `timeline` is the new range-aware series for the frontend's line chart;
// `byMonth` stays untouched below (Dashboard.jsx already depends on it).
async function buildTimeline(owner, range, byMonth) {
  if (range === "12m") return byMonth.map(({ month, count }) => ({ label: month, count }));

  const days = range === "7d" ? 7 : 30;
  // $dateToString below groups in UTC by default — build `since` and every
  // label in UTC too, so a non-UTC server TZ (e.g. CET) can't shift "today"
  // onto the wrong label and leave real same-day contacts uncounted.
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));

  const rows = await Contact.aggregate([
    { $match: { owner, createdAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    { $project: { _id: 0, label: "$_id", count: 1 } },
    { $sort: { label: 1 } },
  ]);

  // Fill in zero-count days so the line chart has one point per day, not
  // just the days that happen to have contacts.
  const byLabel = new Map(rows.map((r) => [r.label, r.count]));
  const timeline = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const label = d.toISOString().slice(0, 10);
    timeline.push({ label, count: byLabel.get(label) || 0 });
  }
  return timeline;
}

export async function getStatsByCategory(req, res, next) {
  try {
    const owner = new mongoose.Types.ObjectId(req.user.id);
    const range = rangeSchema.parse(req.query.range);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);

    const [byCategory, byLocation, byCompany, byMonth, toRecontactContacts] = await Promise.all([
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
        { $match: { owner, company: { $nin: [null, ""] } } },
        { $group: { _id: "$company", count: { $sum: 1 } } },
        { $project: { _id: 0, company: "$_id", count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Contact.aggregate([
        { $match: { owner, createdAt: { $gte: twelveMonthsAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $project: { _id: 0, month: "$_id", count: 1 } },
        { $sort: { month: 1 } },
      ]),
      Contact.find({ owner, status: "à recontacter" }, "firstName lastName"),
    ]);

    const timeline = await buildTimeline(owner, range, byMonth);

    res.json({
      byCategory,
      byMonth,
      timeline,
      byLocation,
      byCompany,
      topCompany: byCompany[0] || null,
      toRecontact: {
        count: toRecontactContacts.length,
        contacts: toRecontactContacts.map((c) => ({ id: c._id, firstName: c.firstName, lastName: c.lastName })),
      },
    });
  } catch (err) {
    next(err);
  }
}
