import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { uploadEvidenceToS3 } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Chưa xác thực" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Chưa chọn file" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const s3Url = await uploadEvidenceToS3({
      fileBuffer: buffer,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({ success: true, url: s3Url });
  } catch (error: any) {
    console.error("[Upload Error]", error);
    return NextResponse.json({ error: "Upload thất bại: " + error.message }, { status: 500 });
  }
}
