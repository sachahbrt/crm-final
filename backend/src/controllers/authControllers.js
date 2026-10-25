import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import User from "../models/User.js";
import Contact from "../models/Contact.js";
import { sendResetEmail } from "../utils/mailer.js";
import { signToken } from "../utils/token.js";

function toPublicUser(user) {
  return { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email };
}

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function createUser(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const email = data.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: "Cet email est déjà utilisé" });
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await User.create({ ...data, email, password: hashed });
    const token = signToken(user._id);
    res.status(201).json({ user: toPublicUser(user), token });
  } catch (err) {
    next(err);
  }
}

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function connectUser(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user || !user.password) return res.status(401).json({ message: "Identifiants invalides" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Identifiants invalides" });
    res.json({ user: toPublicUser(user), token: signToken(user._id) });
  } catch (err) {
    next(err);
  }
}

export async function disconnectUser(req, res) {
  res.json({ success: true });
}

export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

const forgotSchema = z.object({ email: z.string().email() });

export async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotSchema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
      await user.save();
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;
      try {
        await sendResetEmail(user.email, resetUrl);
      } catch (mailErr) {
        // Never let a mail-provider failure leak through the response below —
        // it would make this endpoint distinguish "account exists" from "doesn't".
        console.error("sendResetEmail failed:", mailErr.response || mailErr.message);
      }
    }
    // Always the same response so an attacker can't use this endpoint to enumerate emails.
    res.json({ message: "Si cet email existe, un lien de réinitialisation a été envoyé" });
  } catch (err) {
    next(err);
  }
}

const resetSchema = z.object({ password: z.string().min(8) });

export async function resetPassword(req, res, next) {
  try {
    const { password } = resetSchema.parse(req.body);
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");
    if (!user) return res.status(400).json({ message: "Lien invalide ou expiré" });
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: "Mot de passe mis à jour" });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    await Contact.deleteMany({ owner: req.user.id });
    await User.findByIdAndDelete(req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function exportMyData(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    const contacts = await Contact.find({ owner: req.user.id });
    res.json({ user: toPublicUser(user), contacts });
  } catch (err) {
    next(err);
  }
}
