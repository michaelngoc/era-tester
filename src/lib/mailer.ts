import "server-only";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

function getSesClient(): SESClient {
  const region = process.env.AWS_REGION || "ap-southeast-1";
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS SES credentials");
  }

  return new SESClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = getSesClient();
    const recipients = Array.isArray(to) ? to : [to];
    const fromEmail = process.env.AWS_SES_FROM_EMAIL || "no-reply@mailer.eraweb.io";

    const command = new SendEmailCommand({
      Source: `Eraweb Tester Hub <${fromEmail}>`,
      Destination: {
        ToAddresses: recipients,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: html,
            Charset: "UTF-8",
          },
        },
      },
    });

    const res = await client.send(command);
    return { success: true, messageId: res.MessageId };
  } catch (error: any) {
    console.error("[AWS SES Error]", error);
    return { success: false, error: error.message };
  }
}

/**
 * Gửi email cho Tester khi có push vào nhánh tester và phát hiện luồng bị ảnh hưởng
 */
export async function sendGitPushImpactEmail({
  recipients,
  commitHash,
  commitMessage,
  author,
  branch,
  impactedModules,
}: {
  recipients: string[];
  commitHash: string;
  commitMessage: string;
  author: string;
  branch: string;
  impactedModules: Array<{ name: string; matchedFiles: string[] }>;
}) {
  if (recipients.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  const shortHash = commitHash.slice(0, 7);

  const modulesHtml = impactedModules
    .map(
      (m) => `
      <li style="margin-bottom: 12px;">
        <strong style="color: #0284c7; font-size: 15px;">📁 ${m.name}</strong>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
          Files thay đổi (${m.matchedFiles.length}): <code>${m.matchedFiles.slice(0, 3).join(", ")}${
        m.matchedFiles.length > 3 ? "..." : ""
      }</code>
        </div>
      </li>
    `
    )
    .join("");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #0f172a; font-size: 20px;">🚀 Cập nhật mã nguồn nhánh [${branch}]</h2>
      </div>
      <p style="color: #334155; font-size: 15px; line-height: 1.6;">
        Dev <strong>${author}</strong> vừa push commit <code>${shortHash}</code>: <em>"${commitMessage}"</em>.
      </p>
      <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #0f172a;">⚡ Các luồng kiểm thử phát hiện bị ảnh hưởng:</h4>
        <ul style="padding-left: 20px; margin: 0;">
          ${modulesHtml}
        </ul>
      </div>
      <div style="text-align: center; margin-top: 28px;">
        <a href="${appUrl}" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">
          Mở Sơ Đồ & Bắt Đầu Kiểm Thử
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: recipients,
    subject: `[Tester Hub] ⚠️ Có cập nhật code nhánh ${branch} - Cần kiểm thử các luồng liên quan`,
    html,
  });
}

/**
 * Gửi email cho Dev khi có Bug mới (status = NEW)
 */
