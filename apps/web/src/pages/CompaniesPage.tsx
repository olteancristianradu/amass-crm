import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T } from '@/styles/tokens';
import { Btn } from '@/components/ui/Btn';
import { Inp } from '@/components/ui/Inp';
import { Badge } from '@/components/ui/Badge';
import { Toast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import * as companyService from '@/services/company.service';
import type { Company } from '@/services/company.service';

const PAGE_SIZE = 25;

export function CompaniesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    domain: '',
    industry: '',
    size: '',
    phone: '',
    email: '',
    website: '',
    city: '',
    country: '',
  });
  const [creating, setCreating] = useState(false);

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const result = await companyService.listCompanies({
        search: search || undefined,
        industry: filterIndustry || undefined,
        size: filterSize || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setCompanies(result.companies);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Failed to load companies:', err);
      setToast({ msg: 'Failed to load companies', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [search, filterIndustry, filterSize, page]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    setPage(1);
  }, [search, filterIndustry, filterSize]);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    try {
      setCreating(true);
      await companyService.createCompany(createForm);
      setToast({ msg: 'Company created', type: 'success' });
      setShowCreate(false);
      setCreateForm({ name: '', domain: '', industry: '', size: '', phone: '', email: '', website: '', city: '', country: '' });
      loadCompanies();
    } catch {
      setToast({ msg: 'Failed to create company', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const industryColor = (industry: string) => {
    const map: Record<string, string> = {
      Technology: T.blue,
      Finance: T.green,
      Healthcare: T.red,
      Education: T.purple,
      Manufacturing: T.orange,
      Retail: T.yellow,
    };
    return map[industry] || T.text3;
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
    width: 480,
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
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text, marginRight: 12 }}>Companies</div>
        <Inp value={search} onChange={setSearch} placeholder="Search companies..." width={220} />
        <Inp value={filterIndustry} onChange={setFilterIndustry} placeholder="Industry..." width={140} />
        <Inp value={filterSize} onChange={setFilterSize} placeholder="Size..." width={120} />
        <div style={{ marginLeft: 'auto' }}>
          <Btn onClick={() => setShowCreate(true)}>+ Add Company</Btn>
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: '0 20px 8px', fontSize: 12, color: T.text3 }}>
        {total} compan{total !== 1 ? 'ies' : 'y'} found
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
                  <th style={thStyle}>Industry</th>
                  <th style={thStyle}>Size</th>
                  <th style={thStyle}>Contacts</th>
                  <th style={thStyle}>Deals</th>
                  <th style={thStyle}>City</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/companies/${c.id}`)}
                    style={{ cursor: 'pointer', transition: 'background .1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.surface2)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600, color: T.text }}>
                      <div>{c.name}</div>
                      {c.domain && <div style={{ fontSize: 10, color: T.text3 }}>{c.domain}</div>}
                    </td>
                    <td style={tdStyle}>
                      {c.industry ? <Badge text={c.industry} color={industryColor(c.industry)} /> : '\u2014'}
                    </td>
                    <td style={{ ...tdStyle, color: T.text2 }}>{c.size || '\u2014'}</td>
                    <td style={{ ...tdStyle, color: T.text2 }}>{String((c as unknown as Record<string, unknown>).contactsCount ?? '\u2014')}</td>
                    <td style={{ ...tdStyle, color: T.text2 }}>{String((c as unknown as Record<string, unknown>).dealsCount ?? '\u2014')}</td>
                    <td style={{ ...tdStyle, color: T.text2 }}>{c.city || '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {companies.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: T.text3 }}>No companies found</div>
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
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: T.text }}>New Company</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Inp label="Company Name" value={createForm.name} onChange={(v) => setCreateForm((f) => ({ ...f, name: v }))} placeholder="Acme Inc." />
              <div style={{ display: 'flex', gap: 10 }}>
                <Inp label="Domain" value={createForm.domain} onChange={(v) => setCreateForm((f) => ({ ...f, domain: v }))} placeholder="acme.com" />
                <Inp label="Industry" value={createForm.industry} onChange={(v) => setCreateForm((f) => ({ ...f, industry: v }))} placeholder="Technology" />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Inp label="Size" value={createForm.size} onChange={(v) => setCreateForm((f) => ({ ...f, size: v }))} placeholder="50-200" />
                <Inp label="Phone" value={createForm.phone} onChange={(v) => setCreateForm((f) => ({ ...f, phone: v }))} placeholder="+1 555..." />
              </div>
              <Inp label="Email" value={createForm.email} onChange={(v) => setCreateForm((f) => ({ ...f, email: v }))} placeholder="info@acme.com" type="email" />
              <Inp label="Website" value={createForm.website} onChange={(v) => setCreateForm((f) => ({ ...f, website: v }))} placeholder="https://acme.com" />
              <div style={{ display: 'flex', gap: 10 }}>
                <Inp label="City" value={createForm.city} onChange={(v) => setCreateForm((f) => ({ ...f, city: v }))} placeholder="New York" />
                <Inp label="Country" value={createForm.country} onChange={(v) => setCreateForm((f) => ({ ...f, country: v }))} placeholder="US" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <Btn variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Btn>
              <Btn onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Company'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
