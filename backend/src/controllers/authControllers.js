import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import User from "../models/User.js";
import Contact from "../models/Contact.js";
import { sendResetEmail, sendPasswordChangedEmail, sendEmailChangeVerification, sendDeleteAccountCode } from "../utils/mailer.js";
import { signToken, generateHashedToken, generateHashedCode } from "../utils/token.js";

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

const updateProfileSchema = z.object({ firstName: z.string().min(1), lastName: z.string().min(1) });

export async function updateProfile(req, res, next) {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.user.id, data, { returnDocument: "after", runValidators: true });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) });

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.user.id).select("+password");
    if (!user || !user.password) return res.status(404).json({ message: "Utilisateur introuvable" });
    const valid = await bcrypt.compare(currentPassword, user.password);
    // 400, not 401: the session/token is valid, only the submitted password
    // field is wrong — a 401 here would make the frontend's global
    // "session expired" handler log the user out (see resetPassword's 400
    // for the same reason on an invalid/expired reset token).
    if (!valid) return res.status(400).json({ message: "Mot de passe actuel incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true });
    // Notification only — the change already happened, a mail failure here
    // must never undo it or surface as an error to the client.
    try {
      await sendPasswordChangedEmail(user.email);
    } catch (mailErr) {
      console.error("sendPasswordChangedEmail failed:", mailErr.response || mailErr.message);
    }
  } catch (err) {
    next(err);
  }
}

const changeEmailSchema = z.object({ newEmail: z.string().email(), currentPassword: z.string().min(1) });

export async function requestEmailChange(req, res, next) {
  try {
    const { newEmail, currentPassword } = changeEmailSchema.parse(req.body);
    const email = newEmail.toLowerCase();
    const user = await User.findById(req.user.id).select("+password");
    if (!user || !user.password) return res.status(404).json({ message: "Utilisateur introuvable" });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ message: "Mot de passe actuel incorrect" });
    const taken = await User.findOne({ email });
    if (taken) return res.status(409).json({ message: "Cet email est déjà utilisé" });

    const { raw, hashed, expires } = generateHashedToken();
    user.pendingEmail = email;
    user.pendingEmailToken = hashed;
    user.pendingEmailExpires = expires;
    await user.save();

    const confirmUrl = `${process.env.FRONTEND_URL}/confirm-email/${raw}`;
    try {
      await sendEmailChangeVerification(email, confirmUrl);
    } catch (mailErr) {
      console.error("sendEmailChangeVerification failed:", mailErr.response || mailErr.message);
    }
    res.json({ message: "Vérifie ta nouvelle adresse pour confirmer le changement" });
  } catch (err) {
    next(err);
  }
}

export async function confirmEmailChange(req, res, next) {
  try {
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      pendingEmailToken: hashedToken,
      pendingEmailExpires: { $gt: Date.now() },
    }).select("+pendingEmailToken +pendingEmailExpires");
    if (!user) return res.status(400).json({ message: "Lien invalide ou expiré" });
    user.email = user.pendingEmail;
    user.pendingEmail = undefined;
    user.pendingEmailToken = undefined;
    user.pendingEmailExpires = undefined;
    await user.save();
    res.json({ message: "Email mis à jour" });
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
      const { raw, hashed, expires } = generateHashedToken();
      user.resetPasswordToken = hashed;
      user.resetPasswordExpires = expires;
      await user.save();
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${raw}`;
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

export async function requestAccountDeletion(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    const { code, hashed, expires } = generateHashedCode();
    user.deleteAccountCode = hashed;
    user.deleteAccountCodeExpires = expires;
    await user.save();
    try {
      await sendDeleteAccountCode(user.email, code);
    } catch (mailErr) {
      // Unlike forgotPassword, there's no "account exists" to hide here — the
      // user is already authenticated — so a mail failure is surfaced rather
      // than silently reported as sent, since the code is the only way in.
      console.error("sendDeleteAccountCode failed:", mailErr.response || mailErr.message);
      return res.status(502).json({ message: "Impossible d'envoyer le code de confirmation" });
    }
    res.json({ message: "Code de confirmation envoyé par email" });
  } catch (err) {
    next(err);
  }
}

const deleteAccountSchema = z.object({ code: z.string().length(6) });

export async function deleteUser(req, res, next) {
  try {
    const { code } = deleteAccountSchema.parse(req.body);
    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
    const user = await User.findOne({
      _id: req.user.id,
      deleteAccountCode: hashedCode,
      deleteAccountCodeExpires: { $gt: Date.now() },
    }).select("+deleteAccountCode +deleteAccountCodeExpires");
    if (!user) return res.status(400).json({ message: "Code invalide ou expiré" });
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