export async function sendBugReportEmail({
  devEmail,
  bugTitle,
  moduleName,
  inputData,
  actualResult,
  caseId,
}: {
  devEmail: string;
  bugTitle: string;
  moduleName: string;
  inputData?: string;
  actualResult?: string;
  caseId: number;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #dc2626; margin-top: 0;">🐞 Báo Cáo Lỗi Mới (Bug Detected)</h2>
      <p style="color: #334155; font-size: 15px;">
        Tester vừa báo cáo một lỗi tại module: <strong>${moduleName}</strong>
      </p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 16px;">${bugTitle}</h3>
        ${inputData ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Input:</strong> <code>${inputData}</code></p>` : ""}
        ${actualResult ? `<p style="margin: 4px 0; font-size: 14px; color: #b91c1c;"><strong>Kết quả thực tế:</strong> ${actualResult}</p>` : ""}
      </div>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${appUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">
          Xem Chi Tiết & Khắc Phục (Bug #${caseId})
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: devEmail,
    subject: `[Bug Alert] 🐞 Lỗi mới: ${bugTitle} (${moduleName})`,
    html,
  });
}

/**
 * Gửi email khi tài khoản được Super Admin duyệt
 */
export async function sendAccountApprovedEmail(userEmail: string, userName: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #dcfce7; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #16a34a; margin-top: 0;">🎉 Tài khoản đã được phê duyệt!</h2>
      <p style="color: #334155;">Chào <strong>${userName}</strong>,</p>
      <p style="color: #334155;">Tài khoản của bạn tại <strong>Eraweb Tester Hub</strong> đã được Super Admin phê duyệt thành công. Bạn hiện đã có toàn quyền truy cập các tính năng kiểm thử.</p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${appUrl}/login" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">
          Đăng Nhập Ngay
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: userEmail,
    subject: `[Tester Hub] 🎉 Tài khoản của bạn đã được kích hoạt`,
    html,
  });
}

/**
 * Gửi email thông báo cho TẤT CẢ các Developers khi Tester phát hiện / báo Bug mới
 */
export async function sendBroadcastBugToDevsEmail({
  devEmails,
  bugTitle,
  moduleName,
  inputData,
  actualResult,
  caseId,
  testerName,
}: {
  devEmails: string[];
  bugTitle: string;
  moduleName: string;
  inputData?: string;
  actualResult?: string;
  caseId: number;
  testerName?: string;
}) {
  if (devEmails.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #fee2e2; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #dc2626; margin-top: 0;">🐞 Bug Mới Cần Xử Lý (Open for Devs)</h2>
      <p style="color: #334155; font-size: 15px;">
        Tester <strong>${testerName || "QA Team"}</strong> vừa báo cáo một lỗi tại module: <strong>${moduleName}</strong>.
      </p>
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0; color: #991b1b; font-size: 16px;">#${caseId}: ${bugTitle}</h3>
        ${inputData ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Đầu vào (Input):</strong> <code>${inputData}</code></p>` : ""}
        ${actualResult ? `<p style="margin: 4px 0; font-size: 14px; color: #b91c1c;"><strong>Lỗi thực tế:</strong> ${actualResult}</p>` : ""}
      </div>
      <p style="color: #64748b; font-size: 13px;">
        Bất kỳ Developer nào sẵn sàng có thể bấm nút bên dưới để nhận task sửa lỗi này.
      </p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${appUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
          Nhận Sửa Bug Này (Claim Task)
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: devEmails,
    subject: `[Bug Alert] 🐞 Lỗi mới: ${bugTitle} (${moduleName}) - Cần Dev nhận task`,
    html,
  });
}

/**
 * Gửi email cho Tester khi Developer đã bấm nhận task sửa bug
 */
export async function sendBugClaimedEmail({
  testerEmail,
  devName,
  bugTitle,
  moduleName,
  caseId,
}: {
  testerEmail: string;
  devName: string;
  bugTitle: string;
  moduleName: string;
  caseId: number;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e0e7ff; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #4f46e5; margin-top: 0;">🛠️ Developer Đã Nhận Sửa Bug</h2>
      <p style="color: #334155;">
        Developer <strong>${devName}</strong> đã nhận task sửa lỗi cho bug:
      </p>
      <div style="background: #f5f3ff; border: 1px solid #ddd6fe; padding: 12px 16px; border-radius: 8px; margin: 12px 0;">
        <strong style="color: #4338ca;">#${caseId}: ${bugTitle}</strong>
        <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">Module: ${moduleName}</div>
      </div>
      <p style="color: #4b5563; font-size: 14px;">Trạng thái đã được chuyển sang <strong>Dev Đang Sửa (FIX)</strong>.</p>
      <div style="text-align: center; margin-top: 20px;">
        <a href="${appUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">
          Theo Dõi Tiến Độ
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: testerEmail,
    subject: `[Tester Hub] 🛠️ Dev ${devName} đã nhận sửa bug #${caseId}: ${bugTitle}`,
    html,
  });
}

/**
 * Gửi email cho Developer khi Tester đã nghiệm thu PASS và chuyển sang Chờ Merge & Deploy Production
 */
