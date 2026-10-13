import { type ReactNode, useRef, useState } from "react";
import { Link } from "react-router";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOnline } from "@/hooks/use-online";
import {
  submitPublicReport,
  validateReport,
} from "@/services/itcare/public-intake";
import LightDark from "@/layouts/full/vertical/header/Light-Dark";
import Turnstile from "./Turnstile";
function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-xl mx-auto p-4 flex items-center justify-between">
          <Link to="/report" className="font-semibold text-lg">ITCare</Link>
          <div className="flex items-center gap-3">
            <Link
              to="/it/login"
              className="text-sm underline min-h-11 flex items-center"
            >
              Quản trị IT
            </Link>
            <LightDark />
          </div>
        </div>
      </header>
      <main className="max-w-xl mx-auto p-4 pb-12 space-y-6">{children}</main>
    </div>
  );
}
export default function PublicReportPage() {
  const online = useOnline();
  const requestId = useRef(crypto.randomUUID());
  const submissionLock = useRef(false);
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const departments = (import.meta.env.VITE_ITCARE_DEPARTMENTS || "").split("|")
    .map((v: string) => v.trim()).filter(Boolean);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const [token, setToken] = useState("");
  const [reset, setReset] = useState(0);
  const [receipt, setReceipt] = useState("");
  const configured = departments.length > 0 &&
    !!import.meta.env.VITE_TURNSTILE_SITE_KEY &&
    !!import.meta.env.VITE_SUPABASE_URL;
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  async function select(files: FileList | null) {
    if (!files) return;
    setError("");
    const picked = Array.from(files);
    if (
      picked.length + photos.length > 3 ||
      picked.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          f.size > 5 * 1024 * 1024,
      )
    ) {
      setError("Chọn tối đa 3 ảnh JPG, PNG hoặc WebP; mỗi ảnh không quá 5 MB.");
      return;
    }
    setReading(true);
    try {
      const images = await Promise.all(
        picked.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(new Error("Không đọc được ảnh."));
              reader.readAsDataURL(file);
            }),
        ),
      );
      requestId.current = crypto.randomUUID();
      setPhotos((previous) => [...previous, ...images]);
    } catch {
      setError("Không đọc được ảnh. Vui lòng chọn lại.");
    } finally {
      setReading(false);
    }
  }
  if (receipt) {
    return (
      <PublicShell>
        <Card className="p-6 text-center space-y-4">
          <h1>Đã gửi yêu cầu</h1>
          <strong>{receipt}</strong>
          <p>IT sẽ tiếp nhận và liên hệ với bạn. Hãy lưu mã yêu cầu này.</p>
          <Button onClick={() => window.location.assign("/report")}>
            Báo sự cố khác
          </Button>
        </Card>
      </PublicShell>
    );
  }
  return (
    <PublicShell>
      <div>
        <h1 className="text-2xl">Báo sự cố</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Thêm ảnh hoặc viết vài dòng về vấn đề bạn gặp.
        </p>
      </div>
      <form
        className="space-y-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (submissionLock.current) return;
          if (!online) {
            setError(
              "Mất kết nối. Ảnh và mô tả vẫn được giữ trên màn hình; kết nối mạng rồi thử lại.",
            );
            return;
          }
          if (!description.trim() && !photos.length) {
            setError("Vui lòng thêm ảnh hoặc mô tả sự cố.");
            return;
          }
          try {
            validateReport(
              { name, department, location, description },
              departments,
              photos.length,
            );
          } catch (err) {
            setError((err as Error).message);
            return;
          }
          if (!token || !configured) {
            setError("Vui lòng hoàn tất xác minh.");
            return;
          }
          submissionLock.current = true;
          setBusy(true);
          setError("");
          try {
            setReceipt(
              await submitPublicReport(
                { name, department, location, description },
                photos,
                requestId.current,
                token,
              ),
            );
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Chưa gửi được yêu cầu. Nội dung vẫn được giữ lại, vui lòng thử lại.",
            );
          } finally {
            setToken("");
            setReset((v) => v + 1);
            setBusy(false);
            submissionLock.current = false;
          }
        }}
      >
        <fieldset disabled={busy} className="space-y-4">
          <Label htmlFor="full-name">Họ tên *</Label>
          <Input
            id="full-name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => {
              requestId.current = crypto.randomUUID();
              setName(e.target.value);
            }}
            autoComplete="name"
          />
          <Label htmlFor="department">Phòng ban *</Label>
          <select
            id="department"
            required
            className="w-full min-h-11 border rounded-md bg-background px-3"
            value={department}
            onChange={(e) => {
              requestId.current = crypto.randomUUID();
              setDepartment(e.target.value);
            }}
          >
            <option value="">Chọn phòng ban</option>
            {departments.map((v: string) => <option key={v}>{v}</option>)}
          </select>
          <Label htmlFor="location">
            Máy trạm / phòng / tầng / thiết bị (tùy chọn)
          </Label>
          <Input
            id="location"
            maxLength={200}
            value={location}
            onChange={(e) => {
              requestId.current = crypto.randomUUID();
              setLocation(e.target.value);
            }}
          />
        </fieldset>
        {!configured && (
          <p role="alert">
            Cổng báo sự cố đang chờ cấu hình phòng ban và xác minh. Vui lòng
            liên hệ IT trực tiếp.
          </p>
        )}
        <Card className="ring-1! ring-border! p-4">
          <Label htmlFor="photos">Ảnh sự cố</Label>
          <p className="text-sm text-muted-foreground">
            Tối đa 3 ảnh · JPG, PNG, WebP · 5 MB/ảnh
          </p>
          <div className="border border-dashed p-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-12"
                disabled={busy || reading}
                onClick={() => camera.current?.click()}
              >
                <Camera />
                Chụp ảnh
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-12"
                disabled={busy || reading}
                onClick={() => gallery.current?.click()}
              >
                Chọn ảnh
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ảnh lỗi hoặc thiết bị sẽ giúp IT hiểu vấn đề.
            </p>
            <input
              ref={camera}
              aria-label="Chụp ảnh sự cố"
              id="camera"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              disabled={busy || reading}
              onChange={(e) => {
                void select(e.target.files);
                e.target.value = "";
              }}
              className="sr-only"
            />
            <input
              ref={gallery}
              aria-label="Chọn ảnh có sẵn"
              id="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={busy || reading}
              onChange={(e) => {
                void select(e.target.files);
                e.target.value = "";
              }}
              className="sr-only"
            />
          </div>
          {reading && <p role="status">Đang đọc ảnh…</p>}
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, i) => (
              <div key={photo} className="space-y-2">
                <img
                  className="w-full h-32 object-contain border"
                  src={photo}
                  alt={`Ảnh sự cố ${i + 1}`}
                />
                <Button
                  type="button"
                  disabled={busy}
                  variant="outline"
                  className="min-h-11"
                  onClick={() => {
                    requestId.current = crypto.randomUUID();
                    setPhotos(photos.filter((_, j) => i !== j));
                  }}
                >
                  Xóa ảnh {i + 1}
                </Button>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-2">
          <Label htmlFor="description">Mô tả (không bắt buộc nếu có ảnh)</Label>
          <Textarea
            id="description"
            className="min-h-32 text-base"
            maxLength={2000}
            placeholder="Ví dụ: Máy in không in được từ sáng nay…"
            value={description}
            onChange={(e) => {
              requestId.current = crypto.randomUUID();
              setDescription(e.target.value);
            }}
            disabled={busy}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Họ tên và phòng ban do người gửi tự khai, chưa được xác minh. Không
          gửi mật khẩu hoặc dữ liệu nhạy cảm trong ảnh.
        </p>
        {configured && <Turnstile onToken={setToken} reset={reset} />}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || reading || !configured || !token}
          className="w-full min-h-12"
        >
          {busy ? "Đang gửi yêu cầu…" : "Gửi yêu cầu"}
        </Button>
      </form>
    </PublicShell>
  );
}
