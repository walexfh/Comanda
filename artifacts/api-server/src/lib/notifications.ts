import { logger } from "./logger";

export interface RegistrationRequestData {
  id: number;
  name: string;
  email: string;
  restaurantName: string;
  phone?: string | null;
  message?: string | null;
}

export async function sendEmailNotification(data: RegistrationRequestData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const masterEmail = process.env.MASTER_EMAIL;

  if (!apiKey || !masterEmail) {
    logger.warn("Email notification skipped: RESEND_API_KEY or MASTER_EMAIL not configured");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WFoods <no-reply@wfoods.app>",
        to: [masterEmail],
        subject: `Nova solicitação de acesso — ${data.restaurantName}`,
        html: `
          <h2>Nova Solicitação de Acesso ao WFoods</h2>
          <table style="border-collapse:collapse;width:100%">
            <tr><td style="padding:8px;font-weight:bold">Nome</td><td style="padding:8px">${data.name}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">E-mail</td><td style="padding:8px">${data.email}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Restaurante</td><td style="padding:8px">${data.restaurantName}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Telefone</td><td style="padding:8px">${data.phone ?? "—"}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">Mensagem</td><td style="padding:8px">${data.message ?? "—"}</td></tr>
            <tr><td style="padding:8px;font-weight:bold">ID da solicitação</td><td style="padding:8px">#${data.id}</td></tr>
          </table>
          <p style="margin-top:24px">Acesse o Painel Master para aprovar ou rejeitar.</p>
        `,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      logger.warn({ err }, "Failed to send email notification");
    } else {
      logger.info("Email notification sent successfully");
    }
  } catch (err) {
    logger.warn({ err }, "Error sending email notification");
  }
}

export async function sendWhatsAppNotification(data: RegistrationRequestData): Promise<void> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const masterPhone = process.env.MASTER_PHONE;

  if (!instanceId || !token || !masterPhone) {
    logger.warn("WhatsApp notification skipped: ZAPI_INSTANCE_ID, ZAPI_TOKEN or MASTER_PHONE not configured");
    return;
  }

  const text =
    `📋 *Nova Solicitação de Acesso — WFoods*\n\n` +
    `*Nome:* ${data.name}\n` +
    `*E-mail:* ${data.email}\n` +
    `*Restaurante:* ${data.restaurantName}\n` +
    `*Telefone:* ${data.phone ?? "—"}\n` +
    (data.message ? `*Mensagem:* ${data.message}\n` : "") +
    `\nAcesse o Painel Master para liberar o acesso.`;

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: masterPhone, message: text }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      logger.warn({ err }, "Failed to send WhatsApp notification");
    } else {
      logger.info("WhatsApp notification sent successfully");
    }
  } catch (err) {
    logger.warn({ err }, "Error sending WhatsApp notification");
  }
}
