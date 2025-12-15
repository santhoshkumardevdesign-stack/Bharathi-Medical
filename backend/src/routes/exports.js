import express from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

// Helper function to format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Export Sales Report as PDF
router.get('/sales/pdf', authenticateToken, (req, res) => {
  try {
    const { branch_id, start_date, end_date } = req.query;

    const startDt = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDt = end_date || new Date().toISOString().split('T')[0];

    let branchCondition = '';
    const params = [startDt, endDt];
    let branchName = 'All Branches';

    if (branch_id) {
      branchCondition = 'AND s.branch_id = ?';
      params.push(branch_id);
      const branch = db.prepare('SELECT name FROM branches WHERE id = ?').get(branch_id);
      branchName = branch?.name || 'Unknown Branch';
    }

    // Get sales data
    const sales = db.prepare(`
      SELECT
        s.id, s.invoice_number, s.grand_total, s.payment_method, s.created_at,
        b.name as branch_name, c.name as customer_name
      FROM sales s
      JOIN branches b ON s.branch_id = b.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed' ${branchCondition}
      ORDER BY s.created_at DESC
    `).all(...params);

    // Get summary
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(gst_amount), 0) as total_gst,
        COALESCE(SUM(discount), 0) as total_discount
      FROM sales s
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed' ${branchCondition}
    `).get(...params);

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDt}-to-${endDt}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Bharathi Medicals', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Vet & Pet Shop', { align: 'center' });
    doc.moveDown();

    doc.fontSize(16).font('Helvetica-Bold').text('Sales Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`${branchName} | ${formatDate(startDt)} to ${formatDate(endDt)}`, { align: 'center' });
    doc.moveDown(2);

    // Summary Box
    doc.rect(50, doc.y, 500, 80).stroke();
    const summaryY = doc.y + 10;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Summary', 60, summaryY);
    doc.font('Helvetica').fontSize(9);
    doc.text(`Total Transactions: ${summary.total_transactions}`, 60, summaryY + 20);
    doc.text(`Total Sales: ${formatCurrency(summary.total_sales)}`, 60, summaryY + 35);
    doc.text(`Total GST: ${formatCurrency(summary.total_gst)}`, 300, summaryY + 20);
    doc.text(`Total Discount: ${formatCurrency(summary.total_discount)}`, 300, summaryY + 35);

    doc.y = summaryY + 70;
    doc.moveDown(2);

    // Table Header
    const tableTop = doc.y;
    const tableHeaders = ['Date', 'Invoice', 'Branch', 'Customer', 'Payment', 'Amount'];
    const colWidths = [70, 80, 90, 100, 70, 80];
    let xPos = 50;

    doc.fontSize(9).font('Helvetica-Bold');
    doc.rect(50, tableTop - 5, 500, 20).fill('#f0f0f0');
    doc.fillColor('black');

    tableHeaders.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });

    // Table Rows
    doc.font('Helvetica').fontSize(8);
    let rowY = tableTop + 20;

    sales.slice(0, 50).forEach((sale, index) => {
      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }

      xPos = 50;
      const rowData = [
        formatDate(sale.created_at),
        sale.invoice_number || `INV-${sale.id}`,
        sale.branch_name,
        sale.customer_name || 'Walk-in',
        sale.payment_method,
        formatCurrency(sale.grand_total)
      ];

      if (index % 2 === 0) {
        doc.rect(50, rowY - 3, 500, 15).fill('#fafafa');
        doc.fillColor('black');
      }

      rowData.forEach((cell, i) => {
        doc.text(cell.toString().substring(0, 20), xPos, rowY, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      rowY += 15;
    });

    // Footer
    doc.fontSize(8).text(`Generated on ${new Date().toLocaleString('en-IN')}`, 50, 750, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('PDF Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
});

// Export Sales Report as Excel
router.get('/sales/excel', authenticateToken, async (req, res) => {
  try {
    const { branch_id, start_date, end_date } = req.query;

    const startDt = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDt = end_date || new Date().toISOString().split('T')[0];

    let branchCondition = '';
    const params = [startDt, endDt];
    let branchName = 'All Branches';

    if (branch_id) {
      branchCondition = 'AND s.branch_id = ?';
      params.push(branch_id);
      const branch = db.prepare('SELECT name FROM branches WHERE id = ?').get(branch_id);
      branchName = branch?.name || 'Unknown Branch';
    }

    // Get sales data with items
    const sales = db.prepare(`
      SELECT
        s.id, s.invoice_number, s.subtotal, s.gst_amount, s.discount, s.grand_total,
        s.payment_method, s.created_at, b.name as branch_name, c.name as customer_name, c.phone as customer_phone
      FROM sales s
      JOIN branches b ON s.branch_id = b.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed' ${branchCondition}
      ORDER BY s.created_at DESC
    `).all(...params);

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bharathi Medicals';
    workbook.created = new Date();

    // Sales Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');

    // Header
    summarySheet.mergeCells('A1:F1');
    summarySheet.getCell('A1').value = 'Bharathi Medicals - Sales Report';
    summarySheet.getCell('A1').font = { size: 16, bold: true };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };

    summarySheet.mergeCells('A2:F2');
    summarySheet.getCell('A2').value = `${branchName} | ${formatDate(startDt)} to ${formatDate(endDt)}`;
    summarySheet.getCell('A2').alignment = { horizontal: 'center' };

    // Summary data
    const totalSales = sales.reduce((sum, s) => sum + s.grand_total, 0);
    const totalGST = sales.reduce((sum, s) => sum + s.gst_amount, 0);
    const totalDiscount = sales.reduce((sum, s) => sum + s.discount, 0);

    summarySheet.getCell('A4').value = 'Total Transactions:';
    summarySheet.getCell('B4').value = sales.length;
    summarySheet.getCell('A5').value = 'Total Sales:';
    summarySheet.getCell('B5').value = totalSales;
    summarySheet.getCell('B5').numFmt = '"₹"#,##0.00';
    summarySheet.getCell('A6').value = 'Total GST:';
    summarySheet.getCell('B6').value = totalGST;
    summarySheet.getCell('B6').numFmt = '"₹"#,##0.00';
    summarySheet.getCell('A7').value = 'Total Discount:';
    summarySheet.getCell('B7').value = totalDiscount;
    summarySheet.getCell('B7').numFmt = '"₹"#,##0.00';

    // Sales Details Sheet
    const salesSheet = workbook.addWorksheet('Sales Details');

    salesSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Invoice', key: 'invoice', width: 15 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'GST', key: 'gst', width: 10 },
      { header: 'Discount', key: 'discount', width: 10 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Payment', key: 'payment', width: 12 }
    ];

    // Style header row
    salesSheet.getRow(1).font = { bold: true };
    salesSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
    salesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data
    sales.forEach(sale => {
      salesSheet.addRow({
        date: formatDate(sale.created_at),
        invoice: sale.invoice_number || `INV-${sale.id}`,
        branch: sale.branch_name,
        customer: sale.customer_name || 'Walk-in',
        phone: sale.customer_phone || '-',
        subtotal: sale.subtotal,
        gst: sale.gst_amount,
        discount: sale.discount,
        total: sale.grand_total,
        payment: sale.payment_method
      });
    });

    // Format currency columns
    ['F', 'G', 'H', 'I'].forEach(col => {
      salesSheet.getColumn(col).numFmt = '"₹"#,##0.00';
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sales-report-${startDt}-to-${endDt}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel' });
  }
});

// Export Stock Report as PDF
router.get('/stock/pdf', authenticateToken, (req, res) => {
  try {
    const { branch_id } = req.query;

    let branchCondition = '';
    let branchName = 'All Branches';

    if (branch_id) {
      branchCondition = 'WHERE s.branch_id = ?';
      const branch = db.prepare('SELECT name FROM branches WHERE id = ?').get(branch_id);
      branchName = branch?.name || 'Unknown Branch';
    }

    // Get stock data
    const stock = db.prepare(`
      SELECT
        p.name, p.sku, c.name as category, p.selling_price, p.purchase_price,
        s.quantity, s.batch_number, s.expiry_date, b.name as branch_name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN branches b ON s.branch_id = b.id
      ${branchCondition}
      ORDER BY c.name, p.name
    `).all(branch_id ? [branch_id] : []);

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=stock-report-${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Bharathi Medicals', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Vet & Pet Shop', { align: 'center' });
    doc.moveDown();

    doc.fontSize(16).font('Helvetica-Bold').text('Stock Report', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`${branchName} | Generated: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
    doc.moveDown(2);

    // Summary
    const totalItems = stock.length;
    const totalQuantity = stock.reduce((sum, s) => sum + s.quantity, 0);
    const totalValue = stock.reduce((sum, s) => sum + (s.quantity * s.selling_price), 0);

    doc.fontSize(10);
    doc.text(`Total Items: ${totalItems} | Total Quantity: ${totalQuantity} | Total Value: ${formatCurrency(totalValue)}`);
    doc.moveDown();

    // Table Header
    const tableTop = doc.y;
    const tableHeaders = ['Product', 'SKU', 'Category', 'Branch', 'Qty', 'Price', 'Value', 'Expiry'];
    const colWidths = [120, 70, 80, 100, 50, 70, 80, 70];
    let xPos = 50;

    doc.fontSize(8).font('Helvetica-Bold');
    doc.rect(50, tableTop - 5, 700, 18).fill('#16a34a');
    doc.fillColor('white');

    tableHeaders.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });

    doc.fillColor('black');

    // Table Rows
    doc.font('Helvetica').fontSize(7);
    let rowY = tableTop + 18;

    stock.forEach((item, index) => {
      if (rowY > 520) {
        doc.addPage();
        rowY = 50;
      }

      xPos = 50;
      const rowData = [
        item.name.substring(0, 25),
        item.sku,
        item.category,
        item.branch_name,
        item.quantity.toString(),
        formatCurrency(item.selling_price),
        formatCurrency(item.quantity * item.selling_price),
        item.expiry_date ? formatDate(item.expiry_date) : '-'
      ];

      if (index % 2 === 0) {
        doc.rect(50, rowY - 3, 700, 14).fill('#f9fafb');
        doc.fillColor('black');
      }

      // Highlight low stock
      if (item.quantity < 10) {
        doc.fillColor('red');
      }

      rowData.forEach((cell, i) => {
        doc.text(cell, xPos, rowY, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      doc.fillColor('black');
      rowY += 14;
    });

    doc.end();
  } catch (error) {
    console.error('Stock PDF Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
});

// Export Stock Report as Excel
router.get('/stock/excel', authenticateToken, async (req, res) => {
  try {
    const { branch_id } = req.query;

    let branchCondition = '';
    let branchName = 'All Branches';

    if (branch_id) {
      branchCondition = 'WHERE s.branch_id = ?';
      const branch = db.prepare('SELECT name FROM branches WHERE id = ?').get(branch_id);
      branchName = branch?.name || 'Unknown Branch';
    }

    // Get stock data
    const stock = db.prepare(`
      SELECT
        p.name, p.sku, c.name as category, p.selling_price, p.purchase_price, p.min_stock,
        s.quantity, s.batch_number, s.expiry_date, b.name as branch_name
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      JOIN branches b ON s.branch_id = b.id
      ${branchCondition}
      ORDER BY c.name, p.name
    `).all(branch_id ? [branch_id] : []);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bharathi Medicals';

    const sheet = workbook.addWorksheet('Stock Report');

    // Header
    sheet.mergeCells('A1:J1');
    sheet.getCell('A1').value = `Bharathi Medicals - Stock Report (${branchName})`;
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:J2');
    sheet.getCell('A2').value = `Generated: ${new Date().toLocaleString('en-IN')}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    // Column headers
    sheet.getRow(4).values = ['Product', 'SKU', 'Category', 'Branch', 'Quantity', 'Min Stock', 'Price', 'Value', 'Batch', 'Expiry'];
    sheet.getRow(4).font = { bold: true };
    sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
    sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    sheet.columns = [
      { width: 30 }, { width: 12 }, { width: 15 }, { width: 20 }, { width: 10 },
      { width: 10 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }
    ];

    // Data rows
    let row = 5;
    stock.forEach(item => {
      const dataRow = sheet.getRow(row);
      dataRow.values = [
        item.name,
        item.sku,
        item.category,
        item.branch_name,
        item.quantity,
        item.min_stock,
        item.selling_price,
        item.quantity * item.selling_price,
        item.batch_number || '-',
        item.expiry_date || '-'
      ];

      // Highlight low stock
      if (item.quantity < item.min_stock) {
        dataRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      }

      row++;
    });

    // Format currency columns
    ['G', 'H'].forEach(col => {
      sheet.getColumn(col).numFmt = '"₹"#,##0.00';
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=stock-report-${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Stock Excel Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel' });
  }
});

// Export GST Report as Excel
router.get('/gst/excel', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date, branch_id } = req.query;

    const startDt = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDt = end_date || new Date().toISOString().split('T')[0];

    let branchCondition = '';
    const params = [startDt, endDt];

    if (branch_id) {
      branchCondition = 'AND s.branch_id = ?';
      params.push(branch_id);
    }

    // Get sales with GST details
    const sales = db.prepare(`
      SELECT
        s.id, s.invoice_number, s.subtotal, s.gst_amount, s.grand_total, s.created_at,
        b.name as branch_name, c.name as customer_name
      FROM sales s
      JOIN branches b ON s.branch_id = b.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed' ${branchCondition}
      ORDER BY s.created_at
    `).all(...params);

    // Get GST breakdown by rate
    const gstBreakdown = db.prepare(`
      SELECT
        si.gst_rate,
        COUNT(*) as items,
        COALESCE(SUM(si.unit_price * si.quantity), 0) as taxable_value,
        COALESCE(SUM(si.gst_amount), 0) as gst_amount
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed' ${branchCondition}
      GROUP BY si.gst_rate
      ORDER BY si.gst_rate
    `).all(...params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bharathi Medicals';

    // GST Summary Sheet
    const summarySheet = workbook.addWorksheet('GST Summary');

    summarySheet.mergeCells('A1:E1');
    summarySheet.getCell('A1').value = 'Bharathi Medicals - GST Report';
    summarySheet.getCell('A1').font = { size: 16, bold: true };

    summarySheet.mergeCells('A2:E2');
    summarySheet.getCell('A2').value = `Period: ${formatDate(startDt)} to ${formatDate(endDt)}`;

    // GST breakdown by rate
    summarySheet.getRow(4).values = ['GST Rate', 'Items', 'Taxable Value', 'CGST', 'SGST', 'Total GST'];
    summarySheet.getRow(4).font = { bold: true };
    summarySheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
    summarySheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    let row = 5;
    gstBreakdown.forEach(item => {
      summarySheet.getRow(row).values = [
        `${item.gst_rate}%`,
        item.items,
        item.taxable_value,
        item.gst_amount / 2, // CGST
        item.gst_amount / 2, // SGST
        item.gst_amount
      ];
      row++;
    });

    // Sales Details Sheet
    const detailsSheet = workbook.addWorksheet('Sales Details');

    detailsSheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Invoice', key: 'invoice', width: 15 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Taxable', key: 'taxable', width: 12 },
      { header: 'CGST', key: 'cgst', width: 10 },
      { header: 'SGST', key: 'sgst', width: 10 },
      { header: 'Total', key: 'total', width: 12 }
    ];

    detailsSheet.getRow(1).font = { bold: true };
    detailsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
    detailsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    sales.forEach(sale => {
      detailsSheet.addRow({
        date: formatDate(sale.created_at),
        invoice: sale.invoice_number || `INV-${sale.id}`,
        branch: sale.branch_name,
        customer: sale.customer_name || 'Walk-in',
        taxable: sale.subtotal,
        cgst: sale.gst_amount / 2,
        sgst: sale.gst_amount / 2,
        total: sale.grand_total
      });
    });

    // Format currency
    ['E', 'F', 'G', 'H'].forEach(col => {
      detailsSheet.getColumn(col).numFmt = '"₹"#,##0.00';
    });
    ['C', 'D', 'E', 'F'].forEach(col => {
      summarySheet.getColumn(col).numFmt = '"₹"#,##0.00';
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=gst-report-${startDt}-to-${endDt}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('GST Excel Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Excel' });
  }
});

// Export Invoice as PDF
router.get('/invoice/:saleId/pdf', authenticateToken, (req, res) => {
  try {
    const { saleId } = req.params;

    const sale = db.prepare(`
      SELECT s.*, b.name as branch_name, b.address as branch_address, b.phone as branch_phone,
             c.name as customer_name, c.phone as customer_phone, c.address as customer_address,
             u.username as cashier_name
      FROM sales s
      JOIN branches b ON s.branch_id = b.id
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(saleId);

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found' });
    }

    const items = db.prepare(`
      SELECT si.*, p.name as product_name, p.sku
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(saleId);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${sale.invoice_number || saleId}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('Bharathi Medicals', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Vet & Pet Shop', { align: 'center' });
    doc.fontSize(9).text(sale.branch_name, { align: 'center' });
    doc.text(sale.branch_address || '', { align: 'center' });
    doc.text(`Phone: ${sale.branch_phone || ''}`, { align: 'center' });
    doc.moveDown();

    // Invoice title
    doc.fontSize(14).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
    doc.moveDown();

    // Invoice details
    doc.fontSize(9).font('Helvetica');
    doc.text(`Invoice No: ${sale.invoice_number || `INV-${sale.id}`}`, 40);
    doc.text(`Date: ${formatDate(sale.created_at)}`, 40);
    doc.text(`Cashier: ${sale.cashier_name || 'Admin'}`, 40);

    // Customer details
    doc.text(`Customer: ${sale.customer_name || 'Walk-in Customer'}`, 300, doc.y - 36);
    doc.text(`Phone: ${sale.customer_phone || '-'}`, 300);

    doc.moveDown(2);

    // Items table
    const tableTop = doc.y;
    const headers = ['#', 'Item', 'Qty', 'Price', 'GST%', 'GST', 'Total'];
    const colWidths = [25, 180, 40, 70, 45, 60, 70];
    let xPos = 40;

    // Header row
    doc.rect(40, tableTop - 5, 515, 20).fill('#16a34a');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(9);

    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: i === 0 ? 'center' : 'left' });
      xPos += colWidths[i];
    });

    doc.fillColor('black').font('Helvetica').fontSize(8);

    // Item rows
    let rowY = tableTop + 20;
    items.forEach((item, index) => {
      xPos = 40;

      if (index % 2 === 0) {
        doc.rect(40, rowY - 3, 515, 16).fill('#f9fafb');
        doc.fillColor('black');
      }

      const rowData = [
        (index + 1).toString(),
        item.product_name.substring(0, 35),
        item.quantity.toString(),
        formatCurrency(item.unit_price),
        `${item.gst_rate}%`,
        formatCurrency(item.gst_amount),
        formatCurrency(item.subtotal)
      ];

      rowData.forEach((cell, i) => {
        doc.text(cell, xPos, rowY, { width: colWidths[i], align: i === 0 ? 'center' : 'left' });
        xPos += colWidths[i];
      });

      rowY += 16;
    });

    // Totals
    rowY += 10;
    doc.rect(350, rowY, 205, 80).stroke();

    doc.font('Helvetica').fontSize(9);
    doc.text('Subtotal:', 360, rowY + 10);
    doc.text(formatCurrency(sale.subtotal), 480, rowY + 10, { align: 'right', width: 70 });

    doc.text('GST:', 360, rowY + 25);
    doc.text(formatCurrency(sale.gst_amount), 480, rowY + 25, { align: 'right', width: 70 });

    if (sale.discount > 0) {
      doc.text('Discount:', 360, rowY + 40);
      doc.text(`-${formatCurrency(sale.discount)}`, 480, rowY + 40, { align: 'right', width: 70 });
    }

    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('TOTAL:', 360, rowY + 58);
    doc.text(formatCurrency(sale.grand_total), 480, rowY + 58, { align: 'right', width: 70 });

    // Payment method
    doc.font('Helvetica').fontSize(9);
    doc.text(`Payment Method: ${sale.payment_method.toUpperCase()}`, 40, rowY + 100);

    // Footer
    doc.fontSize(8).text('Thank you for shopping with us!', 40, 750, { align: 'center', width: 515 });
    doc.text('Bharathi Medicals - Your Trusted Pet Care Partner', { align: 'center', width: 515 });

    doc.end();
  } catch (error) {
    console.error('Invoice PDF error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  }
});

export default router;
