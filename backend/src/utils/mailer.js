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
// Shared by every transactional email (reset, password-changed notice, email
// change confirmation) — only title/text/button differ. Colors match the
// site's current "LockList" palette (frontend/src/index.css custom
// properties) — keep these in sync if that palette changes.
// `code` mode (no buttonUrl) renders a big static code block instead of a
// clickable button, for flows where the user types the value in by hand
// (account deletion) rather than following a link.
function emailTemplate({ title, text, buttonLabel, buttonUrl, code }) {
  return `
<meta charset="utf-8">
<body style="margin:0;padding:32px 16px;background:#F7F5F0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E2DED2;">
    <tr>
      <td style="padding:32px 32px 24px;text-align:center;">
        <span style="display:inline-block;width:36px;height:36px;line-height:36px;background:#C08A2E;color:#ffffff;font-size:16px;border-radius:8px;">&#128274;</span>
        <div style="margin-top:8px;font-weight:700;font-size:15px;color:#15202E;">LockList</div>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 8px;">
        <h1 style="margin:0;font-size:20px;color:#15202E;">${title}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 24px;">
        <p style="margin:0;font-size:14px;line-height:1.6;color:#3A4150;">
          ${text}
        </p>
      </td>
    </tr>
    ${
      code
        ? `<tr>
      <td style="padding:0 32px 28px;text-align:center;">
        <span style="display:inline-block;background:#F7F5F0;border:1px solid #E2DED2;border-radius:8px;padding:14px 24px;font-size:28px;font-weight:700;letter-spacing:6px;color:#15202E;">${code}</span>
      </td>
    </tr>`
        : `<tr>
      <td style="padding:0 32px 28px;text-align:center;">
        <a href="${buttonUrl}" style="display:inline-block;background:#C08A2E;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;">
          ${buttonLabel}
        </a>
      </td>
    </tr>
    <tr>
      <td style="padding:0 32px 28px;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#5B5F6B;">
          Si le bouton ne fonctionne pas, copie ce lien dans ton navigateur :<br>
          <a href="${buttonUrl}" style="color:#C08A2E;word-break:break-all;">${buttonUrl}</a>
        </p>
      </td>
    </tr>`
    }
    <tr>
      <td style="padding:16px 32px;border-top:1px solid #E2DED2;text-align:center;">
        <p style="margin:0;font-size:12px;color:#5B5F6B;">
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
    html: emailTemplate({
      title: "Réinitialisation du mot de passe",
      text: "Une demande de réinitialisation de mot de passe a été faite pour ce compte. Clique sur le bouton ci-dessous pour en choisir un nouveau. Ce lien est valable 1 heure.",
      buttonLabel: "Réinitialiser mon mot de passe",
      buttonUrl: resetUrl,
    }),
  });
}

export async function sendPasswordChangedEmail(to) {
  const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/login`;
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Ton mot de passe a été modifié",
    html: emailTemplate({
      title: "Mot de passe modifié",
      text: "Le mot de passe de ton compte LockList vient d'être modifié. Si ce n'est pas toi, contacte-nous immédiatement.",
      buttonLabel: "Accéder à mon compte",
      buttonUrl: loginUrl,
    }),
  });
}

export async function sendDeleteAccountCode(to, code) {
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Code de confirmation de suppression de compte",
    html: emailTemplate({
      title: "Confirme la suppression de ton compte",
      text: "Pour confirmer la suppression définitive de ton compte LockList et de toutes tes données, entre ce code dans l'application. Ce code est valable 10 minutes.",
      code,
    }),
  });
}

export async function sendTwoFactorCode(to, code) {
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Code de connexion",
    html: emailTemplate({
      title: "Confirme ta connexion",
      text: "Entre ce code dans l'application pour terminer la connexion à ton compte LockList. Ce code est valable 10 minutes.",
      code,
    }),
  });
}

export async function sendEmailChangeVerification(to, confirmUrl) {
  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Confirme ta nouvelle adresse email",
    html: emailTemplate({
      title: "Confirme ta nouvelle adresse email",
      text: "Clique sur le bouton ci-dessous pour confirmer que cette adresse t'appartient et finaliser le changement. Ce lien est valable 1 heure.",
      buttonLabel: "Confirmer mon email",
      buttonUrl: confirmUrl,
    }),
  });
}
