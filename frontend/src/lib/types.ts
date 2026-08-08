export type Status =
  | 'CALON_CLIENT'
  | 'FOLLOW_UP'
  | 'DEAL'
  | 'KERJAKAN'
  | 'MASA_GARANSI'
  | 'SELESAI';

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface Client {
  id: number;
  displayId: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  isWhatsappValid?: boolean | null;
  website: string | null;
  address: string | null;
  status: Status;
  notes?: Note[];
  activities?: Activity[];
  noteCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: number;
  content: string;
  clientId: number;
  createdAt: string;
}

export interface Activity {
  id: number;
  action: string;
  clientId: number;
  createdAt: string;
}

export const STATUS_LABELS: Record<Status, string> = {
  CALON_CLIENT: 'Calon Client',
  FOLLOW_UP: 'Follow Up',
  DEAL: 'Deal',
  KERJAKAN: 'Kerjakan',
  MASA_GARANSI: 'Masa Garansi',
  SELESAI: 'Selesai',
};

export const STATUS_ORDER: Status[] = [
  'CALON_CLIENT',
  'FOLLOW_UP',
  'DEAL',
  'KERJAKAN',
  'MASA_GARANSI',
  'SELESAI',
];

export const STATUS_COLORS: Record<Status, string> = {
  CALON_CLIENT: 'bg-blue-50 text-blue-700 border-blue-100',
  FOLLOW_UP: 'bg-amber-50 text-amber-700 border-amber-200',
  DEAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  KERJAKAN: 'bg-purple-50 text-purple-700 border-purple-100',
  MASA_GARANSI: 'bg-orange-50 text-orange-700 border-orange-100',
  SELESAI: 'bg-gray-50 text-gray-600 border-gray-200',
};

// Invoice types
export type InvoiceStatus = 'UNPAID' | 'PAID' | 'CANCELLED';

export interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discount: number;
  discountAmount: number;
  tax: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  notes: string | null;
  items: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  UNPAID: 'Belum Dibayar',
  PAID: 'Lunas',
  CANCELLED: 'Dibatalkan',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  UNPAID: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-100',
};

export interface ServiceItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface ManagedUser {
  id: number;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'STAFF' | 'VIEWER';
  createdAt: string;
}

// Project types
export type ProjectStatus = 'MULAI' | 'PENGERJAAN' | 'REVIEW' | 'REVISI' | 'SELESAI';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type ProjectActivityKind = 'CREATE' | 'STATUS_CHANGE' | 'COMMENT' | 'ATTACHMENT' | 'ASSIGNEE_CHANGE' | 'UPDATE';

export const PROJECT_STATUS_ORDER: ProjectStatus[] = ['MULAI', 'PENGERJAAN', 'REVIEW', 'REVISI', 'SELESAI'];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  MULAI: 'Mulai',
  PENGERJAAN: 'Pengerjaan',
  REVIEW: 'Review',
  REVISI: 'Revisi',
  SELESAI: 'Selesai',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  MULAI: 'bg-gray-100 text-gray-700 border-gray-200',
  PENGERJAAN: 'bg-blue-100 text-blue-700 border-blue-200',
  REVIEW: 'bg-amber-100 text-amber-700 border-amber-200',
  REVISI: 'bg-orange-100 text-orange-700 border-orange-200',
  SELESAI: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const PROJECT_PRIORITY_LABELS: Record<ProjectPriority, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
  URGENT: 'Mendesak',
};

export const PROJECT_PRIORITY_COLORS: Record<ProjectPriority, string> = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-amber-100 text-amber-700',
  URGENT: 'bg-red-100 text-red-700',
};

export const PROJECT_ACTIVITY_LABELS: Record<ProjectActivityKind, string> = {
  CREATE: 'membuat proyek',
  STATUS_CHANGE: 'mengubah status',
  COMMENT: 'menambahkan komentar',
  ATTACHMENT: 'mengupload lampiran',
  ASSIGNEE_CHANGE: 'mengubah penanggung jawab',
  UPDATE: 'memperbarui proyek',
};

export interface ProjectClientRef {
  id: number;
  displayId: string;
  name: string;
}

export interface ProjectUserRef {
  id: number;
  name: string | null;
  email: string;
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  dueDate: string | null;
  value: string | null;
  commission: string | null;
  clientId: number;
  client: ProjectClientRef;
  assigneeId: number | null;
  assignee: ProjectUserRef | null;
  _count?: { comments: number; attachments: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectComment {
  id: number;
  projectId: number;
  userId: number;
  user: ProjectUserRef;
  body: string;
  createdAt: string;
}

export interface ProjectAttachment {
  id: number;
  projectId: number;
  filename: string;
  storageKey: string;
  contentType: string;
  size: number;
  uploadedById: number;
  uploadedBy: ProjectUserRef;
  createdAt: string;
  url?: string;
}

export interface ProjectActivity {
  id: number;
  projectId: number;
  userId: number;
  user: ProjectUserRef;
  kind: ProjectActivityKind;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
}

export interface ProjectDetail extends Project {
  comments: ProjectComment[];
  attachments: ProjectAttachment[];
  activities: ProjectActivity[];
}
