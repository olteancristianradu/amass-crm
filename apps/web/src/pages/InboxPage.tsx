import { useState, useEffect, useCallback, useRef, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, F } from '@/styles/tokens';
import { useAuthStore } from '@/store/authStore';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/services/api';

interface InboxContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

interface Message {
  id: string;
  contactId: string;
  direction: 'inbound' | 'outbound';
  channel: 'email' | 'sms';
  content: string;
  subject?: string;
  createdAt: string;
}

interface MessageListResult {
  messages: Message[];
  total: number;
  page: number;
  totalPages: number;
}

type ChannelFilter = 'all' | 'email' | 'sms';

export function InboxPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [contacts, setContacts] = useState<InboxContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<InboxContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [messageText, setMessageText] = useState('');
  const [sendChannel, setSendChannel] = useState<'email' | 'sms'>('email');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadContacts = useCallback(async () => {
    try {
      const data = await api<{ contacts: InboxContact[] }>(`/inbox/contacts?channel=${channelFilter}`);
      setContacts(data.contacts || []);
    } catch (err) {
      console.error('Failed to load inbox contacts:', err);
    }
  }, [channelFilter]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const loadMessages = useCallback(async (contactId: string) => {
    setLoading(true);
    try {
      const data = await api<MessageListResult>(`/inbox/messages/${contactId}?limit=50`);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.id);
    }
  }, [selectedContact, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageText.trim() || !selectedContact) return;
    try {
      await api('/inbox/messages', {
        method: 'POST',
        body: JSON.stringify({
          contactId: selectedContact.id,
          channel: sendChannel,
          content: messageText,
        }),
      });
      setMessageText('');
      loadMessages(selectedContact.id);
      loadContacts();
    } catch {
      setToast({ msg: 'Failed to send message', type: 'error' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const page: CSSProperties = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: T.bg,
    fontFamily: F,
  };

  const header: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: `1px solid ${T.border}`,
    background: T.surface,
    gap: 12,
    flexWrap: 'wrap',
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  };

  const sidebar: CSSProperties = {
    width: 320,
    borderRight: `1px solid ${T.border}`,
    background: T.surface,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const contactList: CSSProperties = {
    flex: 1,
    overflow: 'auto',
  };

  const chatPanel: CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const threadArea: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const composeArea: CSSProperties = {
    padding: '12px 20px',
    borderTop: `1px solid ${T.border}`,
    background: T.surface,
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
  };

  return (
    <div style={page}>
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="grad-text"
            style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            AMASS
          </span>
          <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>Inbox</span>
        </div>
      </div>

      <div style={bodyStyle}>
        <div style={sidebar}>
          <div
            style={{
              display: 'flex',
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            {(['all', 'email', 'sms'] as ChannelFilter[]).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  fontSize: 11,
                  fontWeight: channelFilter === ch ? 700 : 500,
                  color: channelFilter === ch ? T.accent : T.text2,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: channelFilter === ch ? `2px solid ${T.accent}` : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontFamily: F,
                }}
              >
                {ch}
              </button>
            ))}
          </div>

          <div style={contactList}>
            {contacts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: T.text3, fontSize: 12 }}>
                No conversations
              </div>
            ) : (
              contacts.map((c) => {
                const isActive = selectedContact?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedContact(c)}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: isActive ? T.accentLt : 'transparent',
                      borderBottom: `1px solid ${T.border2}`,
                      transition: 'background .15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                        {c.firstName} {c.lastName}
                      </span>
                      {(c.unreadCount ?? 0) > 0 && (
                        <Badge text={String(c.unreadCount)} color={T.accent} />
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{c.email}</div>
                    {c.lastMessage && (
                      <div
                        style={{
                          fontSize: 11,
                          color: T.text2,
                          marginTop: 4,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 250,
                        }}
                      >
                        {c.lastMessage}
                      </div>
                    )}
                    {c.lastMessageAt && (
                      <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>
                        {new Date(c.lastMessageAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={chatPanel}>
          {!selectedContact ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.text3,
                fontSize: 14,
              }}
            >
              Select a contact to view messages
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: '12px 20px',
                  borderBottom: `1px solid ${T.border}`,
                  background: T.surface,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>
                    {selectedContact.firstName} {selectedContact.lastName}
                  </span>
                  <span style={{ fontSize: 11, color: T.text3, marginLeft: 8 }}>
                    {selectedContact.email}
                  </span>
                </div>
              </div>

              <div style={threadArea}>
                {loading ? (
                  <div style={{ textAlign: 'center', color: T.text2, padding: 20 }}>Loading...</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: T.text3, padding: 20, fontSize: 12 }}>
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOutbound = msg.direction === 'outbound';
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: isOutbound ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '70%',
                            padding: '10px 14px',
                            borderRadius: 12,
                            background: isOutbound ? T.accent : T.surface,
                            color: isOutbound ? '#fff' : T.text,
                            border: isOutbound ? 'none' : `1px solid ${T.border}`,
                          }}
                        >
                          <div style={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {msg.content}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 8,
                              marginTop: 6,
                              fontSize: 9,
                              color: isOutbound ? 'rgba(255,255,255,0.7)' : T.text3,
                            }}
                          >
                            <span>{msg.channel === 'email' ? '\u2709' : '\uD83D\uDCF1'} {msg.channel.toUpperCase()}</span>
                            <span>{new Date(msg.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div style={composeArea}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <label style={{ fontSize: 9, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>
                    Channel
                  </label>
                  <select
                    value={sendChannel}
                    onChange={(e) => setSendChannel(e.target.value as 'email' | 'sms')}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: `1px solid ${T.border}`,
                      background: T.surface2,
                      color: T.text,
                      fontSize: 11,
                      fontFamily: F,
                    }}
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: `1px solid ${T.border}`,
                    background: T.surface2,
                    color: T.text,
                    fontSize: 12,
                    resize: 'none',
                    height: 40,
                    outline: 'none',
                    fontFamily: F,
                  }}
                />
                <Btn onClick={handleSend} disabled={!messageText.trim()}>
                  Send
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
