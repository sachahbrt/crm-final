import express from "express";
import {
  getAllContacts,
  getContact,
  createContact,
  deleteContact,
  modifyContact,
  uploadPhoto,
} from "../controllers/contactControllers.js";
import { requireAuth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getAllContacts);
router.post("/upload-photo", upload.single("photo"), uploadPhoto);
router.get("/:id", getContact);
router.post("/", createContact);
router.put("/:id", modifyContact);
router.delete("/:id", deleteContact);

export default router;
