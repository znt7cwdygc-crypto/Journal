import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || "MyCamDesk <noreply@mycamdesk.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mycamdesk.com";

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL SKIP] No API key. To: ${to}, Subject: ${subject}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (e) {
    console.error(`[EMAIL ERROR] ${to}: ${e instanceof Error ? e.message : e}`);
  }
}

// --- Email templates ---

export function verificationEmail(name: string, token: string) {
  const link = `${SITE_URL}/auth/verify?token=${token}`;
  return {
    subject: "Подтвердите email — MyCamDesk",
    html: emailLayout(`
      <h2>Привет${name ? `, ${name}` : ""}!</h2>
      <p>Подтвердите ваш email для завершения регистрации на MyCamDesk.</p>
      <a href="${link}" style="display:inline-block;background:#FF4D2E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Подтвердить email</a>
      <p style="color:#888;font-size:13px;">Или скопируйте ссылку: ${link}</p>
      <p style="color:#888;font-size:13px;">Если вы не регистрировались — проигнорируйте это письмо.</p>
    `)
  };
}

export function inviteReceivedEmail(resumeTitle: string, message: string, offeredPercent: number | null) {
  return {
    subject: "Новый инвайт на ваше резюме — MyCamDesk",
    html: emailLayout(`
      <h2>Вам поступило предложение!</h2>
      <p>Студия заинтересовалась вашим резюме <strong>${resumeTitle}</strong>.</p>
      ${offeredPercent ? `<p>Предложенный процент: <strong>${offeredPercent}%</strong></p>` : ""}
      <div style="background:#f4f4f5;border-radius:8px;padding:12px 16px;margin:16px 0;">
        <p style="color:#888;font-size:12px;margin:0 0 4px;">Сообщение от студии:</p>
        <p style="margin:0;">${message}</p>
      </div>
      <a href="${SITE_URL}/cabinet#invites" style="display:inline-block;background:#FF4D2E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Посмотреть инвайт</a>
      <p style="color:#888;font-size:13px;">У вас есть 72 часа для ответа. Если не ответите — деньги вернутся студии.</p>
    `)
  };
}

export function inviteAcceptedEmail(resumeTitle: string, modelContact: string) {
  return {
    subject: "Модель приняла ваш инвайт — MyCamDesk",
    html: emailLayout(`
      <h2>Контакт получен!</h2>
      <p>Модель приняла ваше предложение по резюме <strong>${resumeTitle}</strong>.</p>
      <div style="background:#ecfdf5;border-radius:8px;padding:12px 16px;margin:16px 0;">
        <p style="color:#065f46;font-weight:bold;margin:0 0 4px;">Контакт модели:</p>
        <p style="margin:0;font-size:18px;font-weight:bold;">${modelContact}</p>
      </div>
      <a href="${SITE_URL}/cabinet#invites" style="display:inline-block;background:#FF4D2E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Открыть кабинет</a>
    `)
  };
}

export function inviteDeclinedEmail(resumeTitle: string, reason: string) {
  return {
    subject: "Инвайт отклонён — MyCamDesk",
    html: emailLayout(`
      <h2>Инвайт отклонён</h2>
      <p>Модель отклонила ваше предложение по резюме <strong>${resumeTitle}</strong>.</p>
      <div style="background:#f4f4f5;border-radius:8px;padding:12px 16px;margin:16px 0;">
        <p style="color:#888;font-size:12px;margin:0 0 4px;">Причина:</p>
        <p style="margin:0;">${reason}</p>
      </div>
      <p>Средства возвращены на ваш баланс.</p>
      <a href="${SITE_URL}/cabinet#invites" style="display:inline-block;background:#71717a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Открыть кабинет</a>
    `)
  };
}

export function contactsExchangedModelEmail(studioName: string, studioContact: string) {
  return {
    subject: "Контакты студии раскрыты — MyCamDesk",
    html: emailLayout(`
      <h2>Контакты раскрыты!</h2>
      <p>Вы приняли инвайт. Контакты студии теперь доступны.</p>
      <div style="background:#ecfdf5;border-radius:8px;padding:12px 16px;margin:16px 0;">
        <p style="color:#065f46;font-weight:bold;margin:0 0 4px;">Студия:</p>
        <p style="margin:0;font-size:18px;font-weight:bold;">${studioName}</p>
        <p style="margin:4px 0 0;font-size:16px;">${studioContact}</p>
      </div>
      <a href="${SITE_URL}/cabinet#invites" style="display:inline-block;background:#FF4D2E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Открыть кабинет</a>
    `)
  };
}

export function reportReceivedEmail() {
  return {
    subject: "Жалоба отправлена — MyCamDesk",
    html: emailLayout(`
      <h2>Жалоба принята</h2>
      <p>Ваша жалоба отправлена на модерацию. Мы рассмотрим её в ближайшее время.</p>
      <a href="${SITE_URL}/cabinet" style="display:inline-block;background:#71717a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Открыть кабинет</a>
    `)
  };
}

export function balanceTopUpEmail(amount: number) {
  return {
    subject: `Баланс пополнен на $${(amount / 100).toFixed(0)} — MyCamDesk`,
    html: emailLayout(`
      <h2>Баланс пополнен!</h2>
      <p>На ваш баланс зачислено <strong>$${(amount / 100).toFixed(2)}</strong>.</p>
      <a href="${SITE_URL}/cabinet" style="display:inline-block;background:#FF4D2E;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Открыть кабинет</a>
    `)
  };
}

function emailLayout(content: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
  <div style="height:4px;background:linear-gradient(90deg,#ff4d2e 0%,#ffd84d 36%,#38bdf8 70%,#0f766e 100%);"></div>
  <div style="padding:32px 24px;">
    ${content}
  </div>
  <div style="padding:16px 24px;background:#f9fafb;text-align:center;font-size:12px;color:#a1a1aa;">
    <a href="${SITE_URL}" style="color:#FF4D2E;text-decoration:none;font-weight:bold;">MyCamDesk</a> — медиа о вебкам-индустрии
  </div>
</div>
</body></html>`;
}
