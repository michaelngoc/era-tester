import { createHash } from "node:crypto";

// Giá trị mặc định cũ từng nằm trong mã nguồn (công khai trong lịch sử git). Chỉ lưu sha256
// để từ chối chúng khi còn được đặt ở env: fail closed nếu quên xoay.
const LEGACY_JWT_SECRET_SHA256 = "4d1263d3b1b6d679233aef34ce3096472788f9d4c19fdd68a6f759e6be1165ba";
const LEGACY_DB_PASSWORD_SHA256 = "10bf85526620ba0bf915f044eb2d02e154773bf0cae6e0420b46551dd89dee3d";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const isLegacyJwtSecret = (value: string) => sha256(value) === LEGACY_JWT_SECRET_SHA256;
export const isLegacyDbPassword = (value: string) => sha256(value) === LEGACY_DB_PASSWORD_SHA256;
