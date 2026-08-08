import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, MessageSquare, Paperclip, Trash2, Upload, Calendar, User as UserIcon, Send, Loader2, Edit2, Save, Banknote } from 'lucide-react';
import type {
  ProjectDetail, ProjectPriority, ProjectStatus, ProjectComment, ProjectAttachment,
  ManagedUser, Client,
} from '../../lib/types';
import {
  PROJECT_PRIORITY_LABELS, PROJECT_STATUS_LABELS, PROJECT_PRIORITY_COLORS, PROJECT_STATUS_COLORS,
  PROJECT_ACTIVITY_LABELS,
} from '../../lib/types';
import { useAuth } from '../../contexts/AuthContext';
import {
  fetchProject, updateProject, addProjectComment, deleteProjectComment,
  uploadProjectAttachment, deleteProjectAttachment,
} from '../../lib/api';

interface Props {
  projectId: number;
  clients: Pick<Client, 'id' | 'name' | 'displayId'>[];
  users: Pick<ManagedUser, 'id' | 'name' | 'email'>[];
  onClose: () => void;
  onChanged: () => void;
}

function initials(name: string | null | undefined, fallback?: string): string {
  if (name) return name.split(' ').slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  if (fallback) return fallback.slice(0, 2).toUpperCase();
  return '?';
}

