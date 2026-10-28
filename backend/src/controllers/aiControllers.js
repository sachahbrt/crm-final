import { z } from "zod";
import Contact from "../models/Contact.js";

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(20)
    .optional(),
});

// Fields relevant to answering contact questions, deliberately excluding
// email/phone/photoUrl/social links — no reason to send that PII to a
// third-party model for this feature.
function formatContact(c) {
  const parts = [
    `${c.firstName} ${c.lastName}`.trim(),
    c.company && `entreprise: ${c.company}`,
    c.jobTitle && `poste: ${c.jobTitle}`,
    c.category && `catégorie: ${c.category}`,
    c.status && `statut: ${c.status}`,
    c.meetingPlace && `rencontré à: ${c.meetingPlace}`,
    c.meetingDate && `date de rencontre: ${new Date(c.meetingDate).toLocaleDateString("fr-FR")}`,
    c.birthday && `date de naissance: ${new Date(c.birthday).toLocaleDateString("fr-FR")}`,
    c.lastSeenAt && `dernière fois revu(e): ${new Date(c.lastSeenAt).toLocaleDateString("fr-FR")}`,
    c.notes && `notes: ${c.notes}`,
  ].filter(Boolean);
  return "- " + parts.join(", ");
}

export async function chatWithAi(req, res, next) {
  try {
    const { message, history = [] } = chatSchema.parse(req.body);

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ message: "L'assistant IA n'est pas encore configuré." });
    }

    const contacts = await Contact.find({ owner: req.user.id }).limit(300);
    const contactsBlock = contacts.length
      ? contacts.map(formatContact).join("\n")
      : "(Aucun contact enregistré.)";

    const today = new Date().toLocaleDateString("fr-FR");
    const systemPrompt =
      "Tu es l'assistant contacts de LockList, un CRM. Réponds UNIQUEMENT à partir des données de contacts fournies ci-dessous. " +
      "Si les données ne permettent pas de répondre, dis-le clairement et n'invente jamais de contact. " +
      "Réponds en français, de façon concise.\n\n" +
      `Nous sommes le ${today}.\n\n` +
      `Contacts de l'utilisateur :\n${contactsBlock}`;

    let response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-ultra-550b-a55b:free",
          messages: [{ role: "system", content: systemPrompt }, ...history, { role: "user", content: message }],
        }),
      });
    } catch (fetchErr) {
      console.error("OpenRouter request failed:", fetchErr.message);
      return res.status(502).json({ message: "L'assistant IA est momentanément indisponible." });
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("OpenRouter returned an error:", response.status, body);
      return res.status(502).json({ message: "L'assistant IA est momentanément indisponible." });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string") {
      console.error("OpenRouter returned an unexpected response shape:", JSON.stringify(data));
      return res.status(502).json({ message: "L'assistant IA est momentanément indisponible." });
    }

    res.json({ reply });
  } catch (err) {
    next(err);
  }
}
