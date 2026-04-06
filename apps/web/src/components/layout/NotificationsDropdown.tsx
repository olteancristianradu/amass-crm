import { useState, useEffect, useRef, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, F } from '@/styles/tokens';
import { api } from '@/services/api';

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

interface NotificationsResponse {
  notifications: Notification[];
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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await api('/notifications?limit=10')) as NotificationsResponse;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently fail for dropdown
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    setOpen((prev) => !prev);
    if (!open) fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate('/notifications');
  };

  const wrapper: CSSProperties = {
    position: 'relative',
  };

  const bellBtn: CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    padding: '6px 8px',
    borderRadius: 8,
    fontSize: 18,
    lineHeight: 1,
    color: T.text2,
    transition: 'background .15s',
  };

  const badgeCount: CSSProperties = {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    background: T.red,
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 4px',
    fontFamily: F,
  };

  const dropdown: CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    width: 340,
    maxHeight: 440,
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    boxShadow: `0 8px 32px ${T.shadow}`,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: F,
  };

  const dropdownHeader: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: `1px solid ${T.border2}`,
  };

  const listWrap: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
  };

  const notifItem = (read: boolean): CSSProperties => ({
    display: 'flex',
    gap: 10,
    padding: '10px 16px',
    borderBottom: `1px solid ${T.border2}`,
    cursor: 'pointer',
    background: read ? 'transparent' : T.accentLt,
    transition: 'background .15s',
  });

  const dropdownFooter: CSSProperties = {
    padding: '10px 16px',
    textAlign: 'center',
    borderTop: `1px solid ${T.border2}`,
  };

  return (
    <div ref={wrapperRef} style={wrapper}>
      <button style={bellBtn} onClick={handleToggle}>
        {'\uD83D\uDD14'}
        {unreadCount > 0 && (
          <span style={badgeCount}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={dropdown}>
          <div style={dropdownHeader}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.accent,
                  padding: 0,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={listWrap}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: T.text3, fontSize: 12 }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: T.text3, fontSize: 12 }}>
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  style={notifItem(n.read)}
                  onClick={() => {
                    if (!n.read) markAsRead(n.id);
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.2 }}>
                    {TYPE_ICONS[n.type] || '\uD83D\uDD14'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: n.read ? 500 : 700,
                          color: T.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.title}
                      </span>
                      {!n.read && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: T.accent,
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: T.text2,
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {n.body}
                    </div>
                    <div style={{ fontSize: 10, color: T.text3, marginTop: 3 }}>
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={dropdownFooter}>
            <button
              onClick={handleViewAll}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: T.accent,
                padding: 0,
              }}
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
