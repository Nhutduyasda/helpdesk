import { imageBlob } from "./service.ts";

export type PublicReport = {
  name: string;
  department: string;
  location: string;
  description: string;
};
export function validateReport(
  input: PublicReport,
  departments: string[],
  count: number,
) {
  if (!input.name.trim() || input.name.trim().length > 120) {
    throw new Error("Vui lòng nhập họ tên (tối đa 120 ký tự).");
  }
  if (!departments.includes(input.department)) {
    throw new Error("Vui lòng chọn phòng ban.");
  }
  if (
    input.location.trim().length > 200 ||
    input.description.trim().length > 2000 || count > 3 ||
    (!input.description.trim() && !count)
  ) {
    throw new Error(
      "Thêm mô tả hoặc tối đa 3 ảnh; kiểm tra giới hạn nội dung.",
    );
  }
}
export async function submitPublicReport(
  input: PublicReport,
  photos: string[],
  requestId: string,
  token: string,
) {
  const body = new FormData();
  Object.entries(input).forEach(([key, value]) =>
    body.append(key, value.trim())
  );
  body.append("requestId", requestId);
  body.append("token", token);
  for (const photo of photos) {
    body.append("photos", await imageBlob(photo), "incident");
  }
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-intake`,
    { method: "POST", body, credentials: "omit" },
  );
  const result = await response.json();
  if (!response.ok || typeof result.ticketNumber !== "string") {
    throw new Error(
      "Chưa gửi được yêu cầu. Kiểm tra xác minh, kết nối rồi thử lại; nội dung được giữ lại.",
    );
  }
  return result.ticketNumber as string;
}
