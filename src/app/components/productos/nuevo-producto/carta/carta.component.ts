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

    // Hoja A4 en mm
    const doc = new jsPDF('p', 'mm', 'a4');

    let y = 15;
    const marginLeft = 25;
    const marginRight = 25;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxTextWidth = pageWidth - marginLeft - marginRight;

    const logoWidth = 30;
    const logoHeight = 20;
    const firmaWidth = 50;
    const firmaHeight = 15;

    // Logo
    doc.setFontSize(8);
    doc.setFont('times', 'normal');
    doc.addImage(logoBase64, 'PNG', 25, 10, logoWidth, logoHeight);

    // Fecha (arriba derecha)
    doc.setFont('times', 'bold');
    const fechaActual = new Date().toLocaleDateString('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const fechaFormateada = fechaActual.charAt(0).toUpperCase() + fechaActual.slice(1);
    doc.text(fechaFormateada, pageWidth - marginRight, y, { align: 'right' });
    y += 8;

    // Título principal
    doc.setFontSize(14);
    doc.text('CERTIFICADO MEMBRESÍA - GS1 ECUADOR', pageWidth / 2, y, { align: 'center' });
    y += 15;

    // Párrafo 1
    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    const p1 =
      'GS1 Ecuador (ECOP) certifica que los códigos GTIN que constan a continuación son auténticos y publicados en www.gs1ec.org Verified by Ecuador. El dueño de la marca del producto asigna el código, es su responsabilidad el manejo y control del código, incluida su descripción y marca. El Prefijo Global de Compañía GS1, GCP, es intransferible.';
    y = this.drawFormattedParagraph(doc, p1, marginLeft, y, maxTextWidth);

    // Texto de GCP / GLN dinámico
    const ptexto1 = 'Prefijo Global de Compañía GS1 (GCP GS1®)';
    let ptexto2 = '';
    let vgln = this.gln;

    const prefijoLimpio = (this.prefijo || '').trim();

    if (prefijoLimpio.length === 8 && prefijoLimpio.startsWith('800')) {
      ptexto2 = '';
      vgln = '';
    } else {
      if (vgln && vgln.trim() !== '') {
        ptexto2 = `, el Número de Localización Global (GLN GS1®) ${vgln}`;
      } else {
        ptexto2 = '';
      }
    }

    // Párrafo 2 (dinámico)
    const parrafo2 =
      `Certifico que la empresa ${this.empresa} con Ruc No. ${this.ruc} se encuentra afiliada a GS1 Ecuador desde el año ${this.anioAfiliacion}, ` +
      `registrada con el ${ptexto1} ${this.gcp}${ptexto2} , a partir del cual constan codificados los productos que fabrican y cuya marca comercial y descripción es responsabilidad de la empresa referida. ` +
      `Cada presentación será codificada con un código válido, único, inequívoco a nivel mundial denominado Número Global de Artículo Comercial (GTIN®).`;

    // Solo datos variables en negrita
    const boldP2 = [
      this.empresa,
      this.ruc,
      this.gcp,
      this.anioAfiliacion,
      vgln
    ].filter(Boolean) as string[];

    y = this.drawFormattedParagraph(doc, parrafo2, marginLeft, y, maxTextWidth, boldP2);

    // Párrafos adicionales
    const parrafos = [
      'La empresa tiene pleno conocimiento que los códigos asignados por ECOP, así como la información relacionada a estos, serán publicados a nivel nacional y global en bases de datos oficiales que son la fuente de consulta de todos los supermercados nacionales, internacionales y tiendas e-commerce para verificar la autenticidad de un código GS1.',
      `${ptexto1} la empresa tiene el derecho a crear las siguientes Claves de Identificación GS1: Número Global de Artículo Comercial (GTIN®), Número Global de Localización (GLN®), Código Seriadoo de Contenedor de Envío (SSCC®), Identificador Global de Activos Retornables (GRAI®), Identificador Global Individual de Activo (GIAI®), Número Global de Relación de Servicio (GSRN®), Identificador Global de Tipo de Documento (GDTI®), Número Global de Identificación de Envío (GSIN), Número Global de Identificación de Consignatario (GINC®), Número Global de Cupones (GCN®), Identificador de Partes y Componentes (CPID®), Número Global de Modelo (GMN®).`,
      `Los códigos GTIN® que se detallan en el Anexo 1 fueron asignados para ${this.empresa} bajo la marca comercial y descripción cuya única responsabilidad es de la empresa. Por cada presentación comercial la empresa puede asignar hasta ocho factores para las unidades de despacho.`
    ];

    const boldGenerales = [this.empresa].filter(Boolean) as string[];

    for (const p of parrafos) {
      y = this.drawFormattedParagraph(doc, p, marginLeft, y, maxTextWidth, boldGenerales);
    }

    // "Ver Anexo 1:" en negrita
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('Ver Anexo 1:', marginLeft, y);
    y += 6;

    // Último párrafo: NO justificar (queda alineado normal)
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    y = this.drawFormattedParagraph(
      doc,
      'Autorizamos al portador del presente hacer uso de este documento como estime conveniente.',
      marginLeft,
      y,
      maxTextWidth
      // boldPhrases vacío y usamos el valor por defecto justifyLastLine = false
    );

    // Firma e identificación
    const firmaY = Math.min(y + 20, pageHeight - firmaHeight - 30);
    const firmaX = (pageWidth - firmaWidth) / 2;

    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text('Cordialmente', pageWidth / 2, firmaY - 10, { align: 'center' });
    doc.addImage(firmaBase64, 'PNG', firmaX, firmaY, firmaWidth, firmaHeight);
    doc.text('ESTEBAN MUÑOZ MIÑO', pageWidth / 2, firmaY + firmaHeight + 6, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.text('Gerente General', pageWidth / 2, firmaY + firmaHeight + 12, { align: 'center' });
    doc.text('GS1 Ecuador', pageWidth / 2, firmaY + firmaHeight + 18, { align: 'center' });

    // Nombre de archivo dinámico
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

  /**
   * Dibuja un párrafo JUSTIFICADO dentro de maxWidth.
   * Justifica todas las líneas excepto la última.
   */
  private drawFormattedParagraph(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    boldPhrases: string[] = [],
    justifyLastLine: boolean = false // lo dejamos por si más adelante lo quieres usar
  ): number {
    const lineHeight = 5.5;

    // Palabras en negrita
    const boldWords = new Set<string>();
    for (const phrase of boldPhrases) {
      if (!phrase) continue;
      phrase
        .split(/\s+/)
        .filter(w => w)
        .forEach(w => boldWords.add(w));
    }

    const lines: string[] = doc.splitTextToSize(text, maxWidth) as string[];

    lines.forEach((line: string, index: number) => {
      const isLastLine = index === lines.length - 1;
      const applyJustify = !isLastLine || justifyLastLine;

      const words: string[] = line.trim().split(/\s+/);
      if (words.length === 0) {
        y += lineHeight;
        return;
      }

      let totalWordsWidth = 0;
      words.forEach((w: string) => {
        const isBold = boldWords.has(w);
        doc.setFont('times', isBold ? 'bold' : 'normal');
        totalWordsWidth += doc.getTextWidth(w);
      });

      const spaceCount = Math.max(words.length - 1, 1);
      const normalSpaceWidth = doc.getTextWidth(' ');
      let extraSpacePerGap = 0;

      if (applyJustify && spaceCount > 0) {
        const currentWidth = totalWordsWidth + normalSpaceWidth * spaceCount;
        const remaining = maxWidth - currentWidth;
        extraSpacePerGap = remaining > 0 ? remaining / spaceCount : 0;
      }

      let currentX = x;

      words.forEach((w: string, i: number) => {
        const isBold = boldWords.has(w);
        doc.setFont('times', isBold ? 'bold' : 'normal');
        doc.text(w, currentX, y);

        if (i < words.length - 1) {
          const step = normalSpaceWidth + (applyJustify ? extraSpacePerGap : 0);
          const wordWidth = doc.getTextWidth(w);
          currentX += wordWidth + step;
        }
      });

      y += lineHeight;
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
