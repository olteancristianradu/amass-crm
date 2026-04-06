import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, F } from '@/styles/tokens';
import { useAuthStore } from '@/store/authStore';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Inp } from '@/components/ui/Inp';
import { Toast } from '@/components/ui/Toast';
import {
  listTasks,
  createTask,
  updateTask,
  type Task,
  type TaskListResult,
} from '@/services/task.service';

const PRIORITY_COLORS: Record<string, string> = {
  low: T.blue,
  medium: T.yellow,
  high: T.orange,
  urgent: T.red,
};

const STATUS_COLORS: Record<string, string> = {
  open: T.blue,
  in_progress: T.yellow,
  completed: T.green,
};

const TASK_TYPES = ['call', 'email', 'meeting', 'follow_up', 'demo', 'other'];

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
  const style: CSSProperties = {
    padding: '6px 10px',
    borderRadius: 8,
    border: `1px solid ${T.border}`,
    background: T.surface2,
    color: T.text,
    fontSize: 11,
    outline: 'none',
    fontFamily: F,
  };
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
      <select style={style} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TasksPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'call',
    priority: 'medium',
    dueDate: '',
    assignedToId: '',
    contactId: '',
    dealId: '',
  });

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string | number | undefined> = {
        page,
        limit: 25,
        sortBy: 'dueDate',
        sortDir,
      };
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (assignedFilter) filters.assignedToId = assignedFilter;
      if (overdueOnly) filters.overdue = 'true';

      const result: TaskListResult = await listTasks(filters);
      setTasks(result.tasks);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setToast({ msg: 'Failed to load tasks', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, priorityFilter, assignedFilter, overdueOnly, sortDir]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreate = async () => {
    try {
      await createTask({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        assignedToId: formData.assignedToId || undefined,
        contactId: formData.contactId || undefined,
        dealId: formData.dealId || undefined,
      });
      setToast({ msg: 'Task created', type: 'success' });
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        type: 'call',
        priority: 'medium',
        dueDate: '',
        assignedToId: '',
        contactId: '',
        dealId: '',
      });
      loadTasks();
    } catch {
      setToast({ msg: 'Failed to create task', type: 'error' });
    }
  };

  const handleComplete = async (task: Task) => {
    try {
      await updateTask(task.id, { status: 'completed' });
      setToast({ msg: 'Task completed', type: 'success' });
      loadTasks();
    } catch {
      setToast({ msg: 'Failed to update task', type: 'error' });
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date();
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
    gap: 12,
    padding: '12px 20px',
    borderBottom: `1px solid ${T.border2}`,
    background: T.surface,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  };

  const tableHeader: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1.5fr 80px',
    padding: '8px 20px',
    fontSize: 10,
    fontWeight: 700,
    color: T.text3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: `1px solid ${T.border2}`,
    background: T.surface,
  };

  const rowStyle = (task: Task): CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1.5fr 80px',
    padding: '10px 20px',
    fontSize: 12,
    alignItems: 'center',
    borderBottom: `1px solid ${T.border2}`,
    background: isOverdue(task) ? T.redLt : T.surface,
    transition: 'background .15s',
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
          <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>Tasks</span>
          <span style={{ fontSize: 11, color: T.text3 }}>({total})</span>
        </div>
        <Btn onClick={() => setShowForm((p) => !p)}>+ Add Task</Btn>
      </div>

      <div style={filterBar}>
        <SelectFilter
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ]}
        />
        <SelectFilter
          label="Priority"
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: '', label: 'All' },
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' },
          ]}
        />
        <Inp
          label="Assigned To (ID)"
          value={assignedFilter}
          onChange={setAssignedFilter}
          placeholder="User ID"
          width={140}
        />
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
            Overdue
          </label>
          <button
            onClick={() => setOverdueOnly((p) => !p)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${overdueOnly ? T.red : T.border}`,
              background: overdueOnly ? T.redLt : T.surface2,
              color: overdueOnly ? T.red : T.text2,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {overdueOnly ? 'On' : 'Off'}
          </button>
        </div>
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
            Sort Due Date
          </label>
          <button
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.surface2,
              color: T.text2,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {sortDir === 'asc' ? 'Earliest first' : 'Latest first'}
          </button>
        </div>
      </div>

      {showForm && (
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${T.border}`,
            background: T.surface,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'flex-end',
          }}
        >
          <Inp label="Title" value={formData.title} onChange={(v) => setFormData((p) => ({ ...p, title: v }))} width={200} />
          <Inp label="Description" value={formData.description} onChange={(v) => setFormData((p) => ({ ...p, description: v }))} width={200} />
          <SelectFilter
            label="Type"
            value={formData.type}
            onChange={(v) => setFormData((p) => ({ ...p, type: v }))}
            options={TASK_TYPES.map((t) => ({ value: t, label: t.replace('_', ' ') }))}
          />
          <SelectFilter
            label="Priority"
            value={formData.priority}
            onChange={(v) => setFormData((p) => ({ ...p, priority: v }))}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
          />
          <Inp
            label="Due Date"
            value={formData.dueDate}
            onChange={(v) => setFormData((p) => ({ ...p, dueDate: v }))}
            type="date"
            width={150}
          />
          <Inp
            label="Assignee ID"
            value={formData.assignedToId}
            onChange={(v) => setFormData((p) => ({ ...p, assignedToId: v }))}
            width={140}
          />
          <Inp
            label="Contact ID"
            value={formData.contactId}
            onChange={(v) => setFormData((p) => ({ ...p, contactId: v }))}
            width={140}
          />
          <Inp
            label="Deal ID"
            value={formData.dealId}
            onChange={(v) => setFormData((p) => ({ ...p, dealId: v }))}
            width={140}
          />
          <Btn onClick={handleCreate} disabled={!formData.title}>
            Create
          </Btn>
          <Btn variant="ghost" onClick={() => setShowForm(false)}>
            Cancel
          </Btn>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={tableHeader}>
          <span>Title</span>
          <span>Type</span>
          <span>Priority</span>
          <span>Due Date</span>
          <span>Status</span>
          <span>Assignee</span>
          <span>Linked</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.text2 }}>Loading...</div>
        ) : tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.text3 }}>No tasks found</div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} style={rowStyle(task)}>
              <span style={{ fontWeight: 600, color: T.text }}>{task.title}</span>
              <span style={{ color: T.text2, textTransform: 'capitalize' }}>
                {task.type?.replace('_', ' ')}
              </span>
              <Badge text={task.priority} color={PRIORITY_COLORS[task.priority] || T.text2} />
              <span
                style={{
                  color: isOverdue(task) ? T.red : T.text2,
                  fontWeight: isOverdue(task) ? 700 : 400,
                  fontSize: 11,
                }}
              >
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
              </span>
              <Badge text={task.status?.replace('_', ' ')} color={STATUS_COLORS[task.status] || T.text2} />
              <span style={{ fontSize: 11, color: T.text2 }}>
                {task.assignedTo?.name || '-'}
              </span>
              <span style={{ fontSize: 11, color: T.accent }}>
                {task.contact
                  ? `${task.contact.firstName} ${task.contact.lastName}`
                  : task.deal
                    ? task.deal.title
                    : '-'}
              </span>
              <div>
                {task.status !== 'completed' && (
                  <Btn size="sm" variant="ghost" onClick={() => handleComplete(task)}>
                    Done
                  </Btn>
                )}
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
