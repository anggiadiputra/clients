import type { Client, Note, Activity, Invoice, ServiceItem, Project, ProjectDetail, ProjectStatus, ProjectPriority, ProjectComment, ProjectAttachment } from './types';

export const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const token = () => localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token') || '';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token()}`,
});

async function handle(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    window.dispatchEvent(new Event('storage'));
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}


// Auth (public self-registration is disabled; admin creates users via /api/users)

export async function apiLogin(
  email: string,
  password: string,
  turnstileToken?: string,
): Promise<{ step: string; email: string }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, ...(turnstileToken ? { turnstileToken } : {}) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login gagal' }));
    throw new Error(err.error || 'Login gagal');
  }
  return res.json();
}

export async function apiVerifyOtp(email: string, code: string): Promise<{ token: string; user: { id: number; email: string; name: string | null; role: string } }> {
  const res = await fetch(`${BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'OTP salah' }));
    throw new Error(err.error || 'OTP salah');
  }
  return res.json();
}

export async function apiResendOtp(email: string): Promise<void> {
  const res = await fetch(`${BASE}/auth/otp/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('Gagal kirim ulang OTP');
}

export async function apiChangePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE}/auth/change-password`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handle(res);
}

export async function apiUpdateProfile(data: { name?: string; email: string }): Promise<{ token: string; user: { id: number; email: string; name: string | null; role: string }; message: string }> {
  const res = await fetch(`${BASE}/auth/profile`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handle(res);
}


export async function apiForgotPassword(email: string, turnstileToken?: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ...(turnstileToken ? { turnstileToken } : {}) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Gagal kirim OTP' }));
    throw new Error(err.error || 'Gagal kirim OTP');
  }
  return res.json();
}

export async function apiResetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Reset password gagal' }));
    throw new Error(err.error || 'Reset password gagal');
  }
  return res.json();
}

export async function apiTestKirisan(data: {
  recipient_email: string;
  kirisan_token?: string;
  kirisan_channel_key?: string;
  kirisan_template_id?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE}/settings/test-kirisan`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handle(res);
}

export async function apiTestBrevo(data: {
  recipient_email: string;
  brevo_api_key?: string;
  brevo_sender_email?: string;
  brevo_sender_name?: string;
  brevo_template_id?: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE}/settings/test-brevo`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handle(res);
}





export async function fetchClientByDisplayId(displayId: string): Promise<Client> {
  const res = await fetch(`${BASE}/clients/display/${displayId}`, { headers: headers() });
  return handle(res);
}

// Clients
export async function fetchClients(params?: { search?: string; status?: string | string[] }): Promise<Client[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  const status = params?.status;
  if (Array.isArray(status)) {
    if (status.length > 0) qs.set('status', status.join(','));
  } else if (status) {
    qs.set('status', status);
  }
  const url = `${BASE}/clients${qs.toString() ? '?' + qs : ''}`;
  const res = await fetch(url, { headers: headers() });
  return handle(res);
}

export async function fetchClient(id: number): Promise<Client> {
  const res = await fetch(`${BASE}/clients/${id}`, { headers: headers() });
  return handle(res);
}

export async function createClient(data: Partial<Client>): Promise<Client> {
  const res = await fetch(`${BASE}/clients`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handle(res);
}

export async function updateClient(id: number, data: Partial<Client>): Promise<Client> {
  const res = await fetch(`${BASE}/clients/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handle(res);
}

