import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import * as html2pdf from 'html2pdf.js';
import * as moment from 'moment';
import { ExportOptions } from '../interfaces/export-options';

@Injectable({ providedIn: 'root' })
export class ExportService {

  async exportarExcel(options: ExportOptions): Promise<void> {
    const { data, columns, headers, filename, title, logoUrl } = options;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title || 'Reporte');

    let currentRow = 1;

    // Logo y encabezado superior
    if (logoUrl) {
      try {
        const base64 = await this.obtenerLogoBase64(logoUrl);
        const imageId = workbook.addImage({ base64, extension: 'png' });

        worksheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          ext: { width: 150, height: 60 }
        });

        worksheet.mergeCells('D1:H1');
        const titleCell = worksheet.getCell('D1');
        titleCell.value = title;
        titleCell.font = { bold: true, size: 14 };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

        worksheet.mergeCells('D2:H2');
        const fechaCell = worksheet.getCell('D2');
        fechaCell.value = 'Exportado el: ' + moment().format('YYYY-MM-DD HH:mm:ss');
        fechaCell.font = { italic: true };
        fechaCell.alignment = { horizontal: 'center' };

        currentRow = 5;
      } catch (error) {
        console.warn('⚠️ No se pudo cargar el logo:', error);
      }
    } else {
      if (title) {
        const titleRow = worksheet.getRow(currentRow++);
        titleRow.getCell(1).value = title;
        titleRow.getCell(1).font = { bold: true, size: 14 };
      }

      const fechaRow = worksheet.getRow(currentRow++);
      fechaRow.getCell(1).value = 'Exportado el:';
      fechaRow.getCell(2).value = moment().format('YYYY-MM-DD HH:mm:ss');
      fechaRow.getCell(1).font = { italic: true };
      fechaRow.getCell(2).font = { italic: true };
    }

    currentRow++; // espacio en blanco

    // ✅ Agregamos columna "#"
    const fullHeaders = ['#', ...headers];
    const headerRow = worksheet.getRow(currentRow++);
    fullHeaders.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true };
      cell.border = this.bordeFino();
      worksheet.getColumn(i + 1).width = 16;
    });

    // ✅ Agregar datos
    data.forEach((item, i) => {
      const row = worksheet.getRow(currentRow++);
      row.getCell(1).value = i + 1;
      row.getCell(1).border = this.bordeFino();

      columns.forEach((key, j) => {
        const cell = row.getCell(j + 2);
        const value = item[key];
        cell.value = value instanceof Date
          ? moment(value).format('DD/MM/YYYY')
          : value;
        cell.border = this.bordeFino();
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;
    link.click();
  }


  async exportarPDF(options: ExportOptions): Promise<void> {
    const { data, columns, headers, filename, title, logoUrl } = options;

    let base64Logo = '';
    if (logoUrl) {
      try {
        base64Logo = await this.obtenerLogoBase64(logoUrl);
      } catch (err) {
        console.warn('⚠️ Error al obtener logo PDF:', err);
      }
    }

    const contenido = `
      <div style="font-family: Arial; padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          ${base64Logo ? `<img src="${base64Logo}" style="height: 60px;" />` : ''}
          <div style="text-align: right;">
            <h2 style="margin: 0;">${title || 'Reporte'}</h2>
            <p style="margin: 0;">Exportado el: ${moment().format('YYYY-MM-DD HH:mm:ss')}</p>
          </div>
        </div>

        <table border="1" cellpadding="4" cellspacing="0" style="width: 100%; margin-top: 15px; border-collapse: collapse; font-size: 12px;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>#</th>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                ${columns.map(key => `<td>${item[key] ?? ''}</td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;

    const opt = {
      margin: 0.5,
      filename: `${filename}_${moment().format('YYYYMMDD_HHmmss')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().from(contenido).set(opt).save();
  }

  private bordeFino(): Partial<ExcelJS.Borders> {
    const style: ExcelJS.BorderStyle = 'hair'; // O 'thin' si prefieres más grueso

    return {
      top: { style },
      left: { style },
      bottom: { style },
      right: { style }
    };
  }


  private obtenerLogoBase64(url: string): Promise<string> {
    return fetch(url)
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }
}
