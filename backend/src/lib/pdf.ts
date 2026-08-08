import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return format(d, 'EEEE, dd MMMM yyyy', { locale: id });
}

function formatRupiah(n: number): string {
  return `Rp ${(n || 0).toLocaleString('id-ID')}`;
}

export function generateInvoicePDF(
  invoice: any,
  client: any,
  sender?: { senderName?: string; senderAddress?: string; senderPhone?: string; senderEmail?: string; projectName?: string; logo?: string; bankAccounts?: string; termsAndConditions?: string }
): PDFKit.PDFDocument {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // Register fonts. Resolve via multiple candidates so dev (tsx watch from backend/)
  // and prod (node dist/index.js) both work without ENOENT.
  const fontCandidates = [
    path.resolve(process.cwd(), 'public/fonts'),
    path.resolve(process.cwd(), '../public/fonts'),
    path.resolve(process.cwd(), 'frontend/public/fonts'),
    typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../../public/fonts') : '',
    typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../../frontend/public/fonts') : '',
  ].filter(Boolean);

  const fontDir = fontCandidates.find((d) => {
    try { return require('fs').existsSync(path.join(d, 'SourceSans3-Regular.ttf')); }
    catch { return false; }
  });

  if (fontDir) {
    try {
      doc.registerFont('SourceSans3', path.join(fontDir, 'SourceSans3-Regular.ttf'));
      doc.registerFont('SourceSans3-SemiBold', path.join(fontDir, 'SourceSans3-SemiBold.ttf'));
      doc.registerFont('SourceSans3-Bold', path.join(fontDir, 'SourceSans3-Bold.ttf'));
    } catch (e) {
      // Fallback to default PDFKit fonts (Helvetica) on registration failure
    }
  }

  const items = invoice.items || [];
  const senderName = sender?.senderName || sender?.projectName || 'Client CRM';
  const margin = 40;
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - (margin * 2); // 515.28 pt

  let currentY = margin;

  // --- HEADER SECTION ---
  // Left: Logo & Sender Name
  let leftHeaderY = currentY;
  if (sender?.logo && typeof sender.logo === 'string') {
    try {
      if (sender.logo.startsWith('data:image/')) {
        const base64Data = sender.logo.split(',')[1];
        if (base64Data) {
          const imgBuffer = Buffer.from(base64Data, 'base64');
          doc.image(imgBuffer, margin, leftHeaderY, { fit: [130, 40] });
          leftHeaderY += 44;
        }
      }
    } catch (e) {
      // Ignore logo error if image format is unsupported
    }
  }

  if (!sender?.logo) {
    doc.font('SourceSans3-Bold').fontSize(11).fillColor('#111827')
      .text(senderName.toUpperCase(), margin, leftHeaderY, { width: 230 });
  }

  // Right: White Invoice Card with Status Pill inside
  const boxW = 165;
  const boxH = 92;
  const boxX = pageWidth - margin - boxW;
  const boxY = margin;

  // Background white box with light border and rounded corners
  doc.roundedRect(boxX, boxY, boxW, boxH, 8)
    .fillAndStroke('#ffffff', '#e5e7eb');

  // Text inside right invoice card
  const innerW = boxW - 24;

  doc.font('SourceSans3-Bold').fontSize(8).fillColor('#9ca3af')
    .text('INVOICE', boxX + 12, boxY + 10, { width: innerW, align: 'right' });

  doc.font('SourceSans3-Bold').fontSize(10).fillColor('#111827')
    .text(invoice.invoiceNumber, boxX + 12, boxY + 22, { width: innerW, align: 'right' });

  doc.font('SourceSans3').fontSize(9.5).fillColor('#4b5563')
    .text(formatDate(invoice.issueDate), boxX + 12, boxY + 36, { width: innerW, align: 'right' });

  doc.font('SourceSans3').fontSize(9.5).fillColor('#4b5563')
    .text(`Jatuh tempo: ${formatDate(invoice.dueDate)}`, boxX + 12, boxY + 50, { width: innerW, align: 'right' });

  // Status Badge Pill inside Header Card right below Jatuh Tempo
  const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    UNPAID: { label: 'Belum Dibayar', bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    PAID: { label: 'Lunas', bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    CANCELLED: { label: 'Dibatalkan', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  };
  const st = statusConfig[invoice.status] || { label: String(invoice.status), bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' };
  
  const pillW = 85;
  const pillH = 17;
  const pillX = boxX + boxW - 12 - pillW;
  const pillY = boxY + 66;

  doc.roundedRect(pillX, pillY, pillW, pillH, 8.5)
    .fillAndStroke(st.bg, st.border);

  doc.font('SourceSans3-Bold').fontSize(7.5).fillColor(st.text)
    .text(st.label, pillX, pillY + 4.5, { width: pillW, align: 'center' });

  // --- DARI & KEPADA SECTION ---
  const fromToY = Math.max(leftHeaderY + 30, boxY + boxH + 25);
  const col1X = margin;
  const col1W = 230;
  const col2X = margin + 255;
  const col2W = 230;

  // DARI Column
  doc.font('SourceSans3-Bold').fontSize(7.5).fillColor('#9ca3af')
    .text('DARI', col1X, fromToY, { width: col1W });
  doc.font('SourceSans3-SemiBold').fontSize(10).fillColor('#111827')
    .text(senderName, col1X, doc.y + 2, { width: col1W });

  doc.font('SourceSans3').fontSize(9).fillColor('#4b5563');
  if (sender?.senderAddress) { doc.text(sender.senderAddress, col1X, doc.y + 1, { width: col1W }); }
  if (sender?.senderPhone) { doc.text(sender.senderPhone, col1X, doc.y + 1, { width: col1W }); }
  if (sender?.senderEmail) { doc.text(sender.senderEmail, col1X, doc.y + 1, { width: col1W }); }
  const endFromY = doc.y;

  // KEPADA Column
  doc.font('SourceSans3-Bold').fontSize(7.5).fillColor('#9ca3af')
    .text('KEPADA', col2X, fromToY, { width: col2W });
  doc.font('SourceSans3-SemiBold').fontSize(10).fillColor('#111827')
    .text(client.name || '', col2X, doc.y + 2, { width: col2W });

  doc.font('SourceSans3').fontSize(9).fillColor('#4b5563');
  if (client.address) { doc.text(client.address, col2X, doc.y + 1, { width: col2W }); }
  if (client.email) { doc.text(client.email, col2X, doc.y + 1, { width: col2W }); }
  if (client.whatsapp) { doc.text(client.whatsapp, col2X, doc.y + 1, { width: col2W }); }
  const endToY = doc.y;

  // --- ITEMS TABLE SECTION ---
  const tableTop = Math.max(endFromY, endToY) + 24;
  const tableX = margin;
  const tableW = contentWidth;

  const colDescX = tableX + 12;
  const colDescW = 245;
  const colQtyX = tableX + 260;
  const colQtyW = 40;
  const colPriceX = tableX + 305;
  const colPriceW = 90;
  const colAmtX = tableX + 400;
  const colAmtW = 103;

  // Table header background (light gray bg-gray-50)
  const headerH = 22;
  doc.rect(tableX, tableTop, tableW, headerH).fill('#f9fafb');
  doc.rect(tableX, tableTop, tableW, headerH).stroke('#e5e7eb');

  // Table header labels
  const thY = tableTop + 6;
  doc.font('SourceSans3-SemiBold').fontSize(8).fillColor('#6b7280');
  doc.text('DESKRIPSI', colDescX, thY, { width: colDescW });
  doc.text('QTY', colQtyX, thY, { width: colQtyW, align: 'right' });
  doc.text('HARGA', colPriceX, thY, { width: colPriceW, align: 'right' });
  doc.text('JUMLAH', colAmtX, thY, { width: colAmtW, align: 'right' });

  let rowY = tableTop + headerH;

  // Table rows
  items.forEach((item: any, i: number) => {
    const rowH = 24;
    if (i % 2 !== 0) {
      doc.rect(tableX, rowY, tableW, rowH).fill('#f9fafb');
    }
    // Bottom row border line
    doc.moveTo(tableX, rowY + rowH).lineTo(tableX + tableW, rowY + rowH).strokeColor('#f3f4f6').lineWidth(0.5).stroke();

    const cellY = rowY + 6;
    doc.font('SourceSans3').fontSize(9).fillColor('#1f2937')
      .text(item.description || '', colDescX, cellY, { width: colDescW });

    doc.font('SourceSans3').fontSize(9).fillColor('#4b5563')
      .text(String(item.quantity || 1), colQtyX, cellY, { width: colQtyW, align: 'right' });

    doc.font('SourceSans3').fontSize(9).fillColor('#4b5563')
      .text(formatRupiah(item.unitPrice), colPriceX, cellY, { width: colPriceW, align: 'right' });

    doc.font('SourceSans3-SemiBold').fontSize(9).fillColor('#111827')
      .text(formatRupiah(item.amount), colAmtX, cellY, { width: colAmtW, align: 'right' });

    rowY += rowH;
  });

  // --- TOTALS SECTION ---
  let totalsY = rowY;
  const totalsPad = 8;
  totalsY += totalsPad;

  const labelW = 100;
  const valW = 110;
  const labelX = tableX + tableW - valW - labelW - 12;
  const valX = tableX + tableW - valW - 12;

  // Subtotal row
  doc.font('SourceSans3').fontSize(9).fillColor('#6b7280')
    .text('Subtotal', labelX, totalsY, { width: labelW, align: 'right' });
  doc.font('SourceSans3-SemiBold').fontSize(9).fillColor('#111827')
    .text(formatRupiah(invoice.subtotal), valX, totalsY, { width: valW, align: 'right' });
  totalsY += 18;

  // Discount row (if discount > 0)
  if (invoice.discount > 0) {
    doc.font('SourceSans3').fontSize(9).fillColor('#dc2626')
      .text(`Diskon (${invoice.discount}%)`, labelX, totalsY, { width: labelW, align: 'right' });
    doc.font('SourceSans3-SemiBold').fontSize(9).fillColor('#dc2626')
      .text(`-Rp ${(invoice.discountAmount || 0).toLocaleString('id-ID')}`, valX, totalsY, { width: valW, align: 'right' });
    totalsY += 18;
  }

  // Tax row (if tax > 0)
  if (invoice.tax > 0) {
    doc.font('SourceSans3').fontSize(9).fillColor('#6b7280')
      .text(`Tax (${invoice.tax}%)`, labelX, totalsY, { width: labelW, align: 'right' });
    doc.font('SourceSans3-SemiBold').fontSize(9).fillColor('#111827')
      .text(formatRupiah(invoice.taxAmount), valX, totalsY, { width: valW, align: 'right' });
    totalsY += 18;
  }

  // Total divider line
  doc.moveTo(labelX, totalsY + 2).lineTo(valX + valW, totalsY + 2).strokeColor('#e5e7eb').lineWidth(1).stroke();
  totalsY += 8;

  // TOTAL row
  doc.font('SourceSans3-Bold').fontSize(10).fillColor('#111827')
    .text('TOTAL', labelX, totalsY, { width: labelW, align: 'right' });
  doc.font('SourceSans3-Bold').fontSize(12).fillColor('#111827')
    .text(formatRupiah(invoice.total), valX, totalsY - 1, { width: valW, align: 'right' });

  totalsY += 24;

  // Draw outer box border matching web rounded table container
  doc.roundedRect(tableX, tableTop, tableW, totalsY - tableTop, 6)
    .strokeColor('#e5e7eb').lineWidth(1).stroke();

  // --- REKENING PEMBAYARAN / BANK ACCOUNTS SECTION ---
  let nextY = totalsY + 20;
  if (sender?.bankAccounts) {
    try {
      const accounts: Array<{ bankName: string; accountNumber: string; accountHolder: string }> = JSON.parse(sender.bankAccounts);
      if (Array.isArray(accounts) && accounts.length > 0) {
        const maxCols = Math.min(accounts.length, 3);
        const rowsCount = Math.ceil(accounts.length / maxCols);
        const gap = 12;
        const outerPad = 16;
        const titleH = 12;
        const titleMb = 8;
        const cardH = 48;
        const cardsAreaH = (rowsCount * cardH) + ((rowsCount - 1) * gap);
        const outerBoxH = outerPad + titleH + titleMb + cardsAreaH + outerPad;

        // Draw outer light gray container matching web: p-4 bg-gray-50/70 border border-gray-200 rounded-lg
        doc.roundedRect(margin, nextY, contentWidth, outerBoxH, 8)
          .fillAndStroke('#f9fafb', '#e5e7eb');

        // Header label inside outer container: PEMBAYARAN TRANSFER BANK
        doc.font('SourceSans3-Bold').fontSize(7.5).fillColor('#9ca3af')
          .text('PEMBAYARAN TRANSFER BANK', margin + outerPad, nextY + outerPad, { width: contentWidth - (outerPad * 2) });

        const cardsTopY = nextY + outerPad + titleH + titleMb;
        const innerW = contentWidth - (outerPad * 2);
        const bankBoxW = (innerW - ((maxCols - 1) * gap)) / maxCols;

        accounts.forEach((acc, index) => {
          const colIndex = index % maxCols;
          const rowIndex = Math.floor(index / maxCols);
          const accX = margin + outerPad + (colIndex * (bankBoxW + gap));
          const accY = cardsTopY + (rowIndex * (cardH + gap));

          // Draw white inner bank card: bg-white p-2.5 rounded-md border border-gray-200
          doc.roundedRect(accX, accY, bankBoxW, cardH, 6)
            .fillAndStroke('#ffffff', '#e5e7eb');

          const cardPad = 10;
          const textW = bankBoxW - (cardPad * 2);

          doc.font('SourceSans3-Bold').fontSize(9).fillColor('#111827')
            .text(acc.bankName || '', accX + cardPad, accY + 7, { width: textW });

          doc.font('SourceSans3-Bold').fontSize(9).fillColor('#1f2937')
            .text(acc.accountNumber || '', accX + cardPad, accY + 20, { width: textW });

          if (acc.accountHolder) {
            doc.font('SourceSans3').fontSize(8).fillColor('#6b7280')
              .text(`a.n. ${acc.accountHolder}`, accX + cardPad, accY + 33, { width: textW });
          }
        });

        nextY += outerBoxH + 20;
      }
    } catch (e) {
      // Ignore parse error
    }
  }

  // --- CATATAN / NOTES SECTION ---
  if (invoice.notes) {
    doc.font('SourceSans3').fontSize(8).fillColor('#9ca3af')
      .text('Catatan', margin, nextY);
    nextY += 10;
    doc.font('SourceSans3').fontSize(9).fillColor('#374151')
      .text(invoice.notes, margin, nextY, { width: contentWidth });
    nextY = doc.y + 16;
  }

  // --- SYARAT & KETENTUAN / TERMS AND CONDITIONS SECTION ---
  if (sender?.termsAndConditions) {
    doc.font('SourceSans3').fontSize(8).fillColor('#9ca3af')
      .text('Syarat & Ketentuan', margin, nextY);
    nextY += 10;
    doc.font('SourceSans3').fontSize(9).fillColor('#374151')
      .text(sender.termsAndConditions, margin, nextY, { width: contentWidth });
    nextY = doc.y + 16;
  }

  nextY += 10;

  // --- FOOTER SECTION ---
  doc.font('SourceSans3').fontSize(8.5).fillColor('#9ca3af')
    .text('Terima kasih atas kepercayaan Anda.', margin, nextY, { width: contentWidth, align: 'center' });

  return doc;
}
