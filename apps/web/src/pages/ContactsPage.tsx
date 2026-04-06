import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Inp } from '@/components/ui/Inp';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import * as contactService from '@/services/contact.service';
import type { Contact } from '@/services/contact.service';

const PAGE_SIZE = 25;

export function ContactsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterAssignedTo, setFilterAssignedTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    jobTitle: '',
    source: '',
  });
  const [creating, setCreating] = useState(false);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await contactService.listContacts({
        search: search || undefined,
        companyId: filterCompany || undefined,
        assignedToId: filterAssignedTo || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setContacts(result.contacts);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      setToast({ msg: 'Failed to load contacts', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, filterCompany, filterAssignedTo, page]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterCompany, filterAssignedTo]);

  const handleCreate = async () => {
    if (!createForm.firstName.trim() && !createForm.lastName.trim()) return;
    try {
      setCreating(true);
      await contactService.createContact(createForm);
      setToast({ msg: 'Contact created', type: 'success' });
      setShowCreate(false);
      setCreateForm({ firstName: '', lastName: '', email: '', phone: '', mobile: '', jobTitle: '', source: '' });
      loadContacts();
    } catch {
      setToast({ msg: 'Failed to create contact', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await contactService.exportContactsCsv();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contacts.csv';
      a.click();
      URL.revokeObjectURL(url);
      setToast({ msg: 'CSV exported', type: 'success' });
    } catch {
      setToast({ msg: 'Export failed', type: 'error' });
    }
  };

  const handleImportCsv = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const lines = text.split('\n').filter((l) => l.trim());
        if (lines.length < 2) {
          setToast({ msg: 'CSV file is empty', type: 'error' });
          return;
        }
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            if (values[idx]) row[h] = values[idx];
          });
          try {
            await contactService.createContact({
              firstName: row['firstname'] || row['first_name'] || row['first name'] || '',
              lastName: row['lastname'] || row['last_name'] || row['last name'] || '',
              email: row['email'] || '',
              phone: row['phone'] || '',
            });
            imported++;
          } catch {
            // skip invalid rows
          }
        }
        setToast({ msg: `Imported ${imported} contacts`, type: 'success' });
        loadContacts();
      } catch {
        setToast({ msg: 'Import failed', type: 'error' });
      }
    };
    input.click();
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return T.green;
    if (score >= 50) return T.yellow;
    if (score >= 20) return T.orange;
    return T.text3;
  };

  const formatDate = (d?: string) => {
    if (!d) return '\u2014';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Styles
  const pageStyle: CSSProperties = { height: '100%', display: 'flex', flexDirection: 'column' };
  const toolbarStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', flexWrap: 'wrap' };
  const contentStyle: CSSProperties = { flex: 1, overflow: 'auto', padding: '0 20px 20px' };
  const thStyle: CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: T.text3,
    borderBottom: `2px solid ${T.border}`,
    position: 'sticky',
    top: 0,
    background: T.surface,
    letterSpacing: 0.5,
  };
  const tdStyle: CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: `1px solid ${T.border2}` };
  const overlayStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };
  const modalStyle: CSSProperties = {
    background: T.surface,
    borderRadius: 14,
    padding: 24,
    width: 440,
    maxWidth: '90vw',
    boxShadow: `0 20px 60px ${T.shadow}`,
    border: `1px solid ${T.border}`,
  };
  const paginationStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '16px 0',
  };

  return (
    <div style={pageStyle}>
      {/* Toolbar */}
      <div style={toolbarStyle}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginRight: 12 }}>Contacts</div>
        <Inp value={search} onChange={setSearch} placeholder="Search contacts..." width={220} />
        <Inp value={filterCompany} onChange={setFilterCompany} placeholder="Company ID..." width={160} />
        <Inp value={filterAssignedTo} onChange={setFilterAssignedTo} placeholder="Assigned to ID..." width={160} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <Btn variant="ghost" size="sm" onClick={handleImportCsv}>Import CSV</Btn>
          <Btn variant="ghost" size="sm" onClick={handleExportCsv}>Export CSV</Btn>
          <Btn onClick={() => setShowCreate(true)}>+ Add Contact</Btn>
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: '0 20px 8px', fontSize: 12, color: T.text3 }}>
        {total} contact{total !== 1 ? 's' : ''} found
      </div>

      {/* Table */}
      <div style={contentStyle}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: T.text2 }}>Loading...</div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Tags</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Last Contact</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contacts/${c.id}`)}
                    style={{ cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.surface2)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600, color: T.text }}>
                      {c.firstName} {c.lastName}
                    </td>
                    <td style={{ ...tdStyle, color: T.text2 }}>{c.email || '\u2014'}</td>
                    <td style={{ ...tdStyle, color: T.text2 }}>{c.phone || '\u2014'}</td>
                    <td style={{ ...tdStyle, color: T.text2 }}>{c.company?.name || '\u2014'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(c.tags || []).slice(0, 3).map((tag) => (
                          <Badge key={tag} text={tag} color={T.blue} />
                        ))}
                        {(c.tags || []).length > 3 && (
                          <span style={{ fontSize: 10, color: T.text3 }}>+{c.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: scoreColor(c.score) }}>{c.score}</span>
                    </td>
                    <td style={{ ...tdStyle, color: T.text3, fontSize: 12 }}>{formatDate(c.lastContactedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {contacts.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: T.text3 }}>No contacts found</div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={paginationStyle}>
                <Btn variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Btn>
                <span style={{ fontSize: 12, color: T.text2 }}>
                  Page {page} of {totalPages}
                </span>
                <Btn variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Btn>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={overlayStyle} onClick={() => setShowCreate(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: T.text }}>New Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <Inp label="First Name" value={createForm.firstName} onChange={(v) => setCreateForm((f) => ({ ...f, firstName: v }))} placeholder="John" />
                <Inp label="Last Name" value={createForm.lastName} onChange={(v) => setCreateForm((f) => ({ ...f, lastName: v }))} placeholder="Doe" />
              </div>
              <Inp label="Email" value={createForm.email} onChange={(v) => setCreateForm((f) => ({ ...f, email: v }))} placeholder="john@example.com" type="email" />
              <div style={{ display: 'flex', gap: 10 }}>
                <Inp label="Phone" value={createForm.phone} onChange={(v) => setCreateForm((f) => ({ ...f, phone: v }))} placeholder="+1 555..." />
                <Inp label="Mobile" value={createForm.mobile} onChange={(v) => setCreateForm((f) => ({ ...f, mobile: v }))} placeholder="+1 555..." />
              </div>
              <Inp label="Job Title" value={createForm.jobTitle} onChange={(v) => setCreateForm((f) => ({ ...f, jobTitle: v }))} placeholder="CEO" />
              <Inp label="Source" value={createForm.source} onChange={(v) => setCreateForm((f) => ({ ...f, source: v }))} placeholder="Website, referral..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <Btn variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Btn>
              <Btn onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Contact'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
