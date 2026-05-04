import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const EMAIL_HTML = (jobTitle: string, clipsCount: number, dashboardUrl: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#050505;font-family:'Inter',system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">
    <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
      <div style="font-size:32px;margin-bottom:8px;">⚡</div>
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">Your clips are ready!</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:15px;">Your video has been processed</p>
    </div>
    <div style="background:#0d0d0d;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin-bottom:24px;">
      <p style="color:#94a3b8;margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Video</p>
      <p style="color:#fff;margin:0 0 20px;font-size:16px;font-weight:600;">${jobTitle}</p>
      <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#a78bfa;margin:0;font-size:28px;font-weight:700;">${clipsCount}</p>
        <p style="color:#7c3aed;margin:4px 0 0;font-size:13px;font-weight:600;">VIRAL CLIPS READY</p>
      </div>
    </div>
    <div style="text-align:center;margin-bottom:32px;">
      <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;">
        View &amp; Download Clips →
      </a>
    </div>
    <p style="color:#334155;text-align:center;font-size:12px;margin:0;">
      AI Video Clipping<br>
      Built with AssemblyAI · Google Gemini · FFmpeg
    </p>
  </div>
</body>
</html>
`;

export async function POST(req: NextRequest) {
  try {
    const { email, jobTitle, clipsCount } = await req.json();

    if (!email) {
      return NextResponse.json({ ok: false, error: "No email provided" }, { status: 400 });
    }

    if (!process.env.NOTIFY_EMAIL_FROM || !process.env.NOTIFY_EMAIL_PASS) {
      return NextResponse.json({ ok: true, sent: false, reason: "Email credentials not configured in .env.local" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NOTIFY_EMAIL_FROM,
        pass: process.env.NOTIFY_EMAIL_PASS,
      },
    });

    const dashboardUrl = process.env.NEXTAUTH_URL
      ? `${process.env.NEXTAUTH_URL}/dashboard`
      : "http://localhost:3000/dashboard";

    await transporter.sendMail({
      from: `AI Video Clips ⚡ <${process.env.NOTIFY_EMAIL_FROM}>`,
      to: email,
      subject: `🎬 Your ${clipsCount} viral clips are ready — ${jobTitle ?? "Your video"}`,
      html: EMAIL_HTML(jobTitle ?? "Your video", clipsCount ?? 5, dashboardUrl),
    });

    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error("[notify] Email error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
