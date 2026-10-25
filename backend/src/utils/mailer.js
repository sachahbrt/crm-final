import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

// Inline-styled on purpose: email clients strip <style> blocks and external
// CSS, so every rule has to live on the element itself to render reliably.
function resetEmailHtml(resetUrl) {
  return `
<meta charset="utf-8">
<body style="margin:0;padding:32px 16px;background:#F3F4F6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <tr>
      <td style="padding:32px 32px 24px;text-align:center;">
        <span style="display:inline-block;width:36px;height:36px;line-height:36px;background:#4F46E5;color:#ffffff;font-weight:700;font-size:16px;border-radius:8px;">B</span>
        <div style="margin-top:8px;font-weight:700;font-size:15px;color:#111827;">CRM Breece</div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 8px;">
        <h1 style="margin:0;font-size:20px;color:#111827;">Réinitialisation du mot de passe</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 24px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#4B5563;">
          Une demande de réinitialisation de mot de passe a été faite pour ce compte. Clique sur le bouton ci-dessous pour en choisir un nouveau. Ce lien est valable 1 heure.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;text-align:center;">
        <a href="${resetUrl}" style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;">
          Réinitialiser mon mot de passe
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#9CA3AF;">
          Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br>
          <a href="${resetUrl}" style="color:#4F46E5;word-break:break-all;">${resetUrl}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px;border-top:1px solid #E5E7EB;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9CA3AF;">
          Si tu n'es pas à l'origine de cette demande, tu peux ignorer cet email.
        </p>
      </td>
    </tr>
  </table>
</body>`;
}

export async function sendResetEmail(to, resetUrl) {
  // With Brevo (and most SMTP relays), EMAIL_USER is just the login used to
  // authenticate — it's not a real mailbox and Brevo rejects it as a sender.
  // The "from" address must be a verified sender configured separately.
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Réinitialisation de votre mot de passe",
    html: resetEmailHtml(resetUrl),
  });
}
