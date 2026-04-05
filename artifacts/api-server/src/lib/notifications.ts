import { logger } from "./logger";

export interface RegistrationRequestData {
  id: number;
  name: string;
  email: string;
  restaurantName: string;
  phone: string;
  cnpj: string;
  address: string;
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
        from: "WFoods ComandaFácil <onboarding@resend.dev>",
        to: [masterEmail],
        subject: `Nova solicitação de acesso — ${data.restaurantName} (#${data.id})`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#f97316;margin-bottom:4px">Nova Solicitação de Acesso</h2>
            <p style="color:#6b7280;margin-top:0">WFoods ComandaFácil — Solicitação #${data.id}</p>

            <table style="border-collapse:collapse;width:100%;margin-top:16px;background:#f9fafb;border-radius:8px;overflow:hidden">
              <tr style="background:#f3f4f6">
                <td style="padding:10px 14px;font-weight:bold;color:#374151;width:140px">Nome</td>
                <td style="padding:10px 14px;color:#111827">${data.name}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:bold;color:#374151">E-mail</td>
                <td style="padding:10px 14px;color:#111827">${data.email}</td>
              </tr>
              <tr style="background:#f3f4f6">
                <td style="padding:10px 14px;font-weight:bold;color:#374151">Restaurante</td>
                <td style="padding:10px 14px;color:#111827">${data.restaurantName}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:bold;color:#374151">Telefone</td>
                <td style="padding:10px 14px;color:#111827">${data.phone}</td>
              </tr>
              <tr style="background:#f3f4f6">
                <td style="padding:10px 14px;font-weight:bold;color:#374151">CNPJ</td>
                <td style="padding:10px 14px;color:#111827">${data.cnpj}</td>
              </tr>
              <tr>
                <td style="padding:10px 14px;font-weight:bold;color:#374151">Endereço</td>
                <td style="padding:10px 14px;color:#111827">${data.address}</td>
              </tr>
              ${data.message ? `
              <tr style="background:#f3f4f6">
                <td style="padding:10px 14px;font-weight:bold;color:#374151">Mensagem</td>
                <td style="padding:10px 14px;color:#111827;font-style:italic">${data.message}</td>
              </tr>` : ""}
            </table>

            <p style="margin-top:24px;color:#6b7280;font-size:14px">
              Acesse o Painel Master para aprovar ou rejeitar esta solicitação e criar o restaurante.
            </p>
          </div>
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
    logger.warn("WhatsApp notification skipped: ZAPI credentials not configured");
    return;
  }

  const text =
    `📋 *Nova Solicitação de Acesso — WFoods*\n\n` +
    `*Nome:* ${data.name}\n` +
    `*E-mail:* ${data.email}\n` +
    `*Restaurante:* ${data.restaurantName}\n` +
    `*Telefone:* ${data.phone}\n` +
    `*CNPJ:* ${data.cnpj}\n` +
    `*Endereço:* ${data.address}\n` +
    (data.message ? `*Mensagem:* ${data.message}\n` : "") +
    `\nAcesse o Painel Master para aprovar e criar o restaurante.`;

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
