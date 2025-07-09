import { Component, Input } from '@angular/core';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-carta',
  standalone: true,
  templateUrl: './carta.component.html',
  styleUrls: ['./carta.component.css']
})
export class CartaComponent {
  @Input() empresa: string = '';
  @Input() ruc: string = '';
  @Input() gcp: string = '';
  @Input() gln: string = '';
  @Input() anioAfiliacion: string = '';

  async generarPdfCarta(): Promise<void> {
    const logoBase64 = await this.cargarImagenBase64('assets/logo/GS1-logo.png');
    const firmaBase64 = await this.cargarImagenBase64('assets/logo/firma.png');

    const doc = new jsPDF();
    let y = 15;
    const marginLeft = 25;
    const marginRight = 25;
    const maxTextWidth = doc.internal.pageSize.getWidth() - marginLeft - marginRight;

    const logoWidth = 30;
    const logoHeight = 20;
    const firmaWidth = 50;
    const firmaHeight = 15;

    doc.setFontSize(9);
    doc.setFont('times', 'normal');

    doc.addImage(logoBase64, 'PNG', 15, 10, logoWidth, logoHeight);

    doc.setFont('times', 'bold');
    doc.text('Miércoles, 9 de julio de 2025', 210 - marginLeft, y, { align: 'right' });
    y += 8;

    doc.setFontSize(14);
    doc.text('CERTIFICADO MEMBRESÍA - GS1 ECUADOR', 105, y, { align: 'center' });
    y += 15;

    doc.setFontSize(9);
    doc.setFont('times', 'normal');

    const p1 = 'GS1 Ecuador (ECOP) certifica que los códigos GTIN que constan a continuación son auténticos y publicados en www.gs1ec.org Verified by Ecuador. El dueño de la marca del producto asigna el código, es su responsabilidad el manejo y control del código, incluida su descripción y marca. El Prefijo Global de Compañía GS1, GCP, es intransferible.';
    y = this.drawFormattedParagraph(doc, p1, marginLeft, y, maxTextWidth);

    const texto1 = `Certifico que la empresa `;
    const texto2 = ` con Ruc No. `;
    const texto3 = ` se encuentra afiliada a GS1 Ecuador desde el año ${this.anioAfiliacion}, registrada con el Prefijo Global de Compañía GS1 (GCP GS1®) `;
    const texto4 = `, el Número de Localización Global (GLN GS1®) `;
    const texto5 = `, a partir del cual constan codificados los productos que fabrican y cuya marca comercial y descripción es responsabilidad de la empresa referida. Cada presentación será codificada con un código válido, único, inequívoco a nivel mundial denominado Número Global de Artículo Comercial (GTIN®).`;

    const parrafo2 = texto1 + this.empresa + texto2 + this.ruc + texto3 + this.gcp + texto4 + this.gln + texto5;
    y = this.drawFormattedParagraph(doc, parrafo2, marginLeft, y, maxTextWidth, [
      this.empresa,
      this.ruc,
      this.gcp,
      this.gln,
      this.anioAfiliacion
    ]);

    const parrafos = [
      'La empresa tiene pleno conocimiento que los códigos asignados por ECOP, así como la información relacionada a estos, serán publicados a nivel nacional y global en bases de datos oficiales que son la fuente de consulta de todos los supermercados nacionales, internacionales y tiendas e-commerce para verificar la autenticidad de un código GS1.',
      'Con el Prefijo Global de Compañía GS1 (GCP GS1®) la empresa tiene el derecho a crear las siguientes Claves de Identificación GS1: Número Global de Artículo Comercial (GTIN®), Número Global de Localización (GLN®), Código Seriadoo de Contenedor de Envío (SSCC®), Identificador Global de Activos Retornables (GRAI®), Identificador Global Individual de Activo (GIAI®), Número Global de Relación de Servicio (GSRN®), Identificador Global de Tipo de Documento (GDTI®), Número Global de Identificación de Envío (GSIN), Número Global de Identificación de Consignatario (GINC®), Número Global de Cupones (GCN®), Identificador de Partes y Componentes (CPID®), Número Global de Modelo (GMN®).',
      `Los códigos GTIN® que se detallan en el Anexo 1 fueron asignados para ${this.empresa} bajo la marca comercial y descripción cuya única responsabilidad es de la empresa. Por cada presentación comercial la empresa puede asignar hasta ocho factores para las unidades de despacho.`,
      'Ver Anexo 1:',
      'Autorizamos al portador del presente hacer uso de este documento como estime conveniente.'
    ];

    for (const p of parrafos) {
      y = this.drawFormattedParagraph(doc, p, marginLeft, y, maxTextWidth, [this.empresa]);
    }

    const firmaY = Math.min(y + 20, doc.internal.pageSize.getHeight() - firmaHeight - 10);
    const firmaX = (doc.internal.pageSize.getWidth() - firmaWidth) / 2;
    doc.addImage(firmaBase64, 'PNG', firmaX, firmaY, firmaWidth, firmaHeight);

    doc.setFontSize(8);
    doc.text('Documento emitido por GS1 Ecuador - www.gs1ec.org', 105, 290, { align: 'center' });

    doc.save(`certificado_gs1_${this.empresa.replace(/\s+/g, '_')}.pdf`);
  }

  private drawFormattedParagraph(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    boldPhrases: string[] = []
  ): number {
    const lines = doc.splitTextToSize(text, maxWidth);

    lines.forEach((line: string, lineIndex: number) => {
      const isLastLine = lineIndex === lines.length - 1;
      const words = line.trim().split(/\s+/);

      let segments: { text: string; bold: boolean }[] = [];
      let cursor = 0;
      while (cursor < line.length) {
        const match = boldPhrases.find(p => line.substring(cursor).startsWith(p));
        if (match) {
          segments.push({ text: match, bold: true });
          cursor += match.length;
        } else {
          const nextSpace = line.indexOf(' ', cursor);
          const wordEnd = nextSpace === -1 ? line.length : nextSpace;
          const word = line.substring(cursor, wordEnd);
          segments.push({ text: word, bold: false });
          cursor = wordEnd + 1;
        }
      }

      const totalWordsWidth = segments.reduce((sum, s) => sum + doc.getTextWidth(s.text), 0);
      const spaceCount = segments.length - 1;
      const spacing = (maxWidth - totalWordsWidth) / (spaceCount || 1);

      let currentX = x;
      segments.forEach((segment, i) => {
        doc.setFont('times', segment.bold ? 'bold' : 'normal');
        doc.text(segment.text, currentX, y);
        if (i < segments.length - 1) {
          currentX += doc.getTextWidth(segment.text) + (isLastLine ? doc.getTextWidth(' ') : spacing);
        }
      });

      y += 6;
    });

    return y;
  }

  private cargarImagenBase64(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject('No se pudo obtener el contexto del canvas');
        }
      };
      img.onerror = () => reject('No se pudo cargar la imagen');
    });
  }
}