export async function deleteClient(id: number): Promise<void> {
  const res = await fetch(`${BASE}/clients/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handle(res);
}

export async function validateClientWhatsapp(id: number): Promise<{ isWhatsappValid: boolean | null }> {
  const res = await fetch(`${BASE}/clients/${id}/validate-wa`, {
    method: 'POST',
    headers: headers(),
  });
  return handle(res);
}

// Notes
export async function addNote(clientId: number, content: string): Promise<Note> {
  const res = await fetch(`${BASE}/clients/${clientId}/notes`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ content }),
  });
  return handle(res);
}

export async function deleteNote(clientId: number, noteId: number): Promise<void> {
  const res = await fetch(`${BASE}/clients/${clientId}/notes/${noteId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handle(res);
}

// Activities
export async function fetchActivities(clientId: number): Promise<Activity[]> {
  const res = await fetch(`${BASE}/clients/${clientId}/activities`, {
    headers: headers(),
  });
  return handle(res);
}

// Invoices
export async function fetchAllInvoices(): Promise<Invoice[]> {
  const res = await fetch(`${BASE}/invoices`, { headers: headers() });
  return handle(res);
}

export async function fetchInvoices(clientId: number): Promise<Invoice[]> {
  const res = await fetch(`${BASE}/clients/${clientId}/invoices`, { headers: headers() });
  return handle(res);
}

export async function createInvoice(clientId: number, data: {
  dueDate: string; tax?: number; notes?: string;
  items: { description: string; quantity: number; unitPrice: number }[];
}): Promise<Invoice> {
  const res = await fetch(`${BASE}/clients/${clientId}/invoices`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handle(res);
}

export async function updateInvoiceStatus(invoiceId: number, status: string): Promise<Invoice> {
  const res = await fetch(`${BASE}/invoices/${invoiceId}/status`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ status }),
  });
  return handle(res);
}

export async function updateInvoice(invoiceId: number, data: {
  issueDate?: string; dueDate?: string; discount?: number; tax?: number; notes?: string;
  items?: { description: string; quantity: number; unitPrice: number }[];
}): Promise<Invoice> {
  const res = await fetch(`${BASE}/invoices/${invoiceId}`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data),
  });
  return handle(res);
}

export async function deleteInvoice(invoiceId: number): Promise<void> {
  const res = await fetch(`${BASE}/invoices/${invoiceId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handle(res);
}

// Download helpers — fetch as blob using Authorization header so token never leaks into URLs/logs.
async function downloadBlob(path: string, fallbackName: string) {
  const res = await fetch(path, { headers: headers() });
  if (!res.ok) {
    let errMsg = 'Download gagal';
    try { const j = await res.json(); if (j?.error) errMsg = j.error; } catch {}
    throw new Error(errMsg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Prefer server-provided filename via Content-Disposition if any
  const cd = res.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename="?([^";]+)"?/);
  a.download = match?.[1] || fallbackName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadInvoicePdf(invoiceId: number, invoiceNumber?: string) {
  return downloadBlob(
    `${BASE}/invoices/${invoiceId}/pdf`,
    `${invoiceNumber || 'invoice'}.pdf`,
  );
}

// Services
export async function fetchServices(): Promise<ServiceItem[]> {
  const res = await fetch(`${BASE}/services`, { headers: headers() });
  return handle(res);
}

export async function createService(data: { name: string; description?: string; price: number }): Promise<ServiceItem> {
  const res = await fetch(`${BASE}/services`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data),
  });
  return handle(res);
}

export async function updateService(id: number, data: { name: string; description?: string; price: number }): Promise<ServiceItem> {
  const res = await fetch(`${BASE}/services/${id}`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data),
  });
  return handle(res);
}

export async function deleteService(id: number): Promise<void> {
  const res = await fetch(`${BASE}/services/${id}`, {
    method: 'DELETE', headers: headers(),
  });
  return handle(res);
}

// Export
export async function exportClientsXlsx() {
  return downloadBlob(
    `${BASE}/export?format=xlsx`,
    `clients-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

// Re-fetch the authenticated user's record (returns role).
export async function fetchMe(): Promise<{ id: number; email: string; name: string | null; role: string }> {
  const res = await fetch(`${BASE}/auth/me`, { headers: headers() });
  return handle(res);
}

// User management (admin only)
export interface ManagedUser {
  id: number;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'STAFF' | 'VIEWER';
  createdAt: string;
}

export async function fetchUsers(): Promise<ManagedUser[]> {
  const res = await fetch(`${BASE}/users`, { headers: headers() });
  return handle(res);
}

// Lightweight PIC list (STAFF only) — available to any authenticated user for project assignment dropdowns.
export async function fetchPicOptions(): Promise<{ id: number; name: string | null; email: string }[]> {
  const res = await fetch(`${BASE}/users/pic-options`, { headers: headers() });
  return handle(res);
}

export async function createUser(data: { email: string; password: string; name?: string; role?: 'ADMIN' | 'STAFF' | 'VIEWER' }): Promise<ManagedUser> {
  const res = await fetch(`${BASE}/users`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  return handle(res);
}

export async function updateUserRole(id: number, role: 'ADMIN' | 'STAFF' | 'VIEWER'): Promise<ManagedUser> {
  const res = await fetch(`${BASE}/users/${id}/role`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ role }),
  });
  return handle(res);
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${BASE}/users/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handle(res);
}

