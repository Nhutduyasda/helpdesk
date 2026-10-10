import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { Link } from 'react-router';
import { Bell } from 'lucide-react';
import { useCare } from '@/context/itcare';
import { supabase } from '@/integrations/supabase/client';
import { supabaseGateway } from '@/integrations/supabase/gateway';
import { notificationItems } from '@/services/itcare/notifications';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle } from '@/components/ui/popover';
function stored(key: string): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string').slice(-500) : []; } catch { return []; }
}
function save(key: string, value: string[]) {
  try { localStorage.setItem(key, JSON.stringify(value.slice(-500))); } catch { /* Notifications still work without persistent preferences. */ }
}
export default function NotificationBell() {
  const { user, demo } = useCare();
  if (!user || demo || !supabase) return null;
  return <LiveBell key={user.id} id={user.id} role={user.role} />;
}
function LiveBell({id, role}: {id: string; role: 'employee' | 'it'}) {
  const readKey = `itcare-notification-read:${id}`;
  const seenKey = `itcare-notification-seen:${id}`;
  const [read, setRead] = useState(() => stored(readKey));
  const [foreground, setForeground] = useState(() => stored(`itcare-notification-optin:${id}`).includes('enabled'));
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => 'Notification' in window ? Notification.permission : 'unsupported');
  const [deliveryError, setDeliveryError] = useState(false);
  const initialized = useRef(false);
  const {data, error} = useSWR(['itcare-notifications',id], async () => {
    const gateway = supabaseGateway(supabase!);
    const [events,tickets,profiles] = await Promise.all([gateway.events(),gateway.tickets(),gateway.profiles()]);
    return notificationItems(events,tickets,profiles,id);
  }, {refreshInterval:5000,revalidateOnFocus:true,revalidateOnReconnect:true});
  useEffect(() => {
    if (!data) return;
    const seen = new Set(stored(seenKey));
    const fresh = data.filter(item => !seen.has(item.id));
    save(seenKey,[...seen,...fresh.map(item=>item.id)]);
    if (!initialized.current) { initialized.current=true; return; }
    if (!foreground || permission !== 'granted' || document.visibilityState !== 'visible') return;
    for (const item of fresh) {
      void (async () => {
        console.info('ITCare foreground notification attempt');
        try {
          const options = {body:'Có cập nhật hỗ trợ mới. Mở ITCare để xem.',tag:`itcare-event-${item.id}`,icon:'/icons/itcare-192.png'};
          const registration = await navigator.serviceWorker?.getRegistration('/');
          if (registration?.active?.scriptURL.endsWith('/itcare-sw.js')) await registration.showNotification('ITCare',options);
          else { const notification = new Notification('ITCare',options); notification.onclick=()=>{window.focus();notification.close();}; }
          console.info('ITCare foreground notification delivered');
        } catch { setDeliveryError(true); console.warn('ITCare foreground notification delivery failed'); }
      })();
    }
  },[data,foreground,permission,seenKey]);
  const unread = (data || []).filter(item=>!read.includes(item.id)).length;
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" className="min-h-11 min-w-11" aria-label={`Thông báo${unread ? ` (${unread} chưa đọc)` : ''}`} />}>
        <Bell />{unread > 0 && <span className="text-xs" aria-hidden="true">{unread}</span>}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)]">
        <PopoverTitle>Thông báo ITCare</PopoverTitle>
        <p className="text-xs text-muted-foreground">Cập nhật khi ứng dụng đang mở. Chưa hỗ trợ thông báo nền.</p>
        {error ? <p role="status">Chưa tải được thông báo. Hệ thống sẽ thử lại; yêu cầu đã gửi vẫn được giữ.</p> : !data ? <p role="status">Đang tải thông báo…</p> : data.length === 0 ? <p>Chưa có thông báo.</p> : <ul className="max-h-64 overflow-auto space-y-2">
          {data.map(item=><li key={item.id}><Link className="block rounded p-2 hover:bg-muted" to={role==='it'?`/it/tickets/${item.ticketNumber}`:`/employee/requests/${item.ticketNumber}`} onClick={()=>{const next=[...new Set([...read,item.id])];setRead(next);save(readKey,next);}}>
            <span className={read.includes(item.id)?'text-muted-foreground':'font-medium'}>{item.label}</span><span className="block text-xs">{item.ticketNumber}</span>
          </Link></li>)}
        </ul>}
        {!!data?.length && <Button className="min-h-11" variant="outline" onClick={()=>{const next=[...new Set([...read,...data.map(item=>item.id)])];setRead(next);save(readKey,next);}}>Đánh dấu tất cả đã đọc</Button>}
        <Button className="min-h-11" variant="outline" disabled={permission==='unsupported'||permission==='denied'} onClick={async()=>{
          if(foreground){setForeground(false);save(`itcare-notification-optin:${id}`,[]);return;}
          try{const result=await Notification.requestPermission();setPermission(result);if(result==='granted'){setForeground(true);save(`itcare-notification-optin:${id}`,['enabled']);}}catch{setDeliveryError(true);}
        }}>{foreground?'Tắt thông báo trên thiết bị':'Bật thông báo khi đang mở app'}</Button>
        {permission==='denied' && <p className="text-xs">Trình duyệt đã chặn thông báo. Thông báo trong ứng dụng vẫn hoạt động.</p>}
        {permission==='unsupported' && <p className="text-xs">Trình duyệt chưa hỗ trợ thông báo trên thiết bị.</p>}
        {deliveryError && <p role="status" className="text-xs">Không gửi được thông báo trên thiết bị. Xem cập nhật trong ứng dụng.</p>}
      </PopoverContent>
    </Popover>
  );
}
