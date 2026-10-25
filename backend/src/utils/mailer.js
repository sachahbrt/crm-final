import nodemailer from "nodemailer";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

export async function sendResetEmail(to, resetUrl) {
  await getTransporter().sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "Réinitialisation de votre mot de passe",
    html: `<p>Cliquez sur ce lien pour réinitialiser votre mot de passe (valable 1h) :</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}
