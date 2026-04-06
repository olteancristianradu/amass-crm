import { useState, useEffect, useCallback, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { T, F, FM } from '@/styles/tokens';
import { useAuthStore } from '@/store/authStore';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Inp } from '@/components/ui/Inp';
import { Toast } from '@/components/ui/Toast';
import { api } from '@/services/api';
import { listPipelines, createPipeline, updatePipeline, deletePipeline, type Pipeline, type PipelineStage } from '@/services/pipeline.service';

type SettingsTab = 'general' | 'users' | 'pipelines' | 'products' | 'fields' | 'tags' | 'apikeys' | 'webhooks' | 'billing' | 'security';

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'general', label: 'General' },
  { key: 'users', label: 'Users' },
  { key: 'pipelines', label: 'Pipelines' },
  { key: 'products', label: 'Products' },
  { key: 'fields', label: 'Custom Fields' },
  { key: 'tags', label: 'Tags' },
  { key: 'apikeys', label: 'API Keys' },
  { key: 'webhooks', label: 'Webhooks' },
  { key: 'billing', label: 'Billing' },
  { key: 'security', label: 'Security' },
];

const ROLES = ['ADMIN', 'MANAGER', 'AGENT', 'SELLER', 'READONLY'];
const ENTITY_TYPES = ['contact', 'company', 'deal', 'task'];

interface TenantSettings {
  name: string;
  accentColor: string;
  language: string;
}

interface UserEntry {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  description: string;
  active: boolean;
}

interface CustomField {
  id: string;
  name: string;
  type: string;
  entityType: string;
  required: boolean;
  options?: string[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
  entityType: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
  createdAt: string;
}

interface BillingInfo {
  plan: string;
  usersUsed: number;
  usersLimit: number;
  contactsUsed: number;
  contactsLimit: number;
  renewsAt: string;
}

function SelectField({
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
      <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '7px 10px',
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: T.surface2,
          color: T.text,
          fontSize: 12,
          outline: 'none',
          fontFamily: F,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [tab, setTab] = useState<SettingsTab>('general');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // General
  const [tenant, setTenant] = useState<TenantSettings>({ name: '', accentColor: '#2563EB', language: 'en' });

  // Users
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'AGENT' });

  // Pipelines
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [showPipelineForm, setShowPipelineForm] = useState(false);
  const [pipelineForm, setPipelineForm] = useState({ name: '', description: '', stages: '' });

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', sku: '', price: '', currency: 'USD', description: '' });

  // Custom Fields
  const [fields, setFields] = useState<CustomField[]>([]);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [fieldForm, setFieldForm] = useState({ name: '', type: 'text', entityType: 'contact', required: false, options: '' });

