import mongoose from "mongoose";
import { z } from "zod";
import Contact from "../models/Contact.js";
import { uploadImageBuffer, deleteImageByUrl } from "../utils/cloudinary.js";

const STATUSES = ["actif", "inactif", "à recontacter"];
const SORTABLE_FIELDS = ["name", "company", "category", "status"];
// Status isn't sorted alphabetically — "à recontacter" first (most actionable),
// then "inactif", then "actif". Reversed on sortDir=desc like the other columns.
const STATUS_SORT_RANK = { "à recontacter": 0, inactif: 1, actif: 2 };

const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  photoUrl: z.string().optional(),
  birthday: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  meetingDate: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  meetingPlace: z.string().optional(),
  lastSeenAt: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  socialNetworks: z.array(z.object({ platform: z.string().optional(), url: z.string().optional() })).optional(),
  category: z.string().min(1),
  notes: z.string().optional(),
  status: z.enum(STATUSES).optional(),
});

const updateContactSchema = contactSchema.partial();

export async function getAllContacts(req, res, next) {
  try {
    const { search, category, status, page = 1, limit = 20, sortBy, sortDir } = req.query;
    // Cast up front: Mongoose auto-casts a string owner id for .find(), but
    // .aggregate() (used below for status sort) talks to the driver more
    // directly and won't — an uncast string here silently matches nothing.
    const filter = { owner: new mongoose.Types.ObjectId(req.user.id) };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ firstName: regex }, { lastName: regex }];
    }
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const dir = sortDir === "desc" ? -1 : 1;
    const sortField = SORTABLE_FIELDS.includes(sortBy) ? sortBy : null;

    let contacts, total;
    if (sortField === "status") {
      [contacts, total] = await Promise.all([
        Contact.aggregate([
          { $match: filter },
          {
            $addFields: {
              _statusRank: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$status", "à recontacter"] }, then: STATUS_SORT_RANK["à recontacter"] },
                    { case: { $eq: ["$status", "inactif"] }, then: STATUS_SORT_RANK.inactif },
                    { case: { $eq: ["$status", "actif"] }, then: STATUS_SORT_RANK.actif },
                  ],
                  default: 99,
                },
              },
            },
          },
          { $sort: { _statusRank: dir } },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
          { $project: { _statusRank: 0 } },
        ]),
        Contact.countDocuments(filter),
      ]);
    } else {
      // "name" sorts on the displayed "Prénom Nom" order: firstName first,
      // lastName as a tiebreaker for same-first-name contacts.
      const sort =
        sortField === "name"
          ? { firstName: dir, lastName: dir }
          : sortField
            ? { [sortField]: dir }
            : { createdAt: -1 };
      [contacts, total] = await Promise.all([
        Contact.find(filter).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum),
        Contact.countDocuments(filter),
      ]);
    }
    res.json({ contacts, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
}

export async function getContact(req, res, next) {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, owner: req.user.id });
    if (!contact) return res.status(404).json({ message: "Contact introuvable" });
    res.json({ contact });
  } catch (err) {
    next(err);
  }
}

export async function createContact(req, res, next) {
  try {
    const data = contactSchema.parse(req.body);
    const contact = await Contact.create({ ...data, owner: req.user.id });
    res.status(201).json({ contact });
  } catch (err) {
    next(err);
  }
}

export async function modifyContact(req, res, next) {
  try {
    const data = updateContactSchema.parse(req.body);
    const contact = await Contact.findOneAndUpdate({ _id: req.params.id, owner: req.user.id }, data, {
      new: true,
      runValidators: true,
    });
    if (!contact) return res.status(404).json({ message: "Contact introuvable" });
    res.json({ contact });
  } catch (err) {
    next(err);
  }
}

export async function deleteContact(req, res, next) {
  try {
    const contact = await Contact.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!contact) return res.status(404).json({ message: "Contact introuvable" });
    if (contact.photoUrl) await deleteImageByUrl(contact.photoUrl);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: "Aucun fichier reçu" });
    const result = await uploadImageBuffer(req.file.buffer);
    res.json({ url: result.secure_url });
  } catch (err) {
    next(err);
  }
}
