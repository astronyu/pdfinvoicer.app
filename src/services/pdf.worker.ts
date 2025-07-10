// This string contains the entire source code for our Web Worker.
// By keeping it in a single string, we can easily create a Blob and a Worker
// without needing to host a separate worker file, which solves many deployment issues.
const pdfWorkerSource = `
// Import dependencies directly from a reliable CDN.
// Workers operate in a separate scope and do not have access to the main app's importmap.
import jsPDF from 'https://esm.sh/jspdf@2.5.1';
import autoTable from 'https://esm.sh/jspdf-autotable@3.8.2';

// --- SELF-CONTAINED PDF GENERATION LOGIC ---
// The following code is a duplicate of services/pdfGenerator.ts to make the worker
// self-sufficient. It has been adapted to work within this worker context.

const colorSchemes = {
    'Classic': { primary: '#14263a', secondary: '#909193', accent: '#fe2746', headerBar: '#8f9194', headerBg: '#edefec', textLight: '#ffffff', textDark: '#14263b', tableBgPrimary: '#eceeeb', tableBgSecondary: '#fbfbf9' },
    'Sapphire & Gold': { primary: '#0F2C59', secondary: '#5A6D8C', accent: '#D4AF37', headerBar: '#5A6D8C', headerBg: '#F5F5F5', textLight: '#FFFFFF', textDark: '#0A1D3A', tableBgPrimary: '#EAEFF5', tableBgSecondary: '#FFFFFF' },
    'Emerald & Silver': { primary: '#0D4C46', secondary: '#5E8C82', accent: '#00A896', headerBar: '#5E8C82', headerBg: '#E8F5E9', textLight: '#FFFFFF', textDark: '#072A26', tableBgPrimary: '#D8EBE4', tableBgSecondary: '#F7FBF9' },
    'Ruby & Slate': { primary: '#4A0E1A', secondary: '#8C5A66', accent: '#D90429', headerBar: '#8C5A66', headerBg: '#FCE4E8', textLight: '#FFFFFF', textDark: '#2D0810', tableBgPrimary: '#F6DDE2', tableBgSecondary: '#FCF6F7' },
    'Amethyst & Pearl': { primary: '#4C3B4D', secondary: '#8C7A8C', accent: '#A480F2', headerBar: '#8C7A8C', headerBg: '#F4F1F5', textLight: '#FFFFFF', textDark: '#2E232E', tableBgPrimary: '#EBE5EC', tableBgSecondary: '#FBF9FB' },
    'Ocean & Coral': { primary: '#0A4D68', secondary: '#5A8C9E', accent: '#FF7B54', headerBar: '#5A8C9E', headerBg: '#E6F4F1', textLight: '#FFFFFF', textDark: '#062D3D', tableBgPrimary: '#D6EAE1', tableBgSecondary: '#F6FAF8' },
    'Sunset & Vineyard': { primary: '#4A2545', secondary: '#8C6A87', accent: '#FF8C42', headerBar: '#8C6A87', headerBg: '#FCEEE4', textLight: '#FFFFFF', textDark: '#2C1629', tableBgPrimary: '#F6E6D8', tableBgSecondary: '#FCFAF7' },
    'Forest & Birch': { primary: '#2C3E50', secondary: '#5D6D7E', accent: '#18BC9C', headerBar: '#5D6D7E', headerBg: '#ECF0F1', textLight: '#FFFFFF', textDark: '#17202A', tableBgPrimary: '#E1E8EA', tableBgSecondary: '#F8F9F9' },
    'Midnight & Mint': { primary: '#1D2D44', secondary: '#5A6B8A', accent: '#66FCF1', headerBar: '#5A6B8A', headerBg: '#F0F7F8', textLight: '#FFFFFF', textDark: '#0B0C10', tableBgPrimary: '#D6E9E8', tableBgSecondary: '#F5FAFA' },
    'Charcoal & Amber': { primary: '#252525', secondary: '#555555', accent: '#FFC700', headerBar: '#555555', headerBg: '#F5F5F5', textLight: '#FFFFFF', textDark: '#000000', tableBgPrimary: '#EAEAEA', tableBgSecondary: '#FFFFFF' },
    'Plum & Copper': { primary: '#5D3A63', secondary: '#9A7AA0', accent: '#B87333', headerBar: '#9A7AA0', headerBg: '#F4EFF5', textLight: '#FFFFFF', textDark: '#3A243D', tableBgPrimary: '#EBE2EC', tableBgSecondary: '#FBF8FB' },
    'Teal & Terracotta': { primary: '#008080', secondary: '#5AA0A0', accent: '#E2725B', headerBar: '#5AA0A0', headerBg: '#E6F2F2', textLight: '#FFFFFF', textDark: '#004D4D', tableBgPrimary: '#D6E7E7', tableBgSecondary: '#F6FBFB' },
};


const drawInvoiceOnDoc = (doc, invoice, settings, schemeName) => {
    const theme = colorSchemes[schemeName] || colorSchemes['Classic'];
    const { sender, bank } = settings || {};
    const safeSender = sender || { name: '', address: '', phone: '' };
    const safeBank = bank || { bankAddress: '', contactName: '', contactPhone: '', contactEmail: '', bankName: '', swiftCode: '', accountNumber: '' };

    const formatDate = (dateString) => {
        if (!dateString || !/^\\d{4}-\\d{2}-\\d{2}$/.test(dateString)) return dateString;
        const [year, month, day] = dateString.split('-');
        return \`\${day} / \${month} / \${year}\`;
    };

    const drawPhoneIcon = (doc, x, y, size) => {
        doc.setLineWidth(size * 0.1);
        doc.setDrawColor(theme.textLight);
        const w = size * 0.8;
        const h = size;
        doc.roundedRect(x, y - h / 2, w, h, w * 0.2, h * 0.2, 'S');
        doc.setLineWidth(size * 0.05);
        doc.line(x + w * 0.2, y - h * 0.3, x + w * 0.8, y - h * 0.3);
    };

    const drawEmailIcon = (doc, x, y, size) => {
        doc.setLineWidth(size * 0.1);
        doc.setDrawColor(theme.textLight);
        const w = size;
        const h = size * 0.7;
        doc.rect(x, y - h / 2, w, h, 'S');
        doc.line(x, y - h / 2, x + w / 2, y);
        doc.line(x + w / 2, y, x + w, y - h / 2);
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftBarWidth = 80;
    const newBarWidth = 10;
    const footerMargin = 15;
    const headerTopMargin = 15;
    const headerHeight = 65;

    doc.setFont('helvetica', 'bold');
    doc.setFillColor(theme.primary);
    doc.rect(0, 0, leftBarWidth, pageHeight, 'F');
    doc.setFillColor(theme.headerBg);
    doc.rect(leftBarWidth, 0, newBarWidth, pageHeight, 'F');

    const slantAngle = 30;
    const slantOffset = headerHeight * Math.tan(slantAngle * Math.PI / 180);
    const headerW1 = 135, headerW2 = 150, headerW3 = 185;

    doc.setFillColor(theme.headerBg);
    doc.lines([[headerW3 - slantOffset, 0], [slantOffset, headerHeight], [-headerW3, 0]], 0, headerTopMargin, [1, 1], 'F', true);
    doc.setFillColor(theme.headerBar);
    doc.lines([[headerW1 - slantOffset, 0], [slantOffset, headerHeight], [-headerW1, 0]], 0, headerTopMargin, [1, 1], 'F', true);
    doc.setFillColor(theme.accent);
    doc.lines([[headerW2 - headerW1, 0], [slantOffset, headerHeight], [-(headerW2 - headerW1), 0]], headerW1 - slantOffset, headerTopMargin, [1, 1], 'F', true);

    doc.setFontSize(48);
    doc.setTextColor(theme.textLight);
    doc.text('INVOICE', footerMargin, 20, { baseline: 'top' });

    const detailsBody = [
        ['Invoice#:', invoice.invoiceNumber],
        ['Date:', formatDate(invoice.date)],
        ['Client Ref:', invoice.clientReference],
        ['Project Ref:', invoice.projectReference],
    ];
    // Use the reliable functional call inside the worker
    autoTable(doc, {
        startY: 40, body: detailsBody, theme: 'plain', margin: { left: footerMargin }, tableWidth: 85,
        styles: { font: 'helvetica', fontStyle: 'bold', fontSize: 12, textColor: theme.textLight, cellPadding: { top: 0.5, right: 0, bottom: 0.5, left: 0 } },
        columnStyles: { 0: { cellWidth: 35, halign: 'left' }, 1: { cellWidth: 'auto', halign: 'right' } },
    });

    const invoiceToY = 30, invoiceToX = 150;
    doc.setFontSize(17);
    doc.setTextColor(theme.textDark);
    doc.text('Invoice to:', invoiceToX, invoiceToY, { align: 'left', baseline: 'top' });
    let clientDetailsY = invoiceToY + 10;
    doc.setFontSize(12);
    doc.text(invoice.client, invoiceToX, clientDetailsY, { align: 'left' });
    clientDetailsY += 7;
    doc.setFontSize(9);
    const clientAddressLines = doc.splitTextToSize(invoice.clientAddress, pageWidth - invoiceToX - footerMargin);
    doc.text(clientAddressLines, invoiceToX, clientDetailsY, { align: 'left' });

    let tableStartY = headerHeight + 15 + headerTopMargin;
    if (invoice.renderedService) {
        autoTable(doc, {
            startY: tableStartY, body: [['Invoice for:', invoice.renderedService]], theme: 'plain', margin: { left: footerMargin, right: footerMargin },
            styles: { lineWidth: 0, font: 'helvetica', fontStyle: 'bold', fontSize: 9, valign: 'middle', cellPadding: { top: 4, right: 3, bottom: 4, left: 3 } },
            columnStyles: { 0: { cellWidth: 40, fillColor: theme.accent, textColor: theme.textLight, halign: 'left' }, 1: { fillColor: theme.tableBgPrimary, textColor: theme.textDark, halign: 'left' } },
        });
        tableStartY = doc.lastAutoTable.finalY + 5;
    }

    const subtotal = (invoice.items || []).reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);
    const taxAmount = subtotal * ((invoice.taxRate || 0) / 100);
    const finalTotal = subtotal + taxAmount;
    const safeCurrency = (c) => (c === '€' ? 'EUR' : (c === '£' ? 'GBP' : c)) ?? '$';
    const currency = safeCurrency(invoice.currency);

    const tableBody = (invoice.items || [])
      .filter(item => item.description || ((item.quantity > 0 && item.unitPrice > 0) || item.unit))
      .map(item => [
            (item.quantity || 0) > 0 ? (item.quantity || 0).toString() : '',
            item.description,
            item.unit,
            item.unit !== '' && (item.unitPrice || 0) > 0 ? \`\${currency}\${(item.unitPrice || 0).toFixed(2)}\` : '',
            ((item.quantity || 0) * (item.unitPrice || 0)) > 0 ? \`\${currency}\${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}\` : ''
      ]);

    if (tableBody.length > 0 && tableBody.length < 5) {
        for (let i = 0; i < 2; i++) tableBody.push(['', '', '', '', '']);
    }

    autoTable(doc, {
        startY: tableStartY, head: [['Qty', 'Description', 'Unit', 'Unit Price', 'Total']], body: tableBody, theme: 'plain', margin: { left: footerMargin, right: footerMargin },
        headStyles: { fillColor: theme.accent, textColor: theme.textLight, fontStyle: 'bold', fontSize: 10, halign: 'center', cellPadding: 4 },
        styles: { fontStyle: 'bold', fontSize: 9, textColor: theme.textDark, cellPadding: { top: 6, right: 3, bottom: 6, left: 3 }, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 15, halign: 'center' }, 1: { cellWidth: 80, halign: 'left' }, 2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 30, halign: 'center' }, 4: { cellWidth: 35, halign: 'center' } },
        didParseCell: (data) => {
            if (data.section === 'body') {
                const colIndex = data.column.index;
                const styles = data.cell.styles;
                styles.fillColor = (colIndex === 0 || colIndex === 2 || colIndex === 4) ? theme.tableBgPrimary : theme.tableBgSecondary;
                styles.lineWidth = 0;
                if (data.row.index > 0) { styles.lineWidth = { top: 0.1 }; styles.lineColor = theme.primary; }
            }
        },
    });

    let dynamicFooterY = 222;
    if (doc.lastAutoTable.finalY + 10 > dynamicFooterY) dynamicFooterY = doc.lastAutoTable.finalY + 10;
    if (dynamicFooterY > pageHeight - 60) dynamicFooterY = pageHeight - 60;
    
    let currentY = dynamicFooterY;
    const totalsX_start = 130, totalsLabelX = totalsX_start + 15, totalsValueX = pageWidth - footerMargin;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(theme.textDark);

    if (invoice.taxRate > 0) {
        doc.text('Sub Total:', totalsLabelX, currentY);
        doc.text(\`\${currency}\${subtotal.toFixed(2)}\`, totalsValueX, currentY, { align: 'right' });
        currentY += 7;
        doc.text(\`Tax (\${invoice.taxRate}%):\`, totalsLabelX, currentY);
        doc.text(\`\${currency}\${taxAmount.toFixed(2)}\`, totalsValueX, currentY, { align: 'right' });
        currentY += 7;
    }

    const totalBarHeight = 15;
    doc.setFillColor(theme.primary);
    doc.rect(totalsX_start, currentY, pageWidth - totalsX_start, totalBarHeight, 'F');
    doc.setFillColor(theme.accent);
    const accentSlantOffset = totalBarHeight * Math.tan(30 * Math.PI / 180);
    doc.lines([[15, 0], [-accentSlantOffset, totalBarHeight], [-15, 0]], totalsX_start, currentY, [1, 1], 'F', true);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(theme.textLight);
    doc.text('Total:', totalsLabelX, currentY + totalBarHeight / 2, { baseline: 'middle' });
    doc.text(\`\${currency}\${finalTotal.toFixed(2)}\`, totalsValueX, currentY + totalBarHeight / 2, { align: 'right', baseline: 'middle' });
    
    const totalBarBottomY = currentY + totalBarHeight;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(theme.textDark);
    doc.text('Payment should be made as per the agreed terms', totalsValueX, totalBarBottomY + 6, { align: 'right' });

    let sigBlockY = totalBarBottomY + 25;
    const sigX = (totalsX_start + (pageWidth - totalsX_start) / 2) - 20;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(theme.textDark);
    doc.text(safeBank.contactName || safeSender.name, sigX, sigBlockY, { align: 'center' });
    sigBlockY += 2;
    doc.setDrawColor(theme.textDark);
    doc.setLineWidth(0.3);
    doc.line(sigX - 30, sigBlockY, sigX + 30, sigBlockY);
    sigBlockY += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Authorised Sign', sigX, sigBlockY, { align: 'center' });

    let paymentInfoStartY = dynamicFooterY - 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(theme.accent);
    doc.text('Payment Info:', footerMargin, paymentInfoStartY);
    
    const paymentBody = [['Bank:', safeBank.bankName], ['Account:', safeBank.accountNumber], ['SWIFT/IBAN:', safeBank.swiftCode], ['Address:', safeBank.bankAddress]];
    autoTable(doc, {
        startY: paymentInfoStartY + 6, body: paymentBody, theme: 'plain', margin: { left: footerMargin }, tableWidth: leftBarWidth - footerMargin - 7.5,
        styles: { font: 'helvetica', fontStyle: 'bold', fontSize: 7, textColor: theme.textLight, cellPadding: { top: 0.5, right: 1, bottom: 0.5, left: 1 }, valign: 'top' },
        columnStyles: { 0: { cellWidth: 20, fontStyle: 'bold' }, 1: { cellWidth: 'auto', fontStyle: 'normal' } },
    });

    let contactInfoY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(theme.accent);
    doc.text('Contact Info:', footerMargin, contactInfoY);
    contactInfoY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(theme.textLight);
    drawPhoneIcon(doc, footerMargin, contactInfoY, 4);
    doc.text(safeBank.contactPhone || safeSender.phone, footerMargin + 6, contactInfoY, { baseline: 'middle' });
    contactInfoY += 6;
    drawEmailIcon(doc, footerMargin, contactInfoY, 4);
    doc.text(safeBank.contactEmail, footerMargin + 6, contactInfoY, { baseline: 'middle' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor('#a0b3c7');
    doc.text('©2025 ', footerMargin, pageHeight - 5, { align: 'left' });
    const textWidth = doc.getTextWidth('©2025 ');
    doc.textWithLink('PDFInvoicer.app', footerMargin + textWidth, pageHeight - 5, { url: 'https://pdfinvoicer.app' });
};

// --- Main Worker Logic ---
self.onmessage = async (e) => {
    const { type, payload } = e.data;
    try {
        if (type === 'single') {
            const { invoice, settings, schemeName } = payload;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            drawInvoiceOnDoc(doc, invoice, settings, schemeName);
            // Use 'arraybuffer' for a valid binary file structure
            const pdfArrayBuffer = doc.output('arraybuffer');
            const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
            self.postMessage({ status: 'success', blob });

        } else if (type === 'bulk') {
            const { invoices, settings, invoiceThemes, globalPdfTheme } = payload;
            const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            for (let i = 0; i < invoices.length; i++) {
                const invoice = invoices[i];
                const schemeName = (invoiceThemes && invoice.id && invoiceThemes[invoice.id]) || globalPdfTheme || 'Classic';
                drawInvoiceOnDoc(doc, invoice, settings, schemeName);
                if (i < invoices.length - 1) {
                    doc.addPage();
                }
            }
            const pdfArrayBuffer = doc.output('arraybuffer');
            const blob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
            self.postMessage({ status: 'success', blob });
        }
    } catch (error) {
        console.error('Error in PDF worker:', error);
        self.postMessage({ status: 'error', error: error instanceof Error ? error.message : 'An unknown worker error occurred' });
    }
};
`;

export default pdfWorkerSource;