export async function adminResetPassword(id: number, newPassword: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE}/users/${id}/reset-password`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ newPassword }),
  });
  return handle(res);
}

// Page access matrix
export interface PageAccessRow {
  id: number;
  role: 'ADMIN' | 'STAFF' | 'VIEWER';
  pageKey: string;
  allowed: boolean;
}

export async function fetchPageAccesses(): Promise<PageAccessRow[]> {
  const res = await fetch(`${BASE}/access`, { headers: headers() });
  return handle(res);
}

export async function fetchMyAccesses(): Promise<PageAccessRow[]> {
  const res = await fetch(`${BASE}/access/me`, { headers: headers() });
  return handle(res);
}

export async function updatePageAccess(role: 'ADMIN' | 'STAFF' | 'VIEWER', pageKey: string, allowed: boolean): Promise<PageAccessRow> {
  const res = await fetch(`${BASE}/access/${role}/${pageKey}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ allowed }),
  });
  return handle(res);
}

// ============= Projects =============
export interface ProjectFilters {
  status?: ProjectStatus;
  clientId?: number;
  assigneeId?: number;
  priority?: ProjectPriority;
  q?: string;
}

export async function fetchProjects(filters: ProjectFilters = {}): Promise<Project[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.clientId) params.set('clientId', String(filters.clientId));
  if (filters.assigneeId) params.set('assigneeId', String(filters.assigneeId));
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.q) params.set('q', filters.q);
  const qs = params.toString();
  const res = await fetch(`${BASE}/projects${qs ? `?${qs}` : ''}`, { headers: headers() });
  return handle(res);
}

export async function fetchProject(id: number): Promise<ProjectDetail> {
  const res = await fetch(`${BASE}/projects/${id}`, { headers: headers() });
  return handle(res);
}

export async function fetchProjectsByClient(clientId: number): Promise<Project[]> {
  const res = await fetch(`${BASE}/projects/by-client/${clientId}`, { headers: headers() });
  return handle(res);
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  dueDate?: string | null;
  clientId: number;
  assigneeId?: number | null;
  value?: string | null;
  commission?: string | null;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const res = await fetch(`${BASE}/projects`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(input),
  });
  return handle(res);
}

export interface UpdateProjectInput {
  title?: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  dueDate?: string | null;
  assigneeId?: number | null;
  value?: string | null;
  commission?: string | null;
}

export async function updateProject(id: number, input: UpdateProjectInput): Promise<Project> {
  const res = await fetch(`${BASE}/projects/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(input),
  });
  return handle(res);
}

export async function deleteProject(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/projects/${id}`, { method: 'DELETE', headers: headers() });
  return handle(res);
}

export async function addProjectComment(projectId: number, body: string): Promise<ProjectComment> {
  const res = await fetch(`${BASE}/projects/${projectId}/comments`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ body }),
  });
  return handle(res);
}

export async function deleteProjectComment(projectId: number, commentId: number): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/projects/${projectId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handle(res);
}

export async function uploadProjectAttachment(projectId: number, file: File): Promise<ProjectAttachment> {
  const fd = new FormData();
  fd.append('file', file);
  const { 'Content-Type': _omit, ...authHeaders } = headers();
  void _omit;
  const res = await fetch(`${BASE}/projects/${projectId}/attachments`, {
    method: 'POST',
    headers: authHeaders,
    body: fd,
  });
  return handle(res);
}

export async function deleteProjectAttachment(projectId: number, attId: number): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE}/projects/${projectId}/attachments/${attId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  return handle(res);
}
