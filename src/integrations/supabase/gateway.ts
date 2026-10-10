import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CareGateway,
  ProfileRow,
  TicketRow,
  AttachmentRow,
  CommentRow,
  EventRow,
} from '../../services/itcare/service.ts';
// This is the single SDK query boundary. DTOs mirror the reproducible migration.
export function supabaseGateway(client: SupabaseClient): CareGateway {
  async function rows<T>(table: string, order: string): Promise<T[]> {
    const { data, error } = await client.from(table).select('*').order(order);
    if (error) throw new Error('Không đọc được dữ liệu. Kiểm tra kết nối và quyền tài khoản.');
    return (data || []) as T[];
  }
  async function rpc<T>(name: string, input: Record<string, unknown>): Promise<T> {
    const { data, error } = await client.rpc(name, input);
    if (error)
      throw new Error('Không lưu được thao tác. Kiểm tra quyền, trạng thái yêu cầu và thử lại.');
    return data as T;
  }
  return {
    profiles: () => rows<ProfileRow>('profiles', 'full_name'),
    tickets: async () => {
      const { data, error } = await client
        .from('tickets')
        .select('*')
        .not('submitted_at', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw new Error('Không tải được yêu cầu.');
      return data as TicketRow[];
    },
    attachments: () => rows<AttachmentRow>('ticket_attachments', 'position'),
    comments: () => rows<CommentRow>('ticket_comments', 'created_at'),
    events: () => rows<EventRow>('ticket_events', 'created_at'),
    prepare: (id, description, files) =>
      rpc<TicketRow>('prepare_ticket', {
        p_request_id: id,
        p_description: description,
        p_files: files,
      }),
    finalize: (id) => rpc<TicketRow>('finalize_ticket', { p_ticket_id: id }),
    change: async (id, operation, input) => {
      await rpc('update_ticket', { p_ticket_id: id, p_operation_id: operation, p_changes: input });
    },
    setActive: async (id, active) => {
      await rpc('set_employee_active', { p_employee_id: id, p_active: active });
    },
    upload: async (path, image) => {
      const { error } = await client.storage
        .from('incident-photos')
        .upload(path, image, { contentType: image.type, upsert: false });
      // Standard uploads may report duplicate objects as either 400 or 409.
      const duplicate = error && ['400', '409'].includes(String(error.statusCode)) &&
        /already exists|AssetAlreadyExists|ResourceAlreadyExists/i.test(error.message);
      if (error && !duplicate)
        throw new Error('Tải ảnh thất bại. Yêu cầu chưa hoàn tất; vui lòng thử lại.');
    },
    signedUrl: async (path) => {
      const { data, error } = await client.storage
        .from('incident-photos')
        .createSignedUrl(path, 120);
      if (error) throw new Error('Không tải được ảnh đính kèm.');
      return data.signedUrl;
    },
  };
}
