import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Interface representing a column definition for exporting.
 */
export interface ExportColumn {
  key: string;
  label: string;
}

/**
 * Export data to an Excel (.xlsx) file with professional formatting.
 * @param data Array of objects representing the rows.
 * @param columns Array of columns to export.
 * @param filename Name of the exported file (without extension).
 * @param title Title of the report to display inside the sheet.
 */
export const exportToExcel = (data: any[], columns: ExportColumn[], filename: string, title?: string) => {
  const reportTitle = title || filename.replace(/_/g, ' ');
  
  // 1. Prepare data as an array of arrays to inject metadata at the top
  const wsData = [
    [reportTitle], // Row 1
    [`Generated on: ${new Date().toLocaleString()} | System: SmartFactory Nexus`], // Row 2
    [], // Row 3: empty spacer
    columns.map(col => col.label), // Row 4: Headers
    ...data.map(row => columns.map(col => String(row[col.key] || ''))) // Data rows
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(wsData);

  // 2. Auto-size columns based on the largest content
  const colWidths = columns.map((col, index) => {
    let max = col.label.length;
    data.forEach(row => {
      const val = String(row[col.key] || '');
      if (val.length > max) max = val.length;
    });
    return { wch: Math.min(max + 4, 50) }; // Pad it slightly, cap at 50 width
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Export data to a highly polished PDF file.
 * @param data Array of objects representing the rows.
 * @param columns Array of columns to export.
 * @param filename Name of the exported file (without extension).
 * @param title Title of the report to display at the top of the PDF.
 */
export const exportToPDF = (data: any[], columns: ExportColumn[], filename: string, title: string) => {
  const doc = new jsPDF();
  
  // Add Corporate Branding Header
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.text("SmartFactory Nexus", 14, 20);
  
  doc.setFontSize(14);
  doc.setTextColor(100);
  doc.text(title, 14, 28);
  
  doc.setFontSize(10);
  doc.setTextColor(150);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);

  // Draw a subtle line separator
  doc.setDrawColor(200);
  doc.line(14, 38, 196, 38);

  // Prepare table data
  const head = [columns.map(col => col.label)];
  const body = data.map(row => columns.map(col => String(row[col.key] || '')));

  autoTable(doc, {
    startY: 45,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' }, 
    styles: { fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [248, 250, 252] }, // Light slate alternate rows
    didParseCell: function (data) {
      if (data.section === 'body') {
        const text = String(data.cell.raw).toLowerCase();
        
        // Dynamic Color Coding for statuses
        if (text === 'critical' || text === 'error' || text === 'down') {
          data.cell.styles.textColor = [239, 68, 68]; // Red
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'stable' || text === 'running' || text === 'active' || text === 'completed') {
          data.cell.styles.textColor = [16, 185, 129]; // Green
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'pending' || text === 'idle' || text === 'maintenance') {
          data.cell.styles.textColor = [245, 158, 11]; // Orange
        }

        // Right-align numbers (crude heuristic check)
        if (!isNaN(Number(data.cell.raw)) && String(data.cell.raw).trim() !== '') {
          data.cell.styles.halign = 'right';
        }
      }
    },
    didDrawPage: function (data) {
      // Footer
      const str = "Page " + doc.internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
      
      doc.text(str, data.settings.margin.left, pageHeight - 10);
      doc.text("CONFIDENTIAL - SmartFactory Nexus Internal Report", pageSize.width - 95, pageHeight - 10);
    }
  });

  doc.save(`${filename}.pdf`);
};
