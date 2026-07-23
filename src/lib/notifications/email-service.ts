/**
 * Email Notification Service
 *
 * Sends transactional emails via SMTP using nodemailer.
 * Supports HTML templates for:
 *  - welcome
 *  - email_verification
 *  - checkin_reminder
 *  - report_ready
 *  - weekly_summary
 */

export interface EmailConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
  fromName: string
}

let emailConfig: EmailConfig | null = null

export function initEmailConfig(config: EmailConfig): void {
  emailConfig = config
}

export function getEmailConfig(): EmailConfig | null {
  return emailConfig
}

type TemplateName = "welcome" | "email_verification" | "checkin_reminder" | "report_ready" | "weekly_summary"

interface TemplateData {
  userName?: string
  verificationLink?: string
  dashboardLink?: string
  reportName?: string
  weekNumber?: number
  summary?: string
  healthScore?: number
  checkinLink?: string
}

function getSubject(template: TemplateName): string {
  const subjects: Record<TemplateName, string> = {
    welcome: "Welcome to HealthOS — Your AI Health Companion",
    email_verification: "Verify your email address",
    checkin_reminder: "It's check-in time! How was your week?",
    report_ready: "Your health report analysis is ready",
    weekly_summary: "Your HealthOS weekly summary",
  }
  return subjects[template]
}

