import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Authentification requise" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // A 2FA pre-auth token proves only that the password was correct, not
    // that the code was — never let it through to a protected route.
    if (payload.purpose === "2fa") return res.status(401).json({ message: "Authentification requise" });
    req.user = { id: payload.id };
    next();
  } catch {
    res.status(401).json({ message: "Token invalide ou expiré" });
  }
}
