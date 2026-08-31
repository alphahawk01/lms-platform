import { Resend } from "resend";

const FROM = "Premier Data Training <noreply@premierdata-technology.com>";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://training.premierdata-technology.com";

export type NotificationTemplate =
  | "new_course"
  | "reminder"
  | "due_soon"
  | "custom";

type TemplateData = {
  fullName: string;
  courseTitle: string;
  dueDate?: string | null;
  customSubject?: string;
  customMessage?: string;
};

// Builds the subject + HTML body for each notification template.
export function buildEmail(
  template: NotificationTemplate,
  data: TemplateData
): { subject: string; html: string } {
  const name = data.fullName || "there";
  const course = data.courseTitle;
  const courseLink = `${SITE_URL}/courses`;

  const wrap = (heading: string, body: string, cta = "Go to my courses") => ({
    subject: heading,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0a1830; border-radius: 16px; overflow: hidden;">
        <div style="background: #061020; padding: 24px 32px;">
          <span style="font-size: 20px; font-weight: 800; color: #ffffff;">PREMIER<span style="color:#e11b2d;">DATA</span></span>
        </div>
        <div style="padding: 32px; color: #e2e8f0;">
          <h1 style="margin: 0 0 16px; font-size: 22px; color: #ffffff;">${heading}</h1>
          <div style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">${body}</div>
          <div style="margin-top: 28px;">
            <a href="${courseLink}" style="display: inline-block; background: #e11b2d; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 10px;">${cta}</a>
          </div>
        </div>
        <div style="padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #64748b;">
          Premier Data Training &middot; Building skills. Driving results.
        </div>
      </div>
    `,
  });

  switch (template) {
    case "new_course":
      return wrap(
        "You've been assigned a new course",
        `Hi ${name},<br/><br/>A new course has been allocated to you: <strong style="color:#ffffff;">${course}</strong>.<br/><br/>Log in to get started.`,
        "Start course"
      );

    case "reminder":
      return wrap(
        "Reminder: finish your training",
        `Hi ${name},<br/><br/>This is a friendly reminder to complete your course: <strong style="color:#ffffff;">${course}</strong>.<br/><br/>Pick up where you left off.`,
        "Continue course"
      );

    case "due_soon":
      return wrap(
        "Your course is due soon",
        `Hi ${name},<br/><br/>Your course <strong style="color:#ffffff;">${course}</strong> is due${
          data.dueDate
            ? ` by <strong style="color:#ffffff;">${new Date(
                data.dueDate
              ).toLocaleDateString()}</strong>`
            : " soon"
        }.<br/><br/>Please complete it before the deadline.`,
        "Complete now"
      );

    case "custom":
      return {
        subject: data.customSubject || "A message from Premier Data Training",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0a1830; border-radius: 16px; overflow: hidden;">
            <div style="background: #061020; padding: 24px 32px;">
              <span style="font-size: 20px; font-weight: 800; color: #ffffff;">PREMIER<span style="color:#e11b2d;">DATA</span></span>
            </div>
            <div style="padding: 32px; color: #e2e8f0;">
              <div style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">Hi ${name},<br/><br/>${(
                data.customMessage || ""
              ).replace(/\n/g, "<br/>")}</div>
              <div style="margin-top: 28px;">
                <a href="${courseLink}" style="display: inline-block; background: #e11b2d; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 10px;">Go to my courses</a>
              </div>
            </div>
            <div style="padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #64748b;">
              Premier Data Training &middot; Building skills. Driving results.
            </div>
          </div>
        `,
      };
  }
}

// Sends a notification email via Resend.
export async function sendNotification(
  to: string,
  template: NotificationTemplate,
  data: TemplateData
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const resend = new Resend(apiKey);
  const { subject, html } = buildEmail(template, data);

  return resend.emails.send({ from: FROM, to, subject, html });
}
