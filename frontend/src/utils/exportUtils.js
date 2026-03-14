import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getAppTime } from './timeUtils';

const loadImage = (url) => new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
});

/**
 * Generate PDF Invoice using jsPDF + AutoTable
 * @param {Object} billData 
 */
export const generateInvoicePdf = async (billData) => {
    const doc = new jsPDF();

    // Premium Header Bar
    doc.setFillColor(30, 41, 59); // Dark slate
    doc.rect(0, 0, 210, 40, 'F');

    let startX = 14;

    if (billData.shopDetails?.logo) {
        const logoImg = await loadImage(billData.shopDetails.logo);
        if (logoImg) {
            doc.addImage(logoImg, 'PNG', 14, 5, 30, 30);
            startX = 50;
        }
    }

    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(251, 191, 36); // Gold #fbbf24
    doc.text((billData.shopDetails?.name || 'GOLD DESK').toUpperCase(), startX, 20);

    if (billData.shopDetails?.address) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(240, 240, 240);
        // Handle multi-line address
        const addressLines = billData.shopDetails.address.split('\n').filter(l => l.trim() !== '');
        addressLines.forEach((line, index) => {
            if (index < 2) { // Max 2 lines for header preview
                doc.text(line.trim(), startX, 28 + (index * 5));
            }
        });
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text('TAX INVOICE', 160, 20);
    doc.text(`Date: ${getAppTime().toLocaleDateString()}`, 160, 26);
    doc.text(`Invoice #: INV-${Math.floor(1000 + Math.random() * 9000)}`, 160, 32);
    if (billData.paymentMode) {
        doc.text(`Paid via: ${billData.paymentMode.toUpperCase()}`, 160, 38);
    }

    // Customer Details
    doc.setDrawColor(200);
    doc.line(14, 42, 200, 42); // Top separator

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Billed To:', 14, 55);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(billData.customerName, 14, 62);
    doc.text(`Mobile: ${billData.mobile}`, 14, 69);

    doc.line(14, 76, 200, 76); // Bottom separator

    // Invoice Items Table
    const tableColumn = ["Item Name / Detail", "Weight (g)", "Rate/g", "GST", "Total"];
    const tableRows = [];

    const itemGstPct = billData.gst && billData.subTotal ? (billData.gst / billData.subTotal * 100).toFixed(0) : 0;

    billData.items.forEach(item => {
        tableRows.push([
            item.itemName,
            `${parseFloat(item.weight).toFixed(3)}g`,
            `₹${parseFloat(item.ratePerGram).toFixed(2)}`,
            itemGstPct > 0 ? `${itemGstPct}%` : '0%',
            `₹${parseFloat(item.price).toFixed(2)}`
        ]);
    });

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 85,
        theme: 'grid',
        headStyles: {
            fillColor: [251, 191, 36], // Gold 
            textColor: [30, 41, 59], // Dark 
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'left', fontStyle: 'bold' },
            3: { halign: 'center', textColor: [37, 99, 235] }, // Blue GST
            4: { fontStyle: 'bold', textColor: [34, 197, 94] } // Green total
        },
        styles: { fontSize: 10, cellPadding: 5 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;

    // Totals Box (Right aligned)
    doc.setDrawColor(200);
    doc.rect(120, finalY, 75, 45); // Box for totals
    doc.setFillColor(250, 250, 250);
    doc.rect(120, finalY, 75, 45, 'F');

    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);

    doc.text('Subtotal:', 125, finalY + 10);
    doc.text(`₹${parseFloat(billData.subTotal).toFixed(2)}`, 190, finalY + 10, { align: 'right' });

    // Show GST value from input, not standard fixed amount if missing
    const gstPct = billData.gstPercentage || 0;
    doc.text(`GST / Tax (${gstPct}%):`, 125, finalY + 18);
    doc.text(`+ ₹${parseFloat(billData.gst).toFixed(2)}`, 190, finalY + 18, { align: 'right' });

    doc.text('Discount:', 125, finalY + 26);
    doc.text(`- ₹${parseFloat(billData.discount).toFixed(2)}`, 190, finalY + 26, { align: 'right' });

    doc.setDrawColor(200);
    doc.line(125, finalY + 31, 190, finalY + 31);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // Dark
    doc.text('Final Total:', 125, finalY + 40);

    doc.setTextColor(34, 197, 94); // Green
    doc.text(`₹${parseFloat(billData.finalTotal).toFixed(2)}`, 190, finalY + 40, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150);
    doc.text('Thank you for shopping with us! All sales are final.', 105, 280, { align: 'center' });

    // Save
    doc.save(`Invoice_${billData.customerName.replace(/ /g, '_')}_${getAppTime().getTime()}.pdf`);
};

import { saveAs } from 'file-saver';

/**
 * Export JSON Data to Excel
 * @param {Array} data Array of Objects (inventory or sales)
 * @param {String} fileName Name of the output file
 */
export const exportToExcel = (data, fileName = 'Jewelry_Report') => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(dataBlob, `${fileName}.xlsx`);
};

/**
 * Export JSON Data to PDF using jsPDF + AutoTable
 * @param {Array} data Array of Objects (inventory or sales)
 * @param {String} fileName Name of the output file
 */
export const generateReportsPdf = (data, fileName = 'Jewelry_Report') => {
    // Dynamically retrieve headers from first object
    if (!data.length) return;

    const doc = new jsPDF('landscape');

    // Header
    doc.setFillColor(30, 41, 59); // Dark slate
    doc.rect(0, 0, 300, 25, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(251, 191, 36); // Gold #fbbf24
    doc.text('GOLD DESK - MONTHLY SALES REPORT', 14, 16);

    const tableColumn = Object.keys(data[0]);
    const tableRows = data.map(obj => Object.values(obj));

    doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        headStyles: {
            fillColor: [251, 191, 36], // Gold 
            textColor: [30, 41, 59], // Dark 
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            halign: 'center'
        },
        styles: { fontSize: 9, cellPadding: 3 }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${getAppTime().toLocaleDateString()} by Premium App Engine`, 14, finalY);

    // This forces download on Mobile and Desktop browsers dynamically to device memory!
    doc.save(`${fileName}.pdf`);
};