function formatDate(s: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatRupiah(v: string | number | null | undefined): string {
  if (v == null || v === '') return '';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (!Number.isFinite(n)) return '';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProjectDetailModal({ projectId, clients, users, onClose, onChanged }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [data, setData] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit fields
  const [eTitle, setETitle] = useState('');
  const [eDescription, setEDescription] = useState('');
  const [ePriority, setEPriority] = useState<ProjectPriority>('MEDIUM');
  const [eStatus, setEStatus] = useState<ProjectStatus>('MULAI');
  const [eDueDate, setEDueDate] = useState('');
  const [eAssigneeId, setEAssigneeId] = useState<number | ''>('');
  const [eValue, setEValue] = useState('');
  const [eCommission, setECommission] = useState('');

  async function load() {
    try {
      const d = await fetchProject(projectId);
      setData(d);
      setETitle(d.title);
      setEDescription(d.description || '');
      setEPriority(d.priority);
      setEStatus(d.status);
      setEDueDate(d.dueDate ? d.dueDate.slice(0, 10) : '');
      setEAssigneeId(d.assigneeId ?? '');
      setEValue(d.value ?? '');
      setECommission(d.commission ?? '');
    } catch (e: any) {
      setErr(e.message || 'Gagal memuat proyek');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  async function handleSaveEdit() {
    if (!data) return;
    setErr(null);
    try {
      // Staff tidak boleh menyentuh field nilai/komisi — kirim hanya jika admin.
      const payload: any = {
        title: eTitle.trim(),
        description: eDescription.trim() || null,
        priority: ePriority,
        status: eStatus,
        dueDate: eDueDate || null,
        assigneeId: eAssigneeId === '' ? null : (eAssigneeId as number),
      };
      if (isAdmin) {
        payload.value = eValue.trim() || null;
        payload.commission = eCommission.trim() || null;
      }
      await updateProject(data.id, payload);
      setEditing(false);
      await load();
      onChanged();
    } catch (e: any) {
      setErr(e.message || 'Gagal menyimpan');
    }
  }

  async function handleAddComment() {
    if (!data || !commentBody.trim()) return;
    setCommentSaving(true);
    try {
      await addProjectComment(data.id, commentBody.trim());
      setCommentBody('');
      await load();
    } catch (e: any) {
      setErr(e.message || 'Gagal menambah komentar');
    } finally {
      setCommentSaving(false);
    }
  }

  async function handleDeleteComment(c: ProjectComment) {
    if (!data) return;
    if (!confirm('Hapus komentar ini?')) return;
    try {
      await deleteProjectComment(data.id, c.id);
      await load();
    } catch (e: any) {
      setErr(e.message || 'Gagal hapus komentar');
    }
  }

  async function handleUpload(file: File) {
    if (!data) return;
    if (file.size > 10 * 1024 * 1024) { setErr('File terlalu besar (maks 10MB)'); return; }
    setUploading(true);
    setErr(null);
    try {
      await uploadProjectAttachment(data.id, file);
      await load();
      onChanged();
    } catch (e: any) {
      setErr(e.message || 'Gagal upload');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleDeleteAttachment(a: ProjectAttachment) {
    if (!data) return;
    if (!confirm(`Hapus lampiran "${a.filename}"?`)) return;
    try {
      await deleteProjectAttachment(data.id, a.id);
      await load();
      onChanged();
    } catch (e: any) {
      setErr(e.message || 'Gagal hapus lampiran');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {loading && (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {err && !loading && (
          <div className="m-5 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg p-3 flex items-start justify-between">
            <span>{err}</span>
            <button onClick={() => setErr(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {data && !loading && (
          <>
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {editing ? (
                  <input
                    type="text"
                    value={eTitle}
                    onChange={(e) => setETitle(e.target.value)}
                    className="w-full text-base font-bold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-black py-1"
                  />
                ) : (
                  <h3 className="text-base font-bold text-gray-900">{data.title}</h3>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-500">
                  <Link to={`/clients/${data.client.displayId}`} className="text-blue-600 hover:underline font-medium">
                    {data.client.name}
                  </Link>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${PROJECT_STATUS_COLORS[data.status]}`}>
                    {PROJECT_STATUS_LABELS[data.status]}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${PROJECT_PRIORITY_COLORS[data.priority]}`}>
                    {PROJECT_PRIORITY_LABELS[data.priority]}
                  </span>
                  {data.dueDate && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(data.dueDate)}
                    </span>
                  )}
                  {data.assignee && (
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {data.assignee.name || data.assignee.email}
                    </span>
                  )}
                  {data.value && isAdmin && (
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <Banknote className="w-3 h-3" />
                      <span className="font-semibold">Nilai:</span> {formatRupiah(data.value)}
                    </span>
                  )}
                  {data.commission && (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Komisi</span>
                      <span className="font-semibold">{formatRupiah(data.commission)}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {!editing && isAdmin && (
                  <button onClick={() => setEditing(true)} className="px-2.5 py-1.5 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg inline-flex items-center gap-1.5 text-xs font-semibold border border-gray-200" title="Edit proyek">
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
            </div>

            {editing && (
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 space-y-3">
                <div>
                  <label className="block text-xs uppercase font-bold text-gray-400 tracking-wider mb-1">Deskripsi</label>
                  <textarea
                    value={eDescription}
                    onChange={(e) => setEDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Status</label>
                    <select value={eStatus} onChange={(e) => setEStatus(e.target.value as ProjectStatus)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
                      {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((k) => <option key={k} value={k}>{PROJECT_STATUS_LABELS[k]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Prioritas</label>
                    <select value={ePriority} onChange={(e) => setEPriority(e.target.value as ProjectPriority)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
                      {(Object.keys(PROJECT_PRIORITY_LABELS) as ProjectPriority[]).map((k) => <option key={k} value={k}>{PROJECT_PRIORITY_LABELS[k]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Tenggat</label>
                    <input type="date" value={eDueDate} onChange={(e) => setEDueDate(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">PIC</label>
                    <select value={eAssigneeId} onChange={(e) => setEAssigneeId(e.target.value ? parseInt(e.target.value) : '')} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs">
                      <option value="">—</option>
                      {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {isAdmin && (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Nilai (Rp)</label>
                      <input type="number" inputMode="numeric" min="0" step="1000" value={eValue} onChange={(e) => setEValue(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs" placeholder="0" />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Komisi (Rp)</label>
                    <input type="number" inputMode="numeric" min="0" step="1000" value={eCommission} onChange={(e) => setECommission(e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs" placeholder="0" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setEditing(false); load(); }} className="px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-200 rounded-lg">Batal</button>
                  <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 inline-flex items-center gap-1">
                    <Save className="w-3 h-3" /> Simpan
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {data.description && !editing && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{data.description}</p>
              )}

              {/* Comments */}
              <section>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Komentar ({data.comments.length})
                </h4>
                <div className="space-y-2 mb-3">
                  {data.comments.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada komentar.</p>}
                  {data.comments.map((c) => (
                    <div key={c.id} className="flex gap-2 bg-gray-50 rounded-lg p-2.5">
                      <div className="w-7 h-7 rounded-full bg-gray-300 text-gray-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {initials(c.user.name, c.user.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-gray-900">{c.user.name || c.user.email}</span>
                          <span className="text-[10px] text-gray-400">{formatDate(c.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.body}</p>
                      </div>
                      <button onClick={() => handleDeleteComment(c)} className="text-gray-300 hover:text-red-500 self-start" title="Hapus">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Tulis komentar…"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  />
                  <button onClick={handleAddComment} disabled={commentSaving || !commentBody.trim()} className="px-3 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 inline-flex items-center gap-1">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </section>

              {/* Attachments */}
              <section>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Lampiran ({data.attachments.length})
                </h4>
                <div className="space-y-1.5 mb-2">
                  {data.attachments.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada lampiran.</p>}
                  {data.attachments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline font-medium truncate block"
                        >
                          {a.filename}
                        </a>
                        <p className="text-[10px] text-gray-400">
                          {formatBytes(a.size)} · {a.uploadedBy.name || a.uploadedBy.email} · {formatDate(a.createdAt)}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteAttachment(a)} className="text-gray-300 hover:text-red-500" title="Hapus">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.xls,.xlsx,.zip,.txt"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 inline-flex items-center justify-center gap-1.5"
                >
                  {uploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengupload…</> : <><Upload className="w-3.5 h-3.5" /> Upload file (maks 10MB)</>}
                </button>
              </section>

              {/* Activity */}
              <section>
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Aktivitas</h4>
                <div className="space-y-1.5 text-xs">
                  {data.activities.length === 0 && <p className="text-gray-400 italic">Belum ada aktivitas.</p>}
                  {data.activities.map((a) => (
                    <div key={a.id} className="flex items-start gap-2 text-gray-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">{a.user.name || a.user.email}</span>
                        {' '}{PROJECT_ACTIVITY_LABELS[a.kind]}
                        {a.fromValue && a.toValue && (
                          <>: <code className="text-[10px] bg-gray-100 px-1 rounded">{a.fromValue}</code> → <code className="text-[10px] bg-gray-100 px-1 rounded">{a.toValue}</code></>
                        )}
                        {!a.fromValue && a.toValue && (
                          <> · <code className="text-[10px] bg-gray-100 px-1 rounded">{a.toValue}</code></>
                        )}
                        <span className="text-gray-400 ml-1">· {formatDate(a.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
