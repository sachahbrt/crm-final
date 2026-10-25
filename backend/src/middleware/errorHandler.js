export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.name === "ZodError") {
    return res.status(400).json({ message: "Données invalides", errors: err.issues });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: "Cet email est déjà utilisé" });
  }
  res.status(err.status || 500).json({ message: err.message || "Erreur serveur" });
}
