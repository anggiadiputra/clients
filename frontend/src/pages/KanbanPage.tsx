import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Building2, Mail, Phone, Globe, MapPin, MessageSquare, BadgeCheck, XCircle, Plus, ArrowRight } from 'lucide-react';
import { fetchClients, updateClient } from '../lib/api';
import { STATUS_LABELS, STATUS_COLORS } from '../lib/types';
import type { Client, Status } from '../lib/types';
import { Link } from 'react-router-dom';
import AddClientModal from '../components/AddClientModal';
import { useSettings } from '../contexts/SettingsContext';
import { getPrimaryClasses } from '../lib/colors';

// Kanban pipeline: calon client → follow up. Begitu deal, pindah ke Pelanggan di /clients.
const PIPELINE_STATUSES: Status[] = ['CALON_CLIENT', 'FOLLOW_UP'];
const ACTIVE_CALON_STATUSES: Status[] = ['CALON_CLIENT', 'FOLLOW_UP'];

export default function KanbanPage() {
  const { settings } = useSettings();
  const primaryClasses = getPrimaryClasses(settings.primaryColor);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    try {
      const data = await fetchClients({ status: ACTIVE_CALON_STATUSES });
      setClients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as Status;
    const clientId = parseInt(draggableId);

    if (newStatus === 'DEAL') {
      // Optimistically remove from Calon Pelanggan (moves to Pelanggan page)
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    } else {
      // Optimistic update within Calon Pelanggan
      setClients((prev) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c))
      );
    }

    try {
      await updateClient(clientId, { status: newStatus });
      load();
    } catch {
      load(); // Revert on failure
    }
  }

  async function promoteToNext(clientId: number, currentStatus: Status) {
    const nextStatus: Status = currentStatus === 'CALON_CLIENT' ? 'FOLLOW_UP' : 'DEAL';

    if (nextStatus === 'DEAL') {
      // Optimistically remove from Calon Pelanggan (moves to Pelanggan page)
      setClients((prev) => prev.filter((c) => c.id !== clientId));
    }

    try {
      await updateClient(clientId, { status: nextStatus });
      load();
    } catch {
      console.error('Gagal memindahkan client');
      load();
    }
  }

  function promoteTitle(status: Status) {
    if (status === 'CALON_CLIENT') return 'Follow Up';
    if (status === 'FOLLOW_UP') return 'Jadikan Deal';
    return 'Lanjut';
  }

  const clientsByStatus = (status: Status) =>
    clients.filter((c) => c.status === status);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <svg className="animate-spin w-6 h-6 text-gray-800" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Calon Pelanggan</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className={`px-4 py-2 text-white text-sm font-semibold rounded-lg flex items-center gap-2 ${primaryClasses.button}`}
        >
          <Plus className="w-4 h-4" />
          Calon Client
        </button>
      </div>

      {clients.length === 0 && !loading ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">Belum ada calon client</p>
          <p className="text-xs text-gray-400 mt-1">Klik "+ Calon Client" untuk menambah</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PIPELINE_STATUSES.map((status) => (
              <Droppable key={status} droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`bg-white rounded-xl border border-gray-200 shadow-sm p-3 min-h-[200px] transition-colors ${
                      snapshot.isDraggingOver ? 'bg-gray-50 border-gray-300' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[status]}`}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="text-xs font-bold text-gray-400">
                        {clientsByStatus(status).length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {clientsByStatus(status).map((client, index) => (
                        <Draggable key={client.id} draggableId={String(client.id)} index={index}>
                          {(provided, snapshot) => (
                            <Link
                              to={`/clients/${client.displayId}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`relative block bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : 'shadow-sm'
                              }`}
                            >
                              <span
                                role="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); promoteToNext(client.id, client.status); }}
                                className={`absolute top-2 right-2 p-1 rounded-md transition-colors ${
                                  client.status === 'DEAL'
                                    ? 'bg-purple-50 text-purple-600 hover:bg-purple-100 hover:text-purple-700'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700'
                                }`}
                                title={promoteTitle(client.status)}
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                              <p className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1 pr-6">
                                {client.name}
                              </p>
                              <p className="text-xs font-bold text-gray-400 mb-1.5">{client.displayId}</p>
                              <div className="space-y-1">
                                {client.email && (
                                  <div className="flex items-center gap-1.5">
                                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span className="text-xs text-gray-500 truncate">{client.email}</span>
                                  </div>
                                )}
                                {client.whatsapp && (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span className="text-xs text-gray-500 truncate">{client.whatsapp}</span>
                                    {client.isWhatsappValid === true && (
                                      <span title="Nomor WhatsApp Terverifikasi"><BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" /></span>
                                    )}
                                    {client.isWhatsappValid === false && (
                                      <span title="Nomor Tidak Terdaftar di WhatsApp"><XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" /></span>
                                    )}
                                  </div>
                                )}
                                {client.website && (
                                  <div className="flex items-center gap-1.5">
                                    <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span className="text-xs text-gray-500 truncate">{client.website}</span>
                                  </div>
                                )}
                                {client.address && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                                    <span className="text-xs text-gray-500 truncate">{client.address}</span>
                                  </div>
                                )}
                              </div>
                              {client.noteCount != null && client.noteCount > 0 && (
                                <div className="flex items-center gap-1 mt-2">
                                  <MessageSquare className="w-3 h-3 text-gray-400" />
                                  <span className="text-xs text-gray-400">{client.noteCount} catatan</span>
                                </div>
                              )}
                            </Link>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      <AddClientModal open={showModal} onClose={() => setShowModal(false)} onCreated={load} defaultStatus="CALON_CLIENT" />
    </div>
  );
}