export async function sendDeployRequestEmail({
  devEmail,
  devName,
  bugTitle,
  moduleName,
  projectName,
  caseId,
  testerName,
}: {
  devEmail: string;
  devName?: string;
  bugTitle: string;
  moduleName: string;
  projectName?: string;
  caseId: number;
  testerName?: string;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #c7d2fe; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #6366f1; margin-top: 0;">🚀 Yêu Cầu Merge & Deploy Production</h2>
      <p style="color: #334155; font-size: 14px;">
        Xin chào <strong>${devName || "Developer"}</strong>,
      </p>
      <p style="color: #334155; font-size: 14px;">
        Kịch bản kiểm thử sau đây đã được Tester <strong>${testerName || "QA Team"}</strong> xác minh <strong>ĐẠT (PASS)</strong> và sẵn sàng đưa lên môi trường Production:
      </p>
      <div style="background: #eef2ff; border: 1px solid #c7d2fe; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
        <strong style="color: #4338ca; font-size: 15px;">#${caseId}: ${bugTitle}</strong>
        <div style="font-size: 13px; color: #64748b; margin-top: 6px;">
          Dự án: <strong>${projectName || "Eraweb"}</strong> • Nhóm: <strong>${moduleName}</strong>
        </div>
      </div>
      <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #475569;">
        <strong>Hành động cần thực hiện:</strong><br/>
        1. Tạo Pull Request merge nhánh <code>tester</code> vào nhánh <code>main</code>.<br/>
        2. Chạy pipeline CI/CD hoặc kiểm tra sức khỏe hệ thống sau khi deploy Prod.<br/>
        3. Truy cập Tester Hub và bấm <strong>"Deploy Xong / Hoàn Thành"</strong> để báo cáo ban quản lý.
      </div>
      <div style="text-align: center;">
        <a href="${appUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
          Mở Tester Hub & Xác Nhận Deploy
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: devEmail,
    subject: `[Deploy Ready] 🚀 #${caseId}: ${bugTitle} đã Pass - Yêu cầu Merge & Deploy Production`,
    html,
  });
}

/**
 * Gửi email báo cáo hoàn tất Deploy Production cho Ban Quản Lý (Leader, PM, PO, CTO, Super Admin) & Tester
 */
export async function sendDeployCompletedEmail({
  recipients,
  bugTitle,
  moduleName,
  projectName,
  caseId,
  devName,
}: {
  recipients: string[];
  bugTitle: string;
  moduleName: string;
  projectName?: string;
  caseId: number;
  devName?: string;
}) {
  if (recipients.length === 0) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #bbf7d0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #16a34a; margin-top: 0;">🎉 Báo Cáo: Đã Deploy Production Hoàn Tất</h2>
      <p style="color: #334155; font-size: 14px;">
        Kính gửi Ban Quản Lý Dự Án & Đội Ngũ Kiểm Thử,
      </p>
      <p style="color: #334155; font-size: 14px;">
        Developer <strong>${devName || "Kỹ sư phụ trách"}</strong> đã hoàn tất merge mã nguồn và phát hành thành công lên môi trường <strong>Production</strong>:
      </p>
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
        <strong style="color: #15803d; font-size: 15px;">#${caseId}: ${bugTitle}</strong>
        <div style="font-size: 13px; color: #64748b; margin-top: 6px;">
          Dự án: <strong>${projectName || "Eraweb"}</strong> • Module: <strong>${moduleName}</strong>
        </div>
      </div>
      <p style="color: #15803d; font-size: 13px; font-weight: 600;">
        Trạng thái kịch bản đã được chuyển sang: <strong>HOÀN THÀNH / ĐÃ ĐÓNG (CLOSED)</strong>.
      </p>
      <div style="text-align: center; margin-top: 24px;">
        <a href="${appUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; text-decoration: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; font-size: 13px;">
          Xem Tổng Quan Dự Án Trên Hub
        </a>
      </div>
    </div>
  `;

  return sendEmail({
    to: recipients,
    subject: `[Deploy Live] ✅ #${caseId}: ${bugTitle} (${projectName || "Eraweb"}) đã Live Production`,
    html,
  });
}


