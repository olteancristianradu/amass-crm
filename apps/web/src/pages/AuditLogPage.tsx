import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, F, FM } from '@/styles/tokens';
import { useAuthStore } from '@/store/authStore';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Inp } from '@/components/ui/Inp';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/services/api';

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface AuditListResult {
  entries: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const ENTITY_TYPE_COLORS: Record<string, string> = {
  contact: T.blue,
  company: T.purple,
  deal: T.green,
  task: T.yellow,
  user: T.orange,
  pipeline: T.accent,
  workflow: T.red,
};

const ACTION_COLORS: Record<string, string> = {
  create: T.green,
  update: T.blue,
  delete: T.red,
  login: T.accent,
  logout: T.text3,
  export: T.purple,
  import: T.orange,
};

function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: T.text3,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: T.surface2,
          color: T.text,
          fontSize: 11,
          outline: 'none',
          fontFamily: F,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AuditLogPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        limit: 30,
      };
      if (userFilter) params.userId = userFilter;
      if (actionFilter) params.action = actionFilter;
      if (entityTypeFilter) params.entityType = entityTypeFilter;
      if (dateFrom) params.dateFrom = new Date(dateFrom).toISOString();
      if (dateTo) params.dateTo = new Date(dateTo).toISOString();
      if (search) params.search = search;

      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) queryParams.set(k, String(v));
      });

      const data = await api<AuditListResult>(`/audit-log?${queryParams}`);
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Failed to load audit log:', err);
      setToast({ msg: 'Failed to load audit log', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, userFilter, actionFilter, entityTypeFilter, dateFrom, dateTo, search]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const pageStyle: CSSProperties = {
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

  const filterBar: CSSProperties = {
    display: 'flex',
    gap: 12,
    padding: '12px 20px',
    borderBottom: `1px solid ${T.border2}`,
    background: T.surface,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  };

  const th: CSSProperties = {
    textAlign: 'left',
    padding: '8px 12px',
    fontSize: 10,
    fontWeight: 700,
    color: T.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: `1px solid ${T.border}`,
  };

  const td: CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${T.border2}`,
    color: T.text,
    fontSize: 12,
  };

  return (
    <div style={pageStyle}>
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="grad-text"
            style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            AMASS
          </span>
          <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>Audit Log</span>
          <span style={{ fontSize: 11, color: T.text3 }}>({total})</span>
        </div>
      </div>

      <div style={filterBar}>
        <Inp
          label="Search"
          value={search}
          onChange={setSearch}
          placeholder="Action or entity..."
          width={180}
        />
        <Inp
          label="User ID"
          value={userFilter}
          onChange={setUserFilter}
          placeholder="Filter by user"
          width={140}
        />
        <SelectFilter
          label="Action"
          value={actionFilter}
          onChange={setActionFilter}
          options={[
            { value: '', label: 'All' },
            { value: 'create', label: 'Create' },
            { value: 'update', label: 'Update' },
            { value: 'delete', label: 'Delete' },
            { value: 'login', label: 'Login' },
            { value: 'logout', label: 'Logout' },
            { value: 'export', label: 'Export' },
            { value: 'import', label: 'Import' },
          ]}
        />
        <SelectFilter
          label="Entity Type"
          value={entityTypeFilter}
          onChange={setEntityTypeFilter}
          options={[
            { value: '', label: 'All' },
            { value: 'contact', label: 'Contact' },
            { value: 'company', label: 'Company' },
            { value: 'deal', label: 'Deal' },
            { value: 'task', label: 'Task' },
            { value: 'user', label: 'User' },
            { value: 'pipeline', label: 'Pipeline' },
            { value: 'workflow', label: 'Workflow' },
          ]}
        />
        <Inp
          label="From"
          value={dateFrom}
          onChange={setDateFrom}
          type="date"
          width={140}
        />
        <Inp
          label="To"
          value={dateTo}
          onChange={setDateTo}
          type="date"
          width={140}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.surface }}>
              <th style={th}>Date</th>
              <th style={th}>User</th>
              <th style={th}>Action</th>
              <th style={th}>Entity Type</th>
              <th style={th}>Entity ID</th>
              <th style={th}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={{ ...td, textAlign: 'center', color: T.text2 }} colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td style={{ ...td, textAlign: 'center', color: T.text3 }} colSpan={6}>
                  No audit log entries found
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ ...td, fontFamily: FM, fontSize: 11, color: T.text2, whiteSpace: 'nowrap' }}>
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td style={{ ...td, fontWeight: 600 }}>{entry.userName}</td>
                  <td style={td}>
                    <Badge
                      text={entry.action}
                      color={ACTION_COLORS[entry.action] || T.text2}
                    />
                  </td>
                  <td style={td}>
                    <Badge
                      text={entry.entityType}
                      color={ENTITY_TYPE_COLORS[entry.entityType] || T.text2}
                    />
                  </td>
                  <td style={{ ...td, fontFamily: FM, fontSize: 10, color: T.text3 }}>
                    {entry.entityId}
                  </td>
                  <td style={{ ...td, fontFamily: FM, fontSize: 11, color: T.text3 }}>
                    {entry.ipAddress}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
