import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || "ap-southeast-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
}

export async function uploadEvidenceToS3({
  fileBuffer,
  fileName,
  contentType,
}: {
  fileBuffer: Buffer;
  fileName: string;
  contentType: string;
}): Promise<string> {
  const bucketName = process.env.AWS_BUCKET || "eraweb";
  const region = process.env.AWS_REGION || "ap-southeast-1";
  const s3 = getS3Client();

  const timestamp = Date.now();
  const cleanName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const s3Key = `tester/evidence/${timestamp}_${cleanName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3.send(command);

  return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
}
