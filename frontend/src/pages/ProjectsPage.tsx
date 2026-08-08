import { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Plus, FolderKanban, Banknote } from 'lucide-react';
import {
  fetchProjects, updateProject, fetchClients, fetchPicOptions, fetchServices,
  type ProjectFilters,
} from '../lib/api';
import type { Project, ProjectStatus, ProjectPriority, Client, ManagedUser, ServiceItem } from '../lib/types';
import { PROJECT_STATUS_ORDER, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '../lib/types';
import ProjectCard from '../components/projects/ProjectCard';
import ProjectFilterBar from '../components/projects/ProjectFilterBar';
import CreateProjectModal from '../components/projects/CreateProjectModal';
import ProjectDetailModal from '../components/projects/ProjectDetailModal';
import { useAuth } from '../contexts/AuthContext';

function formatRupiah(v: string | number | null | undefined): string {
  if (v == null || v === '') return 'Rp 0';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (!Number.isFinite(n)) return 'Rp 0';
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);

  // Filters
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ProjectPriority | ''>('');
  const [clientId, setClientId] = useState<number | ''>('');
  const [assigneeId, setAssigneeId] = useState<number | ''>('');

  async function load() {
    setLoading(true);
    try {
      const filters: ProjectFilters = {};
      if (q.trim()) filters.q = q.trim();
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (clientId !== '') filters.clientId = clientId as number;
      if (assigneeId !== '') filters.assigneeId = assigneeId as number;
      const data = await fetchProjects(filters);
      setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [q, statusFilter, priorityFilter, clientId, assigneeId]);

  useEffect(() => {
    (async () => {
      try {
        const [c, u, s] = await Promise.all([fetchClients(), fetchPicOptions(), fetchServices()]);
        setClients(c);
        setUsers(u as unknown as ManagedUser[]);
        setServices(s);
      } catch (e) { console.error(e); }
    })();
  }, []);

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as ProjectStatus;
    const projectId = parseInt(draggableId);
    const proj = projects.find((p) => p.id === projectId);
    if (!proj || proj.status === newStatus) return;

    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p)));
    try {
      await updateProject(projectId, { status: newStatus });
    } catch {
      load();
    }
  }

  const byStatus = useMemo(() => {
    const map: Record<ProjectStatus, Project[]> = {
      MULAI: [], PENGERJAAN: [], REVIEW: [], REVISI: [], SELESAI: [],
    };
    for (const p of projects) map[p.status].push(p);
    return map;
  }, [projects]);

  const clientsLite = clients.map((c) => ({ id: c.id, name: c.name, displayId: c.displayId }));
  const usersLite = users.map((u) => ({ id: u.id, name: u.name, email: u.email }));
  const servicesLite = services.map((s) => ({ id: s.id, name: s.name }));

  // Estimasi: komisi dari proyek yang BELUM selesai (masih mungkin masuk).
  const totalCommissionEstimate = useMemo(
    () => projects
      .filter((p) => p.status !== 'SELESAI')
      .reduce((sum, p) => sum + (parseFloat(p.commission ?? '0') || 0), 0),
    [projects],
  );

  // Selesai: komisi dari proyek yang sudah SELESAI.
  const totalCommissionDone = useMemo(
    () => projects
      .filter((p) => p.status === 'SELESAI')
      .reduce((sum, p) => sum + (parseFloat(p.commission ?? '0') || 0), 0),
    [projects],
  );

  function resetFilters() {
    setQ(''); setStatusFilter(''); setPriorityFilter(''); setClientId(''); setAssigneeId('');
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FolderKanban className="w-5 h-5" />
            Proyek
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isAdmin
              ? 'Semua proyek yang sedang berjalan.'
              : 'Proyek yang di-assign kepada Anda.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <>
              <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg flex items-center gap-2">
                <Banknote className="w-4 h-4 text-amber-600" />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">Komisi Estimasi</p>
                  <p className="text-sm font-bold text-amber-700">{formatRupiah(totalCommissionEstimate)}</p>
                </div>
              </div>
              <div className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Komisi Selesai</p>
                  <p className="text-sm font-bold text-emerald-700">{formatRupiah(totalCommissionDone)}</p>
                </div>
              </div>
            </>
          )}
          {isAdmin && (
            <button
              onClick={() => setOpenCreate(true)}
              className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Baru
            </button>
          )}
        </div>
      </div>

      <ProjectFilterBar
        q={q} setQ={setQ}
        status={statusFilter} setStatus={setStatusFilter}
        priority={priorityFilter} setPriority={setPriorityFilter}
        clientId={clientId} setClientId={setClientId}
        assigneeId={assigneeId} setAssigneeId={setAssigneeId}
        clients={clientsLite} users={usersLite}
        onReset={resetFilters}
        hideAssignee={!isAdmin}
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-black rounded-full" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FolderKanban className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Belum ada proyek. Klik "Proyek Baru" untuk mulai.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto">
            {PROJECT_STATUS_ORDER.map((status) => {
              const list = byStatus[status];
              return (
                <div key={status} className="bg-gray-50 rounded-xl p-2 min-h-[200px] flex flex-col">
                  <div className={`px-2 py-1.5 mb-2 rounded-lg text-xs font-bold flex items-center justify-between ${PROJECT_STATUS_COLORS[status]}`}>
                    <span>{PROJECT_STATUS_LABELS[status]}</span>
                    <span className="text-[10px] opacity-70">{list.length}</span>
                  </div>
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 space-y-2 transition-colors rounded-lg p-1 ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
                        style={{ minHeight: 100 }}
                      >
                        {list.map((p, idx) => (
                          <Draggable key={p.id} draggableId={String(p.id)} index={idx}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                              >
                                <ProjectCard
                                  project={p}
                                  isDragging={dragSnapshot.isDragging}
                                  onClick={() => setOpenDetailId(p.id)}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {openCreate && (
        <CreateProjectModal
          clients={clientsLite}
          users={usersLite}
          services={servicesLite}
          onClose={() => setOpenCreate(false)}
          onCreated={() => { setOpenCreate(false); load(); }}
        />
      )}

      {openDetailId !== null && (
        <ProjectDetailModal
          projectId={openDetailId}
          clients={clientsLite}
          users={usersLite}
          onClose={() => setOpenDetailId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
