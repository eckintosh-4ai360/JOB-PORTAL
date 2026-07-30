const nodemailer = require("nodemailer");

// reusable transporter using Gmail App Password
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

// send a single email
const sendEmail = async ({ to, subject, html }) => {
    try {
        await transporter.sendMail({
            from: `"Job Portal" <${process.env.GMAIL_USER}>`,
            to,
            subject,
            html,
        });
        console.log(`📧 Email sent to ${to}: ${subject}`);
    } catch (error) {
        console.error("Failed to send email:", error.message);
    }
};

// EMAIL TEMPLATES

// Sent to the applicant when they first submit their application.
const sendApplicationSubmittedEmail = async ({ to, applicantName, jobTitle }) => {
    await sendEmail({
        to,
        subject: `✅ Application Received — ${jobTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9; border-radius: 8px;">
                <h2 style="color: #2563eb;">Application Received!</h2>
                <p>Hi <strong>${applicantName}</strong>,</p>
                <p>We've successfully received your application for the position of <strong>${jobTitle}</strong>.</p>
                <p>The employer will review your application and get back to you. You can expect an update on your application status.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #6b7280; font-size: 14px;">This is an automated message from Job Portal. Please do not reply to this email.</p>
            </div>
        `,
    });
};

// Sent when employer changes status to "Under Review".
const sendUnderReviewEmail = async ({ to, applicantName, jobTitle }) => {
    await sendEmail({
        to,
        subject: `🔍 Your Application Is Under Review — ${jobTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9; border-radius: 8px;">
                <h2 style="color: #d97706;">Application Under Review</h2>
                <p>Hi <strong>${applicantName}</strong>,</p>
                <p>Great news! The employer is currently reviewing your application for <strong>${jobTitle}</strong>.</p>
                <p>We'll notify you as soon as there's a further update.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #6b7280; font-size: 14px;">This is an automated message from Job Portal.</p>
            </div>
        `,
    });
};

// Sent when employer schedules an interview.
const sendInterviewScheduledEmail = async ({ to, applicantName, jobTitle, interview }) => {
    await sendEmail({
        to,
        subject: `🎉 Interview Scheduled — ${jobTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9; border-radius: 8px;">
                <h2 style="color: #059669;">Interview Scheduled!</h2>
                <p>Hi <strong>${applicantName}</strong>,</p>
                <p>Congratulations! You've been shortlisted for an interview for the position of <strong>${jobTitle}</strong>.</p>
                <div style="background: #ecfdf5; border-left: 4px solid #059669; padding: 16px; border-radius: 4px; margin: 16px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>📅 Date:</strong> ${new Date(interview.date).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                    <p style="margin: 0 0 8px 0;"><strong>⏰ Time:</strong> ${interview.time}</p>
                    <p style="margin: 0 0 8px 0;"><strong>📍 Location / Link:</strong> ${interview.location}</p>
                    ${interview.notes ? `<p style="margin: 0;"><strong>📝 Notes:</strong> ${interview.notes}</p>` : ""}
                </div>
                <p>Please confirm your availability or reach out if you need to reschedule.</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #6b7280; font-size: 14px;">This is an automated message from Job Portal.</p>
            </div>
        `,
    });
};

// Sent when employer marks the application as "Offered".
const sendOfferEmail = async ({ to, applicantName, jobTitle }) => {
    await sendEmail({
        to,
        subject: `🌟 You've Received a Job Offer — ${jobTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9; border-radius: 8px;">
                <h2 style="color: #7c3aed;">Congratulations — You Got the Offer!</h2>
                <p>Hi <strong>${applicantName}</strong>,</p>
                <p>We're thrilled to inform you that you've received a <strong>job offer</strong> for the position of <strong>${jobTitle}</strong>!</p>
                <p>The employer will be in touch with you shortly with further details about the offer.</p>
                <p>Wishing you all the best in this exciting new chapter! 🎊</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #6b7280; font-size: 14px;">This is an automated message from Job Portal.</p>
            </div>
        `,
    });
};

// Sent when the employer rejects an application.
const sendRejectionEmail = async ({ to, applicantName, jobTitle }) => {
    await sendEmail({
        to,
        subject: `Application Update — ${jobTitle}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9; border-radius: 8px;">
                <h2 style="color: #dc2626;">Application Update</h2>
                <p>Hi <strong>${applicantName}</strong>,</p>
                <p>Thank you for your interest in the <strong>${jobTitle}</strong> position and for taking the time to apply.</p>
                <p>After careful consideration, the employer has decided to move forward with other candidates at this time.</p>
                <p>We encourage you to keep exploring other opportunities on our platform. Don't be discouraged — the right role is out there!</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #6b7280; font-size: 14px;">This is an automated message from Job Portal.</p>
            </div>
        `,
    });
};

module.exports = {
    sendApplicationSubmittedEmail,
    sendUnderReviewEmail,
    sendInterviewScheduledEmail,
    sendOfferEmail,
    sendRejectionEmail,
};
