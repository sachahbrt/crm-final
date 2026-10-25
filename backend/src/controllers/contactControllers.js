import { z } from "zod";
import Contact from "../models/Contact.js";
import { uploadImageBuffer } from "../utils/cloudinary.js";

const STATUSES = ["actif", "inactif", "à recontacter"];

const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  photoUrl: z.string().optional(),
  meetingDate: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.date().optional()),
  meetingPlace: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  socialNetwork: z.object({ platform: z.string().optional(), url: z.string().optional() }).optional(),
  category: z.string().min(1),
  notes: z.string().optional(),
  status: z.enum(STATUSES).optional(),
});

const updateContactSchema = contactSchema.partial();

export async function getAllContacts(req, res, next) {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const filter = { owner: req.user.id };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ firstName: regex }, { lastName: regex }];
    }
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 20);
    const [contacts, total] = await Promise.all([
      Contact.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Contact.countDocuments(filter),
    ]);
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
