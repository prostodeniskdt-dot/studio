import nodemailer from 'nodemailer';

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

export function getAppUrl() {
  return (process.env.APP_URL ?? '').replace(/\/+$/, '');
}

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  const host = env('SMTP_HOST');
  const port = Number(env('SMTP_PORT'));
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASS');
  const from = env('SMTP_FROM');

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}

