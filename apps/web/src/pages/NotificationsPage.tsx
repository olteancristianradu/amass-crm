import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, F } from '@/styles/tokens';
import { api } from '@/services/api';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';

type NotificationType =
  | 'deal_won'
  | 'deal_lost'
  | 'task_due'
  | 'task_overdue'
  | 'mention'
  | 'system'
  | 'assignment';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsListResponse {
  notifications: Notification[];
  total: number;
  totalPages: number;
  unreadCount: number;
}

const TYPE_ICONS: Record<NotificationType, string> = {
  deal_won: '\uD83C\uDFC6',
  deal_lost: '\uD83D\uDCC9',
  task_due: '\u23F0',
  task_overdue: '\u26A0',
  mention: '\uD83D\uDCAC',
  system: '\u2699',
  assignment: '\uD83D\uDCCB',
};

const TYPE_COLORS: Record<NotificationType, string> = {
  deal_won: T.green,
  deal_lost: T.red,
  task_due: T.yellow,
  task_overdue: T.red,
  mention: T.blue,
  system: T.purple,
  assignment: T.orange,
};

const TYPE_LABELS: Record<NotificationType, string> = {
  deal_won: 'Deal Won',
  deal_lost: 'Deal Lost',
  task_due: 'Task Due',
  task_overdue: 'Task Overdue',
  mention: 'Mention',
  system: 'System',
  assignment: 'Assignment',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

type FilterType = 'all' | 'unread' | 'read';

export function NotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const limit = 20;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (filter === 'unread') params.set('read', 'false');
      if (filter === 'read') params.set('read', 'true');

      const data = (await api(`/notifications?${params.toString()}`)) as NotificationsListResponse;
      setNotifications(data.notifications);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setUnreadCount(data.unreadCount);
    } catch {
      setToast({ msg: 'Failed to load notifications', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const markAsRead = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      setToast({ msg: 'Failed to mark as read', type: 'error' });
    }
  };

  const markAllRead = async () => {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      setToast({ msg: 'All notifications marked as read', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to mark all as read', type: 'error' });
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api(`/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => prev - 1);
      setToast({ msg: 'Notification deleted', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to delete notification', type: 'error' });
    }
  };

  const pageStyle: CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: T.bg,
    fontFamily: F,
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${T.border}`,
    background: T.surface,
    flexWrap: 'wrap',
    gap: 12,
  };

  const filterBar: CSSProperties = {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    borderBottom: `1px solid ${T.border2}`,
    background: T.surface,
    alignItems: 'center',
  };

  const filterBtn = (active: boolean): CSSProperties => ({
    padding: '6px 14px',
    borderRadius: 8,
    border: `1px solid ${active ? T.accent : T.border}`,
    background: active ? T.accentLt : 'transparent',
    color: active ? T.accent : T.text2,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all .15s',
  });

  const rowStyle = (read: boolean): CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '14px 20px',
    borderBottom: `1px solid ${T.border2}`,
    background: read ? T.surface : T.accentLt,
    transition: 'background .15s',
  });

  const iconWrap = (type: NotificationType): CSSProperties => ({
    width: 36,
    height: 36,
    borderRadius: 10,
    background: (TYPE_COLORS[type] || T.blue) + '18',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    flexShrink: 0,
  });

  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="grad-text"
            style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            AMASS
          </span>
          <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>Notifications</span>
          <span style={{ fontSize: 11, color: T.text3 }}>({total})</span>
          {unreadCount > 0 && (
            <Badge text={`${unreadCount} unread`} color={T.red} />
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <Btn variant="ghost" size="sm" onClick={markAllRead}>
              Mark all as read
            </Btn>
          )}
        </div>
      </div>

      <div style={filterBar}>
        <button style={filterBtn(filter === 'all')} onClick={() => setFilter('all')}>
          All
        </button>
        <button style={filterBtn(filter === 'unread')} onClick={() => setFilter('unread')}>
          Unread
        </button>
        <button style={filterBtn(filter === 'read')} onClick={() => setFilter('read')}>
          Read
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.text2 }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.text3, fontSize: 13 }}>
            {filter === 'unread'
              ? 'No unread notifications'
              : filter === 'read'
                ? 'No read notifications'
                : 'No notifications yet'}
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} style={rowStyle(n.read)}>
              <div style={iconWrap(n.type)}>
                {TYPE_ICONS[n.type] || '\uD83D\uDD14'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: n.read ? 500 : 700,
                      color: T.text,
                    }}
                  >
                    {n.title}
                  </span>
                  <Badge
                    text={TYPE_LABELS[n.type] || n.type}
                    color={TYPE_COLORS[n.type] || T.blue}
                  />
                  {!n.read && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: T.accent,
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: T.text2,
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  {n.body}
                </div>
                <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>
                  {timeAgo(n.createdAt)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                {!n.read && (
                  <Btn size="sm" variant="ghost" onClick={() => markAsRead(n.id)}>
                    Read
                  </Btn>
                )}
                <Btn size="sm" variant="danger" onClick={() => deleteNotification(n.id)}>
                  Delete
                </Btn>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            padding: 12,
            borderTop: `1px solid ${T.border}`,
            background: T.surface,
          }}
        >
          <Btn size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </Btn>
          <span style={{ fontSize: 12, color: T.text2, lineHeight: '28px' }}>
            {page} / {totalPages}
          </span>
          <Btn size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Btn>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
