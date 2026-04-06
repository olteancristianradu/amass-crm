import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, F } from '@/styles/tokens';
import { useAuthStore } from '@/store/authStore';
import { Btn } from '@/components/ui/Btn';
import { Inp } from '@/components/ui/Inp';
import { Toast } from '@/components/ui/Toast';
import {
  listEvents,
  createEvent,
  type CalendarEvent,
} from '@/services/calendar.service';
import { listTasks, type Task } from '@/services/task.service';

interface DayEntry {
  events: CalendarEvent[];
  tasks: Task[];
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    allDay: false,
    location: '',
  });

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    try {
      const [evtResult, taskResult] = await Promise.all([
        listEvents({ startDate, endDate, limit: 200 }),
        listTasks({ dueDateFrom: startDate, dueDateTo: endDate, limit: 200 }),
      ]);
      setEvents(evtResult.events);
      setTasks(taskResult.tasks);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    }
  }, [year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const handleCreate = async () => {
    try {
      await createEvent({
        title: formData.title,
        description: formData.description,
        startAt: formData.startAt ? new Date(formData.startAt).toISOString() : undefined,
        endAt: formData.endAt ? new Date(formData.endAt).toISOString() : undefined,
        allDay: formData.allDay,
        location: formData.location,
      });
      setToast({ msg: 'Event created', type: 'success' });
      setShowForm(false);
      setFormData({ title: '', description: '', startAt: '', endAt: '', allDay: false, location: '' });
      loadData();
    } catch {
      setToast({ msg: 'Failed to create event', type: 'error' });
    }
  };

  const getDayData = (day: number): DayEntry => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = events.filter((e) => {
      const d = new Date(e.startAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
    const dayTasks = tasks.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
    return { events: dayEvents, tasks: dayTasks };
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

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

  const gridWrap: CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  };

  const calGrid: CSSProperties = {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gridAutoRows: 'minmax(80px, 1fr)',
    gap: 1,
    background: T.border2,
    overflow: 'auto',
  };

  const dayHeaderRow: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    background: T.surface,
    borderBottom: `1px solid ${T.border}`,
  };

  const sidePanel: CSSProperties = {
    width: 300,
    borderLeft: `1px solid ${T.border}`,
    background: T.surface,
    padding: 16,
    overflow: 'auto',
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
          <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>Calendar</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={prevMonth}>
            &larr;
          </Btn>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.text, minWidth: 160, textAlign: 'center' }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <Btn variant="ghost" size="sm" onClick={nextMonth}>
            &rarr;
          </Btn>
        </div>
        <Btn onClick={() => setShowForm(true)}>+ Add Event</Btn>
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
          <Inp label="Title" value={formData.title} onChange={(v) => setFormData((p) => ({ ...p, title: v }))} width={180} />
          <Inp label="Description" value={formData.description} onChange={(v) => setFormData((p) => ({ ...p, description: v }))} width={180} />
          <Inp
            label="Start"
            value={formData.startAt}
            onChange={(v) => setFormData((p) => ({ ...p, startAt: v }))}
            type="datetime-local"
            width={180}
          />
          <Inp
            label="End"
            value={formData.endAt}
            onChange={(v) => setFormData((p) => ({ ...p, endAt: v }))}
            type="datetime-local"
            width={180}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>
              All Day
            </label>
            <button
              onClick={() => setFormData((p) => ({ ...p, allDay: !p.allDay }))}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${formData.allDay ? T.accent : T.border}`,
                background: formData.allDay ? T.accentLt : T.surface2,
                color: formData.allDay ? T.accent : T.text2,
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {formData.allDay ? 'Yes' : 'No'}
            </button>
          </div>
          <Inp label="Location" value={formData.location} onChange={(v) => setFormData((p) => ({ ...p, location: v }))} width={150} />
          <Btn onClick={handleCreate} disabled={!formData.title}>
            Create
          </Btn>
          <Btn variant="ghost" onClick={() => setShowForm(false)}>
            Cancel
          </Btn>
        </div>
      )}

      <div style={dayHeaderRow}>
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            style={{
              textAlign: 'center',
              padding: '8px 0',
              fontSize: 10,
              fontWeight: 700,
              color: T.text3,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={gridWrap}>
        <div style={calGrid}>
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} style={{ background: T.bg, padding: 6 }} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const data = getDayData(day);
            const isToday = isCurrentMonth && day === today;
            const isSelected = selectedDay === day;
            const hasItems = data.events.length > 0 || data.tasks.length > 0;

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  background: isSelected ? T.accentLt : T.surface,
                  padding: 6,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background .15s',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: isToday ? 800 : 500,
                    color: isToday ? T.accent : T.text,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isToday ? T.accentLt : 'transparent',
                  }}
                >
                  {day}
                </div>
                {hasItems && (
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
                    {data.events.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        style={{
                          height: 4,
                          width: 20,
                          borderRadius: 2,
                          background: T.accent,
                        }}
                      />
                    ))}
                    {data.tasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        style={{
                          height: 4,
                          width: 20,
                          borderRadius: 2,
                          background: T.yellow,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selectedDay !== null && (
          <div style={sidePanel}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: T.text }}>
              {MONTH_NAMES[month]} {selectedDay}, {year}
            </div>
            {(() => {
              const data = getDayData(selectedDay);
              const items = [
                ...data.events.map((e) => ({ type: 'event' as const, item: e })),
                ...data.tasks.map((t) => ({ type: 'task' as const, item: t })),
              ];
              if (items.length === 0) {
                return <div style={{ fontSize: 12, color: T.text3 }}>No events or tasks</div>;
              }
              return items.map((entry) => (
                <div
                  key={entry.item.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: T.surface2,
                    marginBottom: 8,
                    borderLeft: `3px solid ${entry.type === 'event' ? T.accent : T.yellow}`,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{entry.item.title}</div>
                  <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>
                    {entry.type === 'event' ? 'Event' : 'Task'}
                    {entry.type === 'event' && (entry.item as CalendarEvent).location
                      ? ` - ${(entry.item as CalendarEvent).location}`
                      : ''}
                  </div>
                  {entry.item.description && (
                    <div style={{ fontSize: 11, color: T.text2, marginTop: 4 }}>
                      {entry.item.description}
                    </div>
                  )}
                  {entry.type === 'event' && (
                    <div style={{ fontSize: 10, color: T.text3, marginTop: 4 }}>
                      {(entry.item as CalendarEvent).allDay
                        ? 'All day'
                        : `${new Date((entry.item as CalendarEvent).startAt).toLocaleTimeString()} - ${new Date((entry.item as CalendarEvent).endAt).toLocaleTimeString()}`}
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
