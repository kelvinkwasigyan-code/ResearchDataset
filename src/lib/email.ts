import nodemailer from "nodemailer";

export interface EmailResult {
  sent: boolean;
  mode: "smtp" | "console";
  error?: string;
}

function getAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? "Just Research <noreply@justresearch.local>";

  if (!host || !user || !pass) {
    // Local development fallback: log email cleanly so workflow works without SMTP credentials
    console.log(
      `\n[Just Research Email Notification — Console Preview]\nTo: ${options.to}\nFrom: ${from}\nSubject: ${options.subject}\n---\n${options.text}\n---`
    );
    return { sent: true, mode: "console" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return { sent: true, mode: "smtp" };
  } catch (err) {
    console.error("Failed to send email notification:", err);
    return {
      sent: false,
      mode: "smtp",
      error: err instanceof Error ? err.message : "SMTP error",
    };
  }
}

export async function sendDatasetApprovedEmail(params: {
  to: string;
  ownerName: string;
  datasetTitle: string;
  datasetSlug: string;
  reviewNote?: string | null;
}): Promise<EmailResult> {
  const datasetUrl = `${getAppUrl()}/datasets/${params.datasetSlug}`;
  const subject = `Approved & Published: "${params.datasetTitle}" — Just Research`;
  const noteBlock = params.reviewNote
    ? `\nReviewer note: ${params.reviewNote}\n`
    : "";

  const text = `Hello ${params.ownerName},

Great news! Your dataset "${params.datasetTitle}" has been reviewed by the Just Research editorial team, approved, and published.
${noteBlock}
You can view and share your published dataset here:
${datasetUrl}

Thank you for contributing to open research,
The Just Research Team`;

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
        <strong style="font-size: 16px;">Just Research</strong>
        <span style="color: #64748b; font-size: 12px; margin-left: 8px;">Open Data Source</span>
      </div>
      <p>Hello ${params.ownerName},</p>
      <p>Your dataset <strong>${params.datasetTitle}</strong> has been reviewed, <strong>approved</strong>, and is now published on Just Research.</p>
      ${
        params.reviewNote
          ? `<div style="background: #f8fafc; border-left: 3px solid #4f46e5; padding: 10px 14px; margin: 16px 0; font-size: 14px;"><strong>Reviewer note:</strong> ${params.reviewNote}</div>`
          : ""
      }
      <p style="margin: 24px 0;">
        <a href="${datasetUrl}" style="background: #090d16; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          View Published Dataset
        </a>
      </p>
      <p style="color: #64748b; font-size: 13px;">Thank you for contributing to open research,<br/>The Just Research Team</p>
    </div>
  `;

  return sendEmail({ to: params.to, subject, text, html });
}

export async function sendDatasetRejectedEmail(params: {
  to: string;
  ownerName: string;
  datasetTitle: string;
  datasetSlug: string;
  reviewNote?: string | null;
}): Promise<EmailResult> {
  const datasetUrl = `${getAppUrl()}/datasets/${params.datasetSlug}`;
  const subject = `Review Update for "${params.datasetTitle}" — Just Research`;
  const reason =
    params.reviewNote ||
    "Please review your dataset metadata and files and contact the administrator.";

  const text = `Hello ${params.ownerName},

Your dataset "${params.datasetTitle}" was reviewed by an administrator and was not approved for publication at this time.

Reviewer feedback:
${reason}

You can view your dataset here:
${datasetUrl}

Regards,
The Just Research Team`;

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
        <strong style="font-size: 16px;">Just Research</strong>
      </div>
      <p>Hello ${params.ownerName},</p>
      <p>Your dataset <strong>${params.datasetTitle}</strong> was reviewed and could not be approved for publication at this time.</p>
      <div style="background: #fef2f2; border-left: 3px solid #dc2626; padding: 10px 14px; margin: 16px 0; font-size: 14px;">
        <strong>Reviewer feedback:</strong> ${reason}
      </div>
      <p><a href="${datasetUrl}" style="color: #4f46e5;">View your dataset</a></p>
      <p style="color: #64748b; font-size: 13px;">Regards,<br/>The Just Research Team</p>
    </div>
  `;

  return sendEmail({ to: params.to, subject, text, html });
}

export async function sendDeletionDecisionEmail(params: {
  to: string;
  ownerName: string;
  datasetTitle: string;
  approved: boolean;
  adminNote?: string | null;
}): Promise<EmailResult> {
  const subject = params.approved
    ? `Deletion Request Approved: "${params.datasetTitle}" — Just Research`
    : `Deletion Request Declined: "${params.datasetTitle}" — Just Research`;

  const noteLine = params.adminNote ? `\nAdmin note: ${params.adminNote}\n` : "";

  const text = params.approved
    ? `Hello ${params.ownerName},\n\nYour deletion request for "${params.datasetTitle}" has been approved by an administrator, and the dataset and its files have been permanently removed.\n${noteLine}\nRegards,\nThe Just Research Team`
    : `Hello ${params.ownerName},\n\nYour deletion request for "${params.datasetTitle}" was declined by an administrator, so the dataset remains in the repository.\n${noteLine}\nRegards,\nThe Just Research Team`;

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a; line-height: 1.6;">
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
        <strong style="font-size: 16px;">Just Research</strong>
      </div>
      <p>Hello ${params.ownerName},</p>
      <p>Your deletion request for <strong>${params.datasetTitle}</strong> has been <strong>${params.approved ? "approved and permanently removed" : "declined"}</strong>.</p>
      ${
        params.adminNote
          ? `<div style="background: #f8fafc; border-left: 3px solid #64748b; padding: 10px 14px; margin: 16px 0; font-size: 14px;"><strong>Admin note:</strong> ${params.adminNote}</div>`
          : ""
      }
      <p style="color: #64748b; font-size: 13px;">Regards,<br/>The Just Research Team</p>
    </div>
  `;

  return sendEmail({ to: params.to, subject, text, html });
}
