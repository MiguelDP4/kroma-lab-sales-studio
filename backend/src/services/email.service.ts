import nodemailer, { Transporter } from 'nodemailer';

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass: pass.replace(/\s+/g, ''),
        },
      });
      this.isConfigured = true;
    } else {
      console.warn('[EmailService] SMTP_USER o SMTP_PASS no configurados. Los correos se imprimirán en consola.');
      this.isConfigured = false;
    }
  }

  /**
   * Envía un correo con el enlace de confirmación de identidad / verificación de cuenta.
   */
  async sendVerificationEmail(email: string, name: string, token: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const cleanFrontendUrl = frontendUrl.replace(/\/+$/, '');
    const verificationUrl = `${cleanFrontendUrl}/verificar-correo?token=${encodeURIComponent(token)}`;
    const sender = process.env.SMTP_FROM || `"Kroma Lab" <${process.env.SMTP_USER || 'no-reply@kromalab.gt'}>`;

    const subject = 'Verifica tu cuenta — Kroma Lab Sales Studio';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 30px 15px;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
                
                <!-- Encabezado con branding Kroma Lab -->
                <tr>
                  <td style="background: linear-gradient(135deg, #1c7293, #0f3d50); padding: 32px 24px; text-align: center;">
                    <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 8px 16px; margin-bottom: 12px;">
                      <span style="font-size: 1.15rem; font-weight: 800; color: #ffffff; letter-spacing: 0.05em; text-transform: uppercase;">
                        ⚡ KROMA LAB
                      </span>
                    </div>
                    <h1 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; line-height: 1.3;">
                      Confirmación de Cuenta
                    </h1>
                    <p style="color: rgba(255, 255, 255, 0.85); font-size: 14px; margin: 6px 0 0;">
                      Impresión UV DTF Industrial de Alta Calidad • Guatemala
                    </p>
                  </td>
                </tr>

                <!-- Contenido Principal -->
                <tr>
                  <td style="padding: 36px 28px;">
                    <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 16px;">
                      ¡Hola, ${name}! 👋
                    </p>
                    <p style="font-size: 15px; color: #475569; line-height: 1.6; margin: 0 0 24px;">
                      Gracias por registrarte en <strong>Kroma Lab Sales Studio</strong>. Para garantizar la seguridad de tu cuenta y habilitar el envío de tus artes y pedidos de impresión UV DTF, por favor confirma tu dirección de correo electrónico pulsando el botón a continuación:
                    </p>

                    <!-- Botón de Acción Principal (Área táctil >= 48px) -->
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${verificationUrl}" target="_blank" style="display: inline-block; background-color: #1c7293; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 12px rgba(28, 114, 147, 0.35); min-height: 48px; line-height: 20px;">
                        ✅ Confirmar mi Correo Electrónico
                      </a>
                    </div>

                    <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 16px; text-align: center;">
                      Este enlace caducará en <strong>24 horas</strong> por motivos de seguridad.
                    </p>

                    <!-- Enlace alternativo en texto plano -->
                    <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px; margin-top: 24px; border: 1px dashed #cbd5e1;">
                      <p style="font-size: 12px; color: #64748b; margin: 0 0 6px;">
                        ¿No puedes hacer clic en el botón? Copia y pega este enlace en tu navegador:
                      </p>
                      <p style="font-size: 12px; color: #1c7293; word-break: break-all; margin: 0;">
                        <a href="${verificationUrl}" style="color: #1c7293; text-decoration: underline;">${verificationUrl}</a>
                      </p>
                    </div>

                    <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 0;">
                        🛡️ <strong>Aviso de seguridad:</strong> Si tú no solicitaste crear una cuenta en Kroma Lab, puedes ignorar este mensaje con total tranquilidad; la cuenta no será activada.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Pie de página -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="font-size: 12px; color: #94a3b8; margin: 0 0 4px;">
                      © ${new Date().getFullYear()} Kroma Lab Sales Studio. Todos los derechos reservados.
                    </p>
                    <p style="font-size: 11px; color: #cbd5e1; margin: 0;">
                      Villa Nueva & Ciudad de Guatemala • Auditoría y Calidad UV DTF
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const textContent = `
¡Hola, ${name}!

Gracias por registrarte en Kroma Lab Sales Studio.
Para activar tu cuenta y confirmar tu correo electrónico, haz clic en el siguiente enlace:

${verificationUrl}

Este enlace caducará en 24 horas.
Si tú no creaste esta cuenta, puedes ignorar este mensaje.

Atentamente,
El equipo de Kroma Lab
Villa Nueva, Guatemala
    `.trim();

    if (this.isConfigured && this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: sender,
          to: email,
          subject,
          text: textContent,
          html: htmlContent,
        });
        console.log(`[EmailService] Correo de verificación enviado a ${email}. ID: ${info.messageId}`);
        return true;
      } catch (error) {
        console.error('[EmailService] Error al enviar correo de verificación:', error);
        console.log(`[EmailService FALLBACK] Enlace de verificación para ${email}: ${verificationUrl}`);
        return false;
      }
    } else {
      console.log(`[EmailService MOCK/DEV] Enlace de verificación generado para ${email}:`);
      console.log(`🔗 ${verificationUrl}`);
      return true;
    }
  }

  /**
   * Envía un correo con el enlace para confirmar el cambio de contraseña (Task 7).
   */
  async sendPasswordChangeVerificationEmail(email: string, name: string, token: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const cleanFrontendUrl = frontendUrl.replace(/\/+$/, '');
    const verificationUrl = `${cleanFrontendUrl}/verificar-correo?token=${encodeURIComponent(token)}&action=password`;
    const sender = process.env.SMTP_FROM || `"Kroma Lab Seguridad" <${process.env.SMTP_USER || 'no-reply@kromalab.gt'}>`;
    const subject = 'Confirma tu cambio de contraseña — Kroma Lab Sales Studio';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><title>${subject}</title></head>
      <body style="font-family: sans-serif; background: #f8fafc; padding: 20px;">
        <div style="max-width: 580px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1c7293; margin-top: 0;">🔒 Confirmación de Cambio de Contraseña</h2>
          <p>Hola, <strong>${name}</strong>.</p>
          <p>Hemos recibido una solicitud para actualizar la contraseña de tu cuenta en Kroma Lab Sales Studio.</p>
          <p>Para activar tu nueva contraseña, por favor haz clic en el siguiente botón:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${verificationUrl}" style="background: #1c7293; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              ✅ Confirmar Nueva Contraseña
            </a>
          </div>
          <p style="font-size: 13px; color: #64748b;">Si no solicitaste este cambio, por favor contáctanos de inmediato.</p>
        </div>
      </body>
      </html>
    `;

    const textContent = `Hola ${name},\n\nPara confirmar el cambio de contraseña de tu cuenta en Kroma Lab, abre este enlace:\n${verificationUrl}\n\nSi no realizaste esta solicitud, ignora este mensaje.`;

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({ from: sender, to: email, subject, text: textContent, html: htmlContent });
        return true;
      } catch (e) {
        console.error('[EmailService] Error enviando correo de cambio de contraseña:', e);
        return false;
      }
    } else {
      console.log(`[EmailService MOCK/DEV] Enlace de confirmación de contraseña para ${email}: ${verificationUrl}`);
      return true;
    }
  }

  /**
   * Envía un correo con el enlace para confirmar el cambio de correo electrónico (Task 8).
   */
  async sendEmailChangeVerificationEmail(newEmail: string, name: string, token: string): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const cleanFrontendUrl = frontendUrl.replace(/\/+$/, '');
    const verificationUrl = `${cleanFrontendUrl}/verificar-correo?token=${encodeURIComponent(token)}&action=email`;
    const sender = process.env.SMTP_FROM || `"Kroma Lab Seguridad" <${process.env.SMTP_USER || 'no-reply@kromalab.gt'}>`;
    const subject = 'Confirma tu nueva dirección de correo — Kroma Lab Sales Studio';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><title>${subject}</title></head>
      <body style="font-family: sans-serif; background: #f8fafc; padding: 20px;">
        <div style="max-width: 580px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1c7293; margin-top: 0;">✉️ Confirmación de Nuevo Correo Electrónico</h2>
          <p>Hola, <strong>${name}</strong>.</p>
          <p>Has solicitado asociar esta dirección de correo electrónico a tu cuenta de Kroma Lab Sales Studio.</p>
          <p>Para confirmar y activar tu nuevo correo, pulsa el botón a continuación:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${verificationUrl}" style="background: #1c7293; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              ✅ Confirmar Nuevo Correo
            </a>
          </div>
          <p style="font-size: 13px; color: #64748b;">Este enlace es válido por 24 horas.</p>
        </div>
      </body>
      </html>
    `;

    const textContent = `Hola ${name},\n\nPara confirmar tu nueva dirección de correo en Kroma Lab, abre este enlace:\n${verificationUrl}`;

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({ from: sender, to: newEmail, subject, text: textContent, html: htmlContent });
        return true;
      } catch (e) {
        console.error('[EmailService] Error enviando correo de cambio de email:', e);
        return false;
      }
    } else {
      console.log(`[EmailService MOCK/DEV] Enlace de confirmación de email para ${newEmail}: ${verificationUrl}`);
      return true;
    }
  }

  /**
   * Envía un correo al cliente confirmando que su pedido fue ingresado a la cola de producción (Task 14).
   */
  async sendOrderConfirmationEmail(email: string, customerName: string, orderCode: string, orderDetails?: any): Promise<boolean> {
    const sender = process.env.SMTP_FROM || `"Kroma Lab Producción" <${process.env.SMTP_USER || 'no-reply@kromalab.gt'}>`;
    const subject = `¡Tu pedido #${orderCode} ha sido confirmado y está en producción! — Kroma Lab`;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head><meta charset="UTF-8"><title>${subject}</title></head>
      <body style="font-family: sans-serif; background: #f8fafc; padding: 20px;">
        <div style="max-width: 580px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1c7293; margin-top: 0;">🚀 ¡Tu Pedido ha Sido Confirmado!</h2>
          <p>Hola, <strong>${customerName}</strong>.</p>
          <p>Te informamos con gusto que tu orden <strong>#${orderCode}</strong> ha sido verificada y agregada exitosamente a la cola de producción de impresión UV DTF industrial.</p>
          ${orderDetails ? `
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 14px;">
              <div><strong>Estado actual:</strong> En cola de impresión</div>
              ${orderDetails.linearMeters ? `<div><strong>Metros lineales:</strong> ${orderDetails.linearMeters} m</div>` : ''}
              ${orderDetails.totalAmountQ ? `<div><strong>Total acordado:</strong> Q${Number(orderDetails.totalAmountQ).toFixed(2)}</div>` : ''}
            </div>
          ` : ''}
          <p>Nuestro equipo está procesando tus archivos y te notificaremos cuando tu pedido esté listo para entrega.</p>
          <p style="font-size: 13px; color: #64748b; margin-top: 25px;">Kroma Lab — Impresión UV DTF Profesional</p>
        </div>
      </body>
      </html>
    `;

    const textContent = `Hola ${customerName},\n\nTu pedido #${orderCode} ha sido confirmado y se encuentra en la cola de producción de Kroma Lab.\n\n¡Gracias por tu confianza!`;

    if (this.isConfigured && this.transporter) {
      try {
        await this.transporter.sendMail({ from: sender, to: email, subject, text: textContent, html: htmlContent });
        return true;
      } catch (e) {
        console.error('[EmailService] Error enviando correo de confirmación de pedido:', e);
        return false;
      }
    } else {
      console.log(`[EmailService MOCK/DEV] Notificación de confirmación de pedido #${orderCode} para ${email}`);
      return true;
    }
  }

}

export const emailService = new EmailService();
export default emailService;
