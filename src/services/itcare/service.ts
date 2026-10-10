import {
  statusLabel,
  toStatusCode,
  type Employee,
  type Incident,
  type StatusCode,
  type TicketChange,
} from '../../api/itcare/domain.ts';
export type ProfileRow = {
  id: string;
  full_name: string;
  department: string;
  role: 'employee' | 'it';
  active: boolean;
};
export type TicketRow = {
  id: string;
  ticket_number: string;
  employee_id: string;
  description: string;
  status: StatusCode;
  support_method: 'remote' | 'onsite' | null;
  resolution: string | null;
  created_at: string;
  submitted_at: string | null;
};
export type AttachmentRow = {
  id: string;
  ticket_id: string;
  storage_path: string;
  content_type: string;
  file_size: number;
  ready: boolean;
  position: number;
};
export type CommentRow = {
  ticket_id: string;
  author_id: string;
  message: string;
  created_at: string;
};
export type EventRow = {
  id: string;
  actor_id: string;
  ticket_id: string;
  event_type: string;
  event_data: {
    changes?: { status?: StatusCode; support_method?: string; reply?: string; resolution?: string };
  };
  created_at: string;
};
export type FileManifest = { content_type: string; file_size: number; sha256: string };
export interface CareGateway {
  profiles(): Promise<ProfileRow[]>;
  tickets(): Promise<TicketRow[]>;
  attachments(): Promise<AttachmentRow[]>;
  comments(): Promise<CommentRow[]>;
  events(): Promise<EventRow[]>;
  prepare(requestId: string, description: string, files: FileManifest[]): Promise<TicketRow>;
  finalize(id: string): Promise<TicketRow>;
  upload(path: string, image: Blob): Promise<void>;
  signedUrl(path: string): Promise<string>;
  change(id: string, operationId: string, input: Record<string, string>): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
}
export function mapProfile(row: ProfileRow): Employee {
  return {
    id: row.id,
    name: row.full_name,
    department: row.department,
    role: row.role,
    active: row.active,
  };
}
export async function imageBlob(photo: string): Promise<Blob> {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(photo))
    throw new Error('Định dạng ảnh không hợp lệ.');
  const [header, encoded] = photo.split(',');
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  if (!bytes.length || bytes.length > 5242880) throw new Error('Ảnh phải nhỏ hơn hoặc bằng 5 MB.');
  const type = header.slice(5, header.indexOf(';'));
  const valid =
    type === 'image/jpeg'
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : type === 'image/png'
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
        : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
          String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!valid) throw new Error('Nội dung ảnh không hợp lệ. Vui lòng chọn lại ảnh.');
  return new Blob([bytes], { type });
}
export function createCareService(gateway: CareGateway) {
  return {
    async list(): Promise<Incident[]> {
      const [tickets, attachments, comments, events, profiles] = await Promise.all([
        gateway.tickets(),
        gateway.attachments(),
        gateway.comments(),
        gateway.events(),
        gateway.profiles(),
      ]);
      const urls = new Map<string, string>();
      await Promise.all(
        attachments
          .filter((a) => a.ready)
          .map(async (a) => {
            urls.set(a.id, await gateway.signedUrl(a.storage_path));
          }),
      );
      return tickets
        .filter((t) => t.submitted_at)
        .map((t) => ({
          id: t.ticket_number,
          databaseId: t.id,
          employeeId: t.employee_id,
          description: t.description || 'Sự cố được báo bằng ảnh',
          created: t.created_at,
          status: statusLabel(t.status),
          method:
            t.support_method === 'remote'
              ? 'Từ xa'
              : t.support_method === 'onsite'
                ? 'Tại chỗ'
                : undefined,
          resolution: t.resolution || undefined,
          photos: attachments
            .filter((a) => a.ticket_id === t.id && a.ready)
            .map((a) => urls.get(a.id)!),
          replies: comments
            .filter((c) => c.ticket_id === t.id)
            .map((c) => ({
              date: c.created_at,
              author: profiles.find((p) => p.id === c.author_id)?.full_name || 'IT',
              text: c.message,
            })),
          history: events
            .filter((e) => e.ticket_id === t.id)
            .map((e) => ({
              date: e.created_at,
              text:
                e.event_type === 'submitted'
                  ? 'Đã gửi yêu cầu'
                  : e.event_data.changes?.status
                    ? statusLabel(e.event_data.changes.status)
                    : e.event_data.changes?.support_method
                      ? `Hỗ trợ: ${e.event_data.changes.support_method === 'remote' ? 'Từ xa' : 'Tại chỗ'}`
                      : 'Đã thêm phản hồi',
            })),
        }));
    },
    async create(description: string, photos: string[], requestId: string, progress?: (message: string) => void): Promise<TicketRow> {
      if (
        photos.length > 3 ||
        (!description.trim() && !photos.length) ||
        description.trim().length > 2000
      )
        throw new Error('Thêm tối đa 3 ảnh hoặc mô tả không quá 2.000 ký tự.');
      const blobs = await Promise.all(photos.map(imageBlob));
      const manifest = await Promise.all(
        blobs.map(async (b) => ({
          content_type: b.type,
          file_size: b.size,
          sha256: Array.from(
            new Uint8Array(await crypto.subtle.digest('SHA-256', await b.arrayBuffer())),
          )
            .map((v) => v.toString(16).padStart(2, '0'))
            .join(''),
        })),
      );
      progress?.('Đang chuẩn bị yêu cầu…');
      const ticket = await gateway.prepare(requestId, description.trim(), manifest);
      if (ticket.submitted_at) return ticket;
      const reserved = (await gateway.attachments())
        .filter((a) => a.ticket_id === ticket.id)
        .sort((a, b) => a.position - b.position);
      if (reserved.length !== blobs.length)
        throw new Error('Danh sách ảnh không khớp. Vui lòng thử lại.');
      for (let i = 0; i < blobs.length; i++) {
        progress?.(`Đang tải ảnh ${i + 1}/${blobs.length}…`);
        await gateway.upload(reserved[i].storage_path, blobs[i]);
      }
      progress?.('Đang xác nhận yêu cầu…');
      return gateway.finalize(ticket.id);
    },
    async update(ticket: Incident, input: TicketChange, operationId: string) {
      if (!ticket.databaseId) throw new Error('Không tìm thấy mã dữ liệu yêu cầu.');
      const changes: Record<string, string> = {};
      if (input.status) changes.status = toStatusCode(input.status);
      if (input.method) {
        if (!['Từ xa', 'Tại chỗ'].includes(input.method))
          throw new Error('Hình thức hỗ trợ không hợp lệ.');
        changes.support_method = input.method === 'Từ xa' ? 'remote' : 'onsite';
      }
      if (input.reply) changes.reply = input.reply.trim();
      if (input.resolution) changes.resolution = input.resolution.trim();
      await gateway.change(ticket.databaseId, operationId, changes);
    },
  };
}