function renderTemplate(template: TemplateName, data: TemplateData): string {
  const userName = data.userName ?? "there"
  const brandColor = "#176B63"
  const bgColor = "#F8F9FB"
  const textColor = "#172033"
  const mutedColor = "#4B5870"

  const header = `
    <div style="text-align:center;padding:32px 0 24px;">
      <div style="width:44px;height:44px;margin:0 auto 12px;background:linear-gradient(135deg,${brandColor},#10554F);border-radius:12px;display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:20px;font-weight:bold;">H</span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:${textColor};margin:0;">HealthOS</h1>
    </div>`

  const footer = `
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #E2E8F0;font-size:12px;color:${mutedColor};">
      <p style="margin:0 0 4px;">HealthOS — AI-Powered Personal Health Platform</p>
      <p style="margin:0;">This is an automated message. Please do not reply to this email.</p>
    </div>`

  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin:0; padding:0; background:${bgColor}; }
      .container { max-width:560px; margin:0 auto; padding:24px; }
      .card { background:white; border-radius:16px; padding:32px; border:1px solid #E2E8F0; }
    </style>`

  const templates: Record<TemplateName, string> = {
    welcome: `
      <div style="text-align:center;padding:8px 0 24px;">
        <p style="font-size:16px;color:${textColor};line-height:1.6;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
        <p style="font-size:14px;color:${mutedColor};line-height:1.6;margin:0 0 20px;">
          Welcome to HealthOS! Your AI-powered health companion is ready to help you
          understand your body, track your progress, and build healthier habits.
        </p>
        <a href="${data.dashboardLink ?? "#"}" style="display:inline-block;padding:12px 28px;background:${brandColor};color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">Go to Dashboard</a>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:24px;">
        <div style="text-align:center;padding:16px;background:${bgColor};border-radius:12px;"><div style="font-size:24px;margin-bottom:6px;">🧍</div><div style="font-size:12px;color:${mutedColor};">Posture Analysis</div></div>
        <div style="text-align:center;padding:16px;background:${bgColor};border-radius:12px;"><div style="font-size:24px;margin-bottom:6px;">🥗</div><div style="font-size:12px;color:${mutedColor};">Diet Plans</div></div>
        <div style="text-align:center;padding:16px;background:${bgColor};border-radius:12px;"><div style="font-size:24px;margin-bottom:6px;">🏋️</div><div style="font-size:12px;color:${mutedColor};">Exercise</div></div>
      </div>`,

    email_verification: `
      <div style="text-align:center;padding:8px 0 24px;">
        <p style="font-size:16px;color:${textColor};line-height:1.6;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
        <p style="font-size:14px;color:${mutedColor};line-height:1.6;margin:0 0 20px;">Please verify your email address to activate your HealthOS account.</p>
        <a href="${data.verificationLink ?? "#"}" style="display:inline-block;padding:12px 28px;background:${brandColor};color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">Verify Email</a>
        <p style="font-size:12px;color:${mutedColor};margin-top:16px;">This link expires in 24 hours.</p>
      </div>`,

    checkin_reminder: `
      <div style="padding:8px 0 24px;">
        <p style="font-size:16px;color:${textColor};line-height:1.6;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
        <p style="font-size:14px;color:${mutedColor};line-height:1.6;margin:0 0 20px;">It's time for your weekly check-in! Let us know how your week went so we can adjust your plans.</p>
        <a href="${data.checkinLink ?? "#"}" style="display:inline-block;padding:12px 28px;background:${brandColor};color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">Start Check-in</a>
      </div>`,

    report_ready: `
      <div style="padding:8px 0 24px;">
        <p style="font-size:16px;color:${textColor};line-height:1.6;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
        <p style="font-size:14px;color:${mutedColor};line-height:1.6;margin:0 0 20px;">
          Your ${data.reportName ?? "medical report"} has been analyzed by HealthOS AI.
          You can now view a plain-language explanation of your results.
        </p>
        <a href="${data.dashboardLink ?? "#"}" style="display:inline-block;padding:12px 28px;background:${brandColor};color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">View Analysis</a>
      </div>
      <div style="margin-top:20px;padding:16px;background:#FEF2F2;border-radius:12px;font-size:12px;color:#B53A45;">
        ⚠️ This analysis is for informational purposes only and does not constitute medical advice.
      </div>`,

    weekly_summary: `
      <div style="padding:8px 0 24px;">
        <p style="font-size:16px;color:${textColor};line-height:1.6;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
        <p style="font-size:14px;color:${mutedColor};line-height:1.6;margin:0 0 20px;">Here's your weekly health summary for week ${data.weekNumber ?? ""}.</p>
        ${data.healthScore != null ? `
          <div style="text-align:center;margin-bottom:20px;">
            <div style="font-size:36px;font-weight:bold;color:${data.healthScore >= 70 ? brandColor : data.healthScore >= 40 ? "#9B651B" : "#B53A45"};">${data.healthScore}</div>
            <div style="font-size:12px;color:${mutedColor};">Health Score</div>
          </div>` : ""}
        ${data.summary ? `
          <div style="padding:16px;background:${bgColor};border-radius:12px;font-size:14px;color:${textColor};line-height:1.6;">
            ${data.summary}
          </div>` : ""}
        <a href="${data.dashboardLink ?? "#"}" style="display:block;text-align:center;margin-top:20px;padding:12px;background:${brandColor};color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">View Full Dashboard</a>
      </div>`,
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>${baseStyles}</head>
    <body>
      <div class="container">
        ${header}
        <div class="card">
          ${templates[template]}
        </div>
        ${footer}
      </div>
    </body>
    </html>`
}

/**
 * Send an email using Nodemailer.
 * Falls back to console.log if Nodemailer is not available or config is not set.
 */
export async function sendEmail(
  to: string,
  template: TemplateName,
  data: TemplateData
): Promise<boolean> {
  const config = getEmailConfig()
  if (!config) {
    console.log(`[EmailService] No SMTP config. Would send "${template}" to ${to}:`, data)
    return false
  }

  const html = renderTemplate(template, data)
  const subject = getSubject(template)

  try {
    // Dynamic import so Nodemailer is only loaded when needed
    const nodemailer = await import("nodemailer")
    const transporter = nodemailer.default.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    })

    await transporter.sendMail({
      from: `"${config.fromName}" <${config.from}>`,
      to,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error("[EmailService] Failed to send email:", error)
    return false
  }
}
