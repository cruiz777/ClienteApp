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
  @Input() prefijo: string = '';

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

    doc.setFontSize(8);
    doc.setFont('times', 'normal');
    doc.addImage(logoBase64, 'PNG', 25, 10, logoWidth, logoHeight);

    // Fecha
    doc.setFont('times', 'bold');
    const fechaActual = new Date().toLocaleDateString('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const fechaFormateada = fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1);
    doc.text(fechaFormateada, 210 - marginLeft, y, { align: 'right' });
    y += 8;

    // Título principal
    doc.setFontSize(14);
    doc.text('CERTIFICADO MEMBRESÍA - GS1 ECUADOR', 105, y, { align: 'center' });
    y += 15;

    // Párrafo 1
    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    const p1 = 'GS1 Ecuador (ECOP) certifica que los códigos GTIN que constan a continuación son auténticos y publicados en www.gs1ec.org Verified by Ecuador. El dueño de la marca del producto asigna el código, es su responsabilidad el manejo y control del código, incluida su descripción y marca. El Prefijo Global de Compañía GS1, GCP, es intransferible.';
    y = this.drawFormattedParagraph(doc, p1, marginLeft, y, maxTextWidth);

    // Párrafo dinámico 2
    const ptexto1 = `Prefijo Global de Compañía GS1 (GCP GS1®)`;
    let ptexto2 = '';
    debugger
    const prefijoLimpio = this.prefijo?.trim();

    console.log('Prefijo:', prefijoLimpio, 'Longitud:', prefijoLimpio?.length);
    var vgln=this.gln;

    if (prefijoLimpio?.length === 8 && prefijoLimpio.startsWith('800')) {
      ptexto2 = ``;
      vgln = ``;
    } else {
      ptexto2 = `, el Número de Localización Global (GLN GS1®)` + ` `+ vgln;
     
    }



    const parrafo2 =
      `Certifico que la empresa ${this.empresa} con Ruc No. ${this.ruc} se encuentra afiliada a GS1 Ecuador desde el año ${this.anioAfiliacion}, registrada con el ${ptexto1} ${this.gcp} ${ptexto2} , a partir del cual constan codificados los productos que fabrican y cuya marca comercial y descripción es responsabilidad de la empresa referida. Cada presentación será codificada con un código válido, único, inequívoco a nivel mundial denominado Número Global de Artículo Comercial (GTIN®).`;
    y = this.drawFormattedParagraph(doc, parrafo2, marginLeft, y, maxTextWidth, [
      this.empresa,
      this.ruc,
      this.gcp,
      this.anioAfiliacion,
      ptexto1,
      ptexto2
    ]);

    // Párrafos adicionales
    const parrafos = [
      'La empresa tiene pleno conocimiento que los códigos asignados por ECOP, así como la información relacionada a estos, serán publicados a nivel nacional y global en bases de datos oficiales que son la fuente de consulta de todos los supermercados nacionales, internacionales y tiendas e-commerce para verificar la autenticidad de un código GS1.',
      `${ptexto1} la empresa tiene el derecho a crear las siguientes Claves de Identificación GS1: Número Global de Artículo Comercial (GTIN®), Número Global de Localización (GLN®), Código Seriadoo de Contenedor de Envío (SSCC®), Identificador Global de Activos Retornables (GRAI®), Identificador Global Individual de Activo (GIAI®), Número Global de Relación de Servicio (GSRN®), Identificador Global de Tipo de Documento (GDTI®), Número Global de Identificación de Envío (GSIN), Número Global de Identificación de Consignatario (GINC®), Número Global de Cupones (GCN®), Identificador de Partes y Componentes (CPID®), Número Global de Modelo (GMN®).`,
      `Los códigos GTIN® que se detallan en el Anexo 1 fueron asignados para ${this.empresa} bajo la marca comercial y descripción cuya única responsabilidad es de la empresa. Por cada presentación comercial la empresa puede asignar hasta ocho factores para las unidades de despacho.`
    ];

    for (const p of parrafos) {
      y = this.drawFormattedParagraph(doc, p, marginLeft, y, maxTextWidth, [this.empresa, ptexto1]);
    }

    // "Ver Anexo 1:" en negrita
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('Ver Anexo 1:', marginLeft, y);
    y += 6;

    // Último párrafo
    doc.setFont('times', 'normal');
    y = this.drawFormattedParagraph(
      doc,
      'Autorizamos al portador del presente hacer uso de este documento como estime conveniente.',
      marginLeft,
      y,
      maxTextWidth
    );

    // Firma e identificación
    const firmaY = Math.min(y + 20, doc.internal.pageSize.getHeight() - firmaHeight - 30);
    const firmaX = (doc.internal.pageSize.getWidth() - firmaWidth) / 2;
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text('Cordialmente', 105, firmaY - 10, { align: 'center' });
    doc.addImage(firmaBase64, 'PNG', firmaX, firmaY, firmaWidth, firmaHeight);
    doc.text('ESTEBAN MUÑOZ MIÑO', 105, firmaY + firmaHeight + 6, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.text('Gerente General', 105, firmaY + firmaHeight + 12, { align: 'center' });
    doc.text('GS1 Ecuador', 105, firmaY + firmaHeight + 18, { align: 'center' });

    // Pie de página
    // doc.setFontSize(8);
    // doc.text('Documento emitido por GS1 Ecuador - www.gs1ec.org', 105, 290, { align: 'center' });

    // Guardar PDF con nombre dinámico
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const empresaLimpia = this.empresa.replace(/\s+/g, '_');
    const nombreArchivo = `membresia_gs1_${empresaLimpia}_${yyyy}_${mm}_${dd}_${hh}-${min}-${ss}.pdf`;

    doc.save(nombreArchivo);
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