  // Tags
  const [tags, setTags] = useState<Tag[]>([]);
  const [showTagForm, setShowTagForm] = useState(false);
  const [tagForm, setTagForm] = useState({ name: '', color: '#2563EB', entityType: 'contact' });

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  // Webhooks
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: '', events: '' });

  // Billing
  const [billing, setBilling] = useState<BillingInfo | null>(null);

  // Security
  const [passwordForm, setPasswordForm] = useState({ current: '', newPass: '', confirm: '' });

  useEffect(() => {
    const loaders: Record<SettingsTab, () => Promise<void>> = {
      general: async () => {
        try {
          const data = await api<TenantSettings>('/settings/general');
          setTenant(data);
        } catch {}
      },
      users: async () => {
        try {
          const data = await api<{ users: UserEntry[] }>('/settings/users');
          setUsers(Array.isArray(data) ? data : data.users || []);
        } catch {}
      },
      pipelines: async () => {
        try {
          const result = await listPipelines();
          setPipelines(result.pipelines);
        } catch {}
      },
      products: async () => {
        try {
          const data = await api<{ products: Product[] }>('/settings/products');
          setProducts(Array.isArray(data) ? data : data.products || []);
        } catch {}
      },
      fields: async () => {
        try {
          const data = await api<{ fields: CustomField[] }>('/settings/custom-fields');
          setFields(Array.isArray(data) ? data : data.fields || []);
        } catch {}
      },
      tags: async () => {
        try {
          const data = await api<{ tags: Tag[] }>('/settings/tags');
          setTags(Array.isArray(data) ? data : data.tags || []);
        } catch {}
      },
      apikeys: async () => {
        try {
          const data = await api<{ keys: ApiKey[] }>('/settings/api-keys');
          setApiKeys(Array.isArray(data) ? data : data.keys || []);
        } catch {}
      },
      webhooks: async () => {
        try {
          const data = await api<{ webhooks: Webhook[] }>('/settings/webhooks');
          setWebhooks(Array.isArray(data) ? data : data.webhooks || []);
        } catch {}
      },
      billing: async () => {
        try {
          const data = await api<BillingInfo>('/settings/billing');
          setBilling(data);
        } catch {}
      },
      security: async () => {},
    };
    loaders[tab]();
  }, [tab]);

  const card: CSSProperties = {
    background: T.surface,
    borderRadius: 12,
    padding: 20,
    border: `1px solid ${T.border}`,
    marginBottom: 16,
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

  // --- General ---
  const renderGeneral = () => (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>General Settings</div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        <Inp label="Tenant Name" value={tenant.name} onChange={(v) => setTenant((p) => ({ ...p, name: v }))} width={250} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Accent Color</label>
          <input
            type="color"
            value={tenant.accentColor}
            onChange={(e) => setTenant((p) => ({ ...p, accentColor: e.target.value }))}
            style={{ width: 40, height: 32, border: 'none', cursor: 'pointer', borderRadius: 6 }}
          />
        </div>
        <SelectField
          label="Language"
          value={tenant.language}
          onChange={(v) => setTenant((p) => ({ ...p, language: v }))}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ro', label: 'Romanian' },
          ]}
        />
      </div>
      <Btn
        onClick={async () => {
          try {
            await api('/settings/general', { method: 'PATCH', body: JSON.stringify(tenant) });
            setToast({ msg: 'Settings saved', type: 'success' });
          } catch {
            setToast({ msg: 'Failed to save', type: 'error' });
          }
        }}
      >
        Save
      </Btn>
    </div>
  );

  // --- Users ---
  const renderUsers = () => (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Users</div>
        <Btn size="sm" onClick={() => setShowUserForm((p) => !p)}>+ Add User</Btn>
      </div>

      {showUserForm && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Inp label="Name" value={userForm.name} onChange={(v) => setUserForm((p) => ({ ...p, name: v }))} width={180} />
          <Inp label="Email" value={userForm.email} onChange={(v) => setUserForm((p) => ({ ...p, email: v }))} width={220} />
          <SelectField
            label="Role"
            value={userForm.role}
            onChange={(v) => setUserForm((p) => ({ ...p, role: v }))}
            options={ROLES.map((r) => ({ value: r, label: r }))}
          />
          <Btn
            size="sm"
            onClick={async () => {
              try {
                await api('/settings/users', { method: 'POST', body: JSON.stringify(userForm) });
                setToast({ msg: 'User created', type: 'success' });
                setShowUserForm(false);
                setUserForm({ name: '', email: '', role: 'AGENT' });
                const data = await api<{ users: UserEntry[] }>('/settings/users');
                setUsers(Array.isArray(data) ? data : data.users || []);
              } catch {
                setToast({ msg: 'Failed to create user', type: 'error' });
              }
            }}
            disabled={!userForm.name || !userForm.email}
          >
            Create
          </Btn>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>Role</th>
            <th style={th}>Status</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td style={td}>{u.name}</td>
              <td style={{ ...td, fontFamily: FM, fontSize: 11 }}>{u.email}</td>
              <td style={td}><Badge text={u.role} color={T.blue} /></td>
              <td style={td}><Badge text={u.status} color={u.status === 'active' ? T.green : T.red} /></td>
              <td style={td}>
                <Btn
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    try {
                      await api(`/settings/users/${u.id}/deactivate`, { method: 'PATCH' });
                      setToast({ msg: 'User deactivated', type: 'success' });
                      const data = await api<{ users: UserEntry[] }>('/settings/users');
                      setUsers(Array.isArray(data) ? data : data.users || []);
                    } catch {
                      setToast({ msg: 'Failed to deactivate', type: 'error' });
                    }
                  }}
                >
                  Deactivate
                </Btn>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td style={{ ...td, textAlign: 'center', color: T.text3 }} colSpan={5}>No users</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // --- Pipelines ---
  const renderPipelines = () => (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Pipelines</div>
        <Btn size="sm" onClick={() => setShowPipelineForm((p) => !p)}>+ Add Pipeline</Btn>
      </div>

      {showPipelineForm && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Inp label="Name" value={pipelineForm.name} onChange={(v) => setPipelineForm((p) => ({ ...p, name: v }))} width={200} />
          <Inp label="Description" value={pipelineForm.description} onChange={(v) => setPipelineForm((p) => ({ ...p, description: v }))} width={250} />
          <Inp
            label="Stages (comma-separated)"
            value={pipelineForm.stages}
            onChange={(v) => setPipelineForm((p) => ({ ...p, stages: v }))}
            width={300}
            placeholder="Lead, Qualified, Proposal, Won"
          />
          <Btn
            size="sm"
            onClick={async () => {
              try {
                const stages = pipelineForm.stages.split(',').map((s, i) => ({
                  name: s.trim(),
                  color: [T.blue, T.yellow, T.purple, T.green, T.orange][i % 5],
                  probability: Math.round(((i + 1) / (pipelineForm.stages.split(',').length)) * 100),
                  order: i,
                }));
                await createPipeline({
                  name: pipelineForm.name,
                  description: pipelineForm.description,
                  stages: stages as PipelineStage[],
                });
                setToast({ msg: 'Pipeline created', type: 'success' });
                setShowPipelineForm(false);
                setPipelineForm({ name: '', description: '', stages: '' });
                const result = await listPipelines();
                setPipelines(result.pipelines);
              } catch {
                setToast({ msg: 'Failed to create pipeline', type: 'error' });
              }
            }}
            disabled={!pipelineForm.name}
          >
            Create
          </Btn>
        </div>
      )}

      {pipelines.map((p) => (
        <div
          key={p.id}
          style={{
            padding: 12,
            borderRadius: 8,
            background: T.surface2,
            marginBottom: 8,
            border: `1px solid ${T.border2}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</span>
              {p.isDefault && <Badge text="Default" color={T.accent} />}
            </div>
          </div>
          {p.description && <div style={{ fontSize: 11, color: T.text2, marginTop: 4 }}>{p.description}</div>}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {p.stages?.map((s, i) => (
              <div
                key={s.id || i}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: (s.color || T.accent) + '22',
                  color: s.color || T.accent,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {s.name} ({s.probability}%)
              </div>
            ))}
          </div>
        </div>
      ))}
      {pipelines.length === 0 && <div style={{ color: T.text3, fontSize: 12 }}>No pipelines</div>}
    </div>
  );

  // --- Products ---
  const renderProducts = () => (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Products</div>
        <Btn size="sm" onClick={() => setShowProductForm((p) => !p)}>+ Add Product</Btn>
      </div>

      {showProductForm && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Inp label="Name" value={productForm.name} onChange={(v) => setProductForm((p) => ({ ...p, name: v }))} width={180} />
          <Inp label="SKU" value={productForm.sku} onChange={(v) => setProductForm((p) => ({ ...p, sku: v }))} width={120} />
          <Inp label="Price" value={productForm.price} onChange={(v) => setProductForm((p) => ({ ...p, price: v }))} type="number" width={120} />
          <Inp label="Currency" value={productForm.currency} onChange={(v) => setProductForm((p) => ({ ...p, currency: v }))} width={80} />
          <Inp label="Description" value={productForm.description} onChange={(v) => setProductForm((p) => ({ ...p, description: v }))} width={200} />
          <Btn
            size="sm"
            onClick={async () => {
              try {
                await api('/settings/products', {
                  method: 'POST',
                  body: JSON.stringify({ ...productForm, price: Number(productForm.price) }),
                });
                setToast({ msg: 'Product created', type: 'success' });
                setShowProductForm(false);
                setProductForm({ name: '', sku: '', price: '', currency: 'USD', description: '' });
                const data = await api<{ products: Product[] }>('/settings/products');
                setProducts(Array.isArray(data) ? data : data.products || []);
              } catch {
                setToast({ msg: 'Failed to create product', type: 'error' });
              }
            }}
            disabled={!productForm.name}
          >
            Create
          </Btn>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>SKU</th>
            <th style={th}>Price</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id}>
              <td style={td}>{p.name}</td>
              <td style={{ ...td, fontFamily: FM, fontSize: 11 }}>{p.sku}</td>
              <td style={{ ...td, fontFamily: FM }}>{p.price} {p.currency}</td>
              <td style={td}><Badge text={p.active ? 'Active' : 'Inactive'} color={p.active ? T.green : T.text3} /></td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr><td style={{ ...td, textAlign: 'center', color: T.text3 }} colSpan={4}>No products</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // --- Custom Fields ---
  const renderFields = () => (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Custom Fields</div>
        <Btn size="sm" onClick={() => setShowFieldForm((p) => !p)}>+ Add Field</Btn>
      </div>

      {showFieldForm && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Inp label="Name" value={fieldForm.name} onChange={(v) => setFieldForm((p) => ({ ...p, name: v }))} width={160} />
          <SelectField
            label="Type"
            value={fieldForm.type}
            onChange={(v) => setFieldForm((p) => ({ ...p, type: v }))}
            options={[
              { value: 'text', label: 'Text' },
              { value: 'number', label: 'Number' },
              { value: 'date', label: 'Date' },
              { value: 'select', label: 'Select' },
              { value: 'boolean', label: 'Boolean' },
            ]}
          />
          <SelectField
            label="Entity"
            value={fieldForm.entityType}
            onChange={(v) => setFieldForm((p) => ({ ...p, entityType: v }))}
            options={ENTITY_TYPES.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }))}
          />
          {fieldForm.type === 'select' && (
            <Inp
              label="Options (comma-sep)"
              value={fieldForm.options}
              onChange={(v) => setFieldForm((p) => ({ ...p, options: v }))}
              width={200}
            />
          )}
          <Btn
            size="sm"
            onClick={async () => {
              try {
                await api('/settings/custom-fields', {
                  method: 'POST',
                  body: JSON.stringify({
                    ...fieldForm,
                    options: fieldForm.options ? fieldForm.options.split(',').map((s) => s.trim()) : undefined,
                  }),
                });
                setToast({ msg: 'Field created', type: 'success' });
                setShowFieldForm(false);
                setFieldForm({ name: '', type: 'text', entityType: 'contact', required: false, options: '' });
                const data = await api<{ fields: CustomField[] }>('/settings/custom-fields');
                setFields(Array.isArray(data) ? data : data.fields || []);
              } catch {
                setToast({ msg: 'Failed to create field', type: 'error' });
              }
            }}
            disabled={!fieldForm.name}
          >
            Create
          </Btn>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Type</th>
            <th style={th}>Entity</th>
            <th style={th}>Required</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.id}>
              <td style={td}>{f.name}</td>
              <td style={td}><Badge text={f.type} color={T.blue} /></td>
              <td style={td}><Badge text={f.entityType} color={T.purple} /></td>
              <td style={td}>{f.required ? 'Yes' : 'No'}</td>
            </tr>
          ))}
          {fields.length === 0 && (
            <tr><td style={{ ...td, textAlign: 'center', color: T.text3 }} colSpan={4}>No custom fields</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // --- Tags ---
  const renderTags = () => (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Tags</div>
        <Btn size="sm" onClick={() => setShowTagForm((p) => !p)}>+ Add Tag</Btn>
      </div>

      {showTagForm && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Inp label="Name" value={tagForm.name} onChange={(v) => setTagForm((p) => ({ ...p, name: v }))} width={160} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Color</label>
            <input
              type="color"
              value={tagForm.color}
              onChange={(e) => setTagForm((p) => ({ ...p, color: e.target.value }))}
              style={{ width: 40, height: 32, border: 'none', cursor: 'pointer', borderRadius: 6 }}
            />
          </div>
          <SelectField
            label="Entity"
            value={tagForm.entityType}
            onChange={(v) => setTagForm((p) => ({ ...p, entityType: v }))}
            options={ENTITY_TYPES.map((e) => ({ value: e, label: e.charAt(0).toUpperCase() + e.slice(1) }))}
          />
          <Btn
            size="sm"
            onClick={async () => {
              try {
                await api('/settings/tags', { method: 'POST', body: JSON.stringify(tagForm) });
                setToast({ msg: 'Tag created', type: 'success' });
                setShowTagForm(false);
                setTagForm({ name: '', color: '#2563EB', entityType: 'contact' });
                const data = await api<{ tags: Tag[] }>('/settings/tags');
                setTags(Array.isArray(data) ? data : data.tags || []);
              } catch {
                setToast({ msg: 'Failed to create tag', type: 'error' });
              }
            }}
            disabled={!tagForm.name}
          >
            Create
          </Btn>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tags.map((t) => (
          <Badge key={t.id} text={`${t.name} (${t.entityType})`} color={t.color} />
        ))}
        {tags.length === 0 && <div style={{ color: T.text3, fontSize: 12 }}>No tags</div>}
      </div>
    </div>
  );

  // --- API Keys ---
  const renderApiKeys = () => (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>API Keys</div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
        <Inp label="Key Name" value={newKeyName} onChange={setNewKeyName} width={200} />
        <Btn
          size="sm"
          onClick={async () => {
            try {
              const data = await api<{ key: string; id: string }>('/settings/api-keys', {
                method: 'POST',
                body: JSON.stringify({ name: newKeyName }),
              });
              setRevealedKey(data.key);
              setNewKeyName('');
              setToast({ msg: 'API key created. Copy it now - it will not be shown again.', type: 'success' });
              const keys = await api<{ keys: ApiKey[] }>('/settings/api-keys');
              setApiKeys(Array.isArray(keys) ? keys : keys.keys || []);
            } catch {
              setToast({ msg: 'Failed to create key', type: 'error' });
            }
          }}
          disabled={!newKeyName}
        >
          Create Key
        </Btn>
      </div>

      {revealedKey && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: T.yellowLt,
            border: `1px solid ${T.yellow}`,
            marginBottom: 16,
            fontFamily: FM,
            fontSize: 12,
            wordBreak: 'break-all',
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, color: T.yellow, marginBottom: 4 }}>
            NEW API KEY (copy now, shown only once):
          </div>
          {revealedKey}
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Prefix</th>
            <th style={th}>Created</th>
            <th style={th}>Last Used</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {apiKeys.map((k) => (
            <tr key={k.id}>
              <td style={td}>{k.name}</td>
              <td style={{ ...td, fontFamily: FM, fontSize: 11 }}>{k.prefix}...</td>
              <td style={{ ...td, fontSize: 11, color: T.text2 }}>{new Date(k.createdAt).toLocaleDateString()}</td>
              <td style={{ ...td, fontSize: 11, color: T.text2 }}>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
              <td style={td}>
                <Btn
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    try {
                      await api(`/settings/api-keys/${k.id}`, { method: 'DELETE' });
                      setToast({ msg: 'Key revoked', type: 'success' });
                      const data = await api<{ keys: ApiKey[] }>('/settings/api-keys');
                      setApiKeys(Array.isArray(data) ? data : data.keys || []);
                    } catch {
                      setToast({ msg: 'Failed to revoke', type: 'error' });
                    }
                  }}
                >
                  Revoke
                </Btn>
              </td>
            </tr>
          ))}
          {apiKeys.length === 0 && (
            <tr><td style={{ ...td, textAlign: 'center', color: T.text3 }} colSpan={5}>No API keys</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // --- Webhooks ---
  const renderWebhooks = () => (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Webhooks</div>
        <Btn size="sm" onClick={() => setShowWebhookForm((p) => !p)}>+ Add Webhook</Btn>
      </div>

      {showWebhookForm && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Inp label="URL" value={webhookForm.url} onChange={(v) => setWebhookForm((p) => ({ ...p, url: v }))} width={300} />
          <Inp
            label="Events (comma-sep)"
            value={webhookForm.events}
            onChange={(v) => setWebhookForm((p) => ({ ...p, events: v }))}
            width={250}
            placeholder="deal.created, contact.updated"
          />
          <Btn
            size="sm"
            onClick={async () => {
              try {
                await api('/settings/webhooks', {
                  method: 'POST',
                  body: JSON.stringify({
                    url: webhookForm.url,
                    events: webhookForm.events.split(',').map((s) => s.trim()),
                  }),
                });
                setToast({ msg: 'Webhook created', type: 'success' });
                setShowWebhookForm(false);
                setWebhookForm({ url: '', events: '' });
                const data = await api<{ webhooks: Webhook[] }>('/settings/webhooks');
                setWebhooks(Array.isArray(data) ? data : data.webhooks || []);
              } catch {
                setToast({ msg: 'Failed to create webhook', type: 'error' });
              }
            }}
            disabled={!webhookForm.url}
          >
            Create
          </Btn>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>URL</th>
            <th style={th}>Events</th>
            <th style={th}>Status</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {webhooks.map((w) => (
            <tr key={w.id}>
              <td style={{ ...td, fontFamily: FM, fontSize: 11, maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {w.url}
              </td>
              <td style={td}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {w.events.map((e) => (
                    <Badge key={e} text={e} color={T.blue} />
                  ))}
                </div>
              </td>
              <td style={td}><Badge text={w.active ? 'Active' : 'Inactive'} color={w.active ? T.green : T.text3} /></td>
              <td style={td}>
                <Btn
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    try {
                      await api(`/settings/webhooks/${w.id}`, { method: 'DELETE' });
                      setToast({ msg: 'Webhook deleted', type: 'success' });
                      const data = await api<{ webhooks: Webhook[] }>('/settings/webhooks');
                      setWebhooks(Array.isArray(data) ? data : data.webhooks || []);
                    } catch {
                      setToast({ msg: 'Failed to delete', type: 'error' });
                    }
                  }}
                >
                  Delete
                </Btn>
              </td>
            </tr>
          ))}
          {webhooks.length === 0 && (
            <tr><td style={{ ...td, textAlign: 'center', color: T.text3 }} colSpan={4}>No webhooks</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // --- Billing ---
  const renderBilling = () => (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Billing & Plan</div>
      {!billing ? (
        <div style={{ color: T.text3, fontSize: 12 }}>Loading billing info...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ background: T.surface2, borderRadius: 8, padding: 16, flex: '1 1 200px', border: `1px solid ${T.border2}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Current Plan</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.accent, marginTop: 4 }}>{billing.plan}</div>
            </div>
            <div style={{ background: T.surface2, borderRadius: 8, padding: 16, flex: '1 1 200px', border: `1px solid ${T.border2}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Users</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 4 }}>
                {billing.usersUsed} / {billing.usersLimit}
              </div>
              <div style={{ height: 4, background: T.surface3, borderRadius: 2, marginTop: 8 }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(billing.usersUsed / billing.usersLimit) * 100}%`,
                    background: T.accent,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
            <div style={{ background: T.surface2, borderRadius: 8, padding: 16, flex: '1 1 200px', border: `1px solid ${T.border2}` }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: 'uppercase' }}>Contacts</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 4 }}>
                {billing.contactsUsed} / {billing.contactsLimit}
              </div>
              <div style={{ height: 4, background: T.surface3, borderRadius: 2, marginTop: 8 }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(billing.contactsUsed / billing.contactsLimit) * 100}%`,
                    background: T.accent,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: T.text2, marginBottom: 16 }}>
            Renews: {new Date(billing.renewsAt).toLocaleDateString()}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn size="sm" onClick={() => setToast({ msg: 'Contact support to upgrade', type: 'info' as any })}>
              Upgrade
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => setToast({ msg: 'Contact support to downgrade', type: 'info' as any })}>
              Downgrade
            </Btn>
          </div>
        </>
      )}
    </div>
  );

  // --- Security ---
  const renderSecurity = () => (
    <div>
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Change Password</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
          <Inp
            label="Current Password"
            value={passwordForm.current}
            onChange={(v) => setPasswordForm((p) => ({ ...p, current: v }))}
            type="password"
            width={200}
          />
          <Inp
            label="New Password"
            value={passwordForm.newPass}
            onChange={(v) => setPasswordForm((p) => ({ ...p, newPass: v }))}
            type="password"
            width={200}
          />
          <Inp
            label="Confirm Password"
            value={passwordForm.confirm}
            onChange={(v) => setPasswordForm((p) => ({ ...p, confirm: v }))}
            type="password"
            width={200}
          />
          <Btn
            onClick={async () => {
              if (passwordForm.newPass !== passwordForm.confirm) {
                setToast({ msg: 'Passwords do not match', type: 'error' });
                return;
              }
              try {
                await api('/auth/change-password', {
                  method: 'POST',
                  body: JSON.stringify({
                    currentPassword: passwordForm.current,
                    newPassword: passwordForm.newPass,
                  }),
                });
                setToast({ msg: 'Password changed', type: 'success' });
                setPasswordForm({ current: '', newPass: '', confirm: '' });
              } catch {
                setToast({ msg: 'Failed to change password', type: 'error' });
              }
            }}
            disabled={!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm}
          >
            Change Password
          </Btn>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Two-Factor Authentication</div>
        <div style={{ fontSize: 12, color: T.text2, marginBottom: 12 }}>
          Enable 2FA for additional security on your account.
        </div>
        <Btn
          size="sm"
          onClick={async () => {
            try {
              await api('/auth/2fa/enable', { method: 'POST' });
              setToast({ msg: '2FA setup initiated. Check your authenticator app.', type: 'success' });
            } catch {
              setToast({ msg: 'Failed to enable 2FA', type: 'error' });
            }
          }}
        >
          Enable 2FA
        </Btn>
      </div>

      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Active Sessions</div>
        <div style={{ fontSize: 12, color: T.text2, marginBottom: 12 }}>
          Manage your active sessions across devices.
        </div>
        <Btn
          variant="danger"
          size="sm"
          onClick={async () => {
            try {
              await api('/auth/sessions/revoke-all', { method: 'POST' });
              setToast({ msg: 'All other sessions revoked', type: 'success' });
            } catch {
              setToast({ msg: 'Failed to revoke sessions', type: 'error' });
            }
          }}
        >
          Revoke All Other Sessions
        </Btn>
      </div>
    </div>
  );

  const renderers: Record<SettingsTab, () => React.ReactElement> = {
    general: renderGeneral,
    users: renderUsers,
    pipelines: renderPipelines,
    products: renderProducts,
    fields: renderFields,
    tags: renderTags,
    apikeys: renderApiKeys,
    webhooks: renderWebhooks,
    billing: renderBilling,
    security: renderSecurity,
  };

  const page: CSSProperties = {
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
    gap: 12,
  };

  const bodyStyle: CSSProperties = {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  };

  const sideNav: CSSProperties = {
    width: 180,
    borderRight: `1px solid ${T.border}`,
    background: T.surface,
    padding: '12px 0',
    overflow: 'auto',
  };

  const contentStyle: CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: 20,
  };

  return (
    <div style={page}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="grad-text"
            style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            AMASS
          </span>
          <span style={{ fontSize: 13, color: T.text2, fontWeight: 500 }}>Settings</span>
        </div>
      </div>

      <div style={bodyStyle}>
        <div style={sideNav}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 20px',
                fontSize: 12,
                fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? T.accent : T.text2,
                background: tab === t.key ? T.accentLt : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: F,
                borderLeft: tab === t.key ? `3px solid ${T.accent}` : '3px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={contentStyle}>{renderers[tab]()}</div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
