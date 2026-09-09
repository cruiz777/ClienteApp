// carta-oficial.component.ts
import { Component, Input } from '@angular/core';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-carta-oficial',
  standalone: true,
  templateUrl: './carta-oficial.component.html',
  styleUrls: ['./carta-oficial.component.css']
})
export class CartaOficialComponent {
  @Input() empresa: string = '';
  @Input() representante: string = '';
  @Input() gcp: string = '';
  @Input() prefijo: string = '';
  @Input() gln: string = '';
  @Input() direccion: string = '';
  @Input() ciudad: string = '';

  async generarCartaPDF(): Promise<void> {
    const doc = new jsPDF(); // A4 por defecto

    const logoBase64 = await this.cargarImagenBase64('assets/logo/GS1-logo.png');
    const firmaBase64 = await this.cargarImagenBase64('assets/logo/firma.png');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 20;
    const rightMargin = 20;
    const margenX = leftMargin;
    const maxWidth = pageWidth - leftMargin - rightMargin;
    const lineHeight = 5.5;
    const bottomMargin = 60;

    let y = 20;

    // --- Encabezado ---
    doc.addImage(logoBase64, 'PNG', margenX, y, 30, 20);
    doc.setFontSize(10);

    const xRight = pageWidth - rightMargin;
    doc.text(this.prefijo || '', xRight, y + 5, { align: 'right' });
    doc.text(this.obtenerFechaHoy(), xRight, y + 10, { align: 'right' });

    y += 25;

    doc.setFontSize(12);
     y += 5;
    // --- Destinatario ---
    doc.setFont('Times', 'Normal');
    doc.text('Señor(a):', margenX, y);
    y += lineHeight;

    // Representante (negrita, multilinea)
    doc.setFont('Times', 'Bold');
    const repText = (this.representante || '').toUpperCase();
    const repLines = doc.splitTextToSize(repText, maxWidth);
    doc.text(repLines, margenX, y);
    y += repLines.length * lineHeight;

    // Representante Legal
    doc.setFont('Times', 'Normal');
    doc.text('Representante Legal', margenX, y);
    y += lineHeight;
        y += 5;
    // Empresa (negrita, multilinea)
    doc.setFont('Times', 'Bold');
    const empresaText = (this.empresa || '').toUpperCase();
    const empresaLinesCab = doc.splitTextToSize(empresaText, maxWidth);
    doc.text(empresaLinesCab, margenX, y);
    y += empresaLinesCab.length * lineHeight - 2;

    // Dirección
    y += 5;
    doc.setFont('Times', 'Normal');
    const direccionLinesCab = doc.splitTextToSize(this.direccion || '', maxWidth);
    doc.text(direccionLinesCab, margenX, y);
    y += direccionLinesCab.length * lineHeight;
     y += 5;
    const ciudadLinesCab = doc.splitTextToSize(this.ciudad || '', maxWidth);
    doc.text(ciudadLinesCab, margenX, y);
    y += ciudadLinesCab.length * lineHeight + 4;

    // --- Cuerpo inicial ---
    doc.text('Estimado(a):', margenX, y);
    y += 7;

    const parrafos = [
      `Nos complace informarle que su solicitud de afiliación a GS1 Ecuador ha sido aprobada. Agradecemos la confianza depositada en nuestra organización y estamos seguros de que, con su participación, lograremos importantes avances en la optimización de procesos y la identificación de productos.`,
      `A partir de esta fecha, su empresa cuenta con el Prefijo Global de Compañía GS1 (GCP), con el cual podrá codificar sus productos de acuerdo con los estándares internacionales.`,
      `Asimismo, se le ha asignado el Número de Localización Global (GLN), herramienta que fortalecerá las relaciones con socios comerciales y clientes, aportando eficiencia y valor a sus transacciones. Adjuntamos un folleto informativo con detalles adicionales.`
    ];

    for (const p of parrafos) {
      const split = doc.splitTextToSize(p, maxWidth);
      doc.text(p, margenX, y, { maxWidth, align: 'justify' });
      y += split.length * lineHeight + 1.7;
    }

    // --- Bloque centrado de GCP y GLN ---
    doc.setFont('Times', 'Bold');

    const centerX = pageWidth / 2;
    const colOffset = 35;
    const col1X = centerX - colOffset;
    const col2X = centerX + colOffset;

    doc.text('Prefijo Global de Compañía GS1', col1X, y, { align: 'center' });
    doc.text('GLN', col2X, y, { align: 'center' });
    y += 7;

    doc.text(this.gcp || '', col1X, y, { align: 'center' });
    doc.text(this.gln || '', col2X, y, { align: 'center' });
    y += 11;

    // --- Lineamientos 1 y 2 ---
    doc.setFont('Times', 'Normal');

    const lineamientos = `A continuación, se destacan los principales lineamientos:`;
    const lineamientosSplit = doc.splitTextToSize(lineamientos, maxWidth);
    doc.text(lineamientos, margenX, y, { maxWidth, align: 'left' });
    y += lineamientosSplit.length * lineHeight + 1.8;

    const sangriaNumeros = margenX ;
    const maxWidthSangria = maxWidth ;

    const verificarEspacio = (alturaRequerida: number) => {
      if (y + alturaRequerida > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
        doc.addImage(logoBase64, 'PNG', margenX, y, 30, 20);
        y += 30;
        doc.setFont('Times', 'normal');
        doc.setFontSize(12);
      }
    };

    // Item 1
    const item1 = `1.   El Prefijo Global de Compañía (GCP) es intransferible. No puede venderse, alquilarse ni compartirse con terceros. Esto garantiza la correcta identificación y responsabilidad sobre los productos que utilicen dicho prefijo.`;
    const item1Split = doc.splitTextToSize(item1, maxWidthSangria);
    const alturaItem1 = item1Split.length * lineHeight + 2.5;
    verificarEspacio(alturaItem1);
    doc.text(item1, sangriaNumeros, y, { maxWidth: maxWidthSangria, align: 'justify' });
    y += alturaItem1 - 1;

    // Item 2
    const item2 = `2.   El incumplimiento de las normas establecidas en el Estándar de Especificaciones Generales GS1 podrá ser causa de cancelación del número de fabricante asignado.`;
    const item2Split = doc.splitTextToSize(item2, maxWidthSangria);
    const alturaItem2 = item2Split.length * lineHeight + 2.3;
    verificarEspacio(alturaItem2);
    doc.text(item2, sangriaNumeros, y, { maxWidth: maxWidthSangria, align: 'justify' });
    y += alturaItem2 - 1;

    // --- Título 3. Cuotas aplicables ---
    const titulo3 = `3.   Cuotas aplicables:`;
    const titulo3Split = doc.splitTextToSize(titulo3, maxWidthSangria);
    const alturaTitulo3 = titulo3Split.length * lineHeight + 2;
    verificarEspacio(alturaTitulo3);
    doc.text(titulo3, sangriaNumeros, y);
    y += alturaTitulo3;

    // --- Viñetas de cuotas (sin justificado, bien alineadas) ---
    const bulletGap = 5; // separación entre "o" y el texto

    y = this.dibujarCuotaItem(
      doc,
      y,
      pageWidth,
      margenX,
      rightMargin,
      'Cuota de afiliación:',
      ' se cancela una sola vez, al momento de incorporarse al sistema.',
      bulletGap,
      lineHeight
    );

    y = this.dibujarCuotaItem(
      doc,
      y,
      pageWidth,
      margenX,
      rightMargin,
      'Cuota de asignación del número de empresa:',
      ' se  cancela  una sola  vez, al recibir su prefijo GS1.',
      bulletGap,
      lineHeight
    );

    y = this.dibujarCuotaItem(
      doc,
      y,
      pageWidth,
      margenX,
      rightMargin,
      'Cuota de mantenimiento anual:',
      ' se cancela cada año, mientras los productos identificados con el prefijo GS1 permanezcan activos en el sistema. Esta cuota garantiza el uso continuo y actualizado de los estándares GS1.',
      bulletGap,
      lineHeight
    );

    // --- Párrafo después de las cuotas ---
    doc.setFont('Times', 'Normal');
    const valorCuotas =
      `El valor de las cuotas se determinará de acuerdo a las tarifas que se encuentren  en  vigor a la fecha que se realice su pago.`;
    const valorCuotasSplit = doc.splitTextToSize(valorCuotas, maxWidth);
    const alturaValorCuotas = valorCuotasSplit.length * lineHeight + 3;
    verificarEspacio(alturaValorCuotas);
    doc.text(valorCuotas, margenX, y, { maxWidth, align: 'justify' });
    y += alturaValorCuotas;

    // --- Item 4 ---
    const item4 =
      `4.   Las marcas y descripciones de los productos son responsabilidad exclusiva de la empresa. El Prefijo Global de Compañía solo puede utilizarse para identificar productos cuya marca sea de su propiedad. Si fabrica productos para terceros, deberán ser ellos quienes proporcionen los códigos correspondientes.`;
    const item4Split = doc.splitTextToSize(item4, maxWidthSangria+3);
    const alturaItem4 = item4Split.length * lineHeight + 2.5;
    verificarEspacio(alturaItem4);
    doc.text(item4, sangriaNumeros, y, { maxWidth: maxWidthSangria+4, align: 'justify' });
    y += alturaItem4 - 1;

    // --- Cierre ---
    const parrafos3 = [
      `Cualquier controversia derivada del presente documento será sometida a la jurisdicción de la autoridad competente.`
    ];

    for (const p of parrafos3) {
      const split = doc.splitTextToSize(p, maxWidth);
      doc.text(p, margenX, y, { maxWidth, align: 'justify' });
      y += split.length * lineHeight + 4;
    }

    y += 3;
    const agrade = 'Agradecemos su firma de conformidad y la remisión de uno de los originales.';
    const agradeSplit = doc.splitTextToSize(agrade, maxWidth);
    doc.text(agrade, margenX, y, { maxWidth, align: 'justify' });
    y += agradeSplit.length * lineHeight + 15;

    doc.setFont('Times', 'Italic');
    doc.text('Cordialmente,', margenX, y);

    // Firma
    y += 15;
    doc.addImage(firmaBase64, 'PNG', margenX + 5, y, 40, 15);

    y += 22;
    doc.setFont('Times', 'Bold');
    doc.text('ESTEBAN MUÑOZ MIÑO', margenX + 5, y);
    doc.text((this.representante || '').toUpperCase(), pageWidth / 2, y);

    y += 5;
    doc.setFont('Times', 'Normal');
    doc.text('Gerente General', margenX + 5, y);
    doc.text('Representante Legal', pageWidth / 2, y);

    y += 5;
    doc.text('GS1-Ecuador', margenX + 5, y);

    const empresaLines2 = doc.splitTextToSize(this.empresa || '', 80);
    doc.text(empresaLines2, pageWidth / 2, y);

    const fecha = new Date();
    const fechaStr = fecha.toISOString().slice(0, 16).replace('T', '-').replace(':', '-');
    const nombreLimpio = (this.empresa || '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .toUpperCase();
    doc.save(`Carta-${nombreLimpio}-${fechaStr}.pdf`);
  }

  /**
   * Dibuja un ítem de cuota con viñeta "o", título en negrita
   * y texto normal, sin superposiciones.
   */
  private dibujarCuotaItem(
    doc: jsPDF,
    y: number,
    pageWidth: number,
    margenX: number,
    rightMargin: number,
    tituloNegrita: string,
    descripcion: string,
    bulletGap: number,
    lineHeight: number
  ): number {
    const bulletX = margenX + 5;         // posición de la viñeta "o"
    const textX = margenX + 12;         // inicio del texto
    const maxWidthBullet = pageWidth - rightMargin - textX;

    // Dibuja la viñeta
    doc.setFont('Times', 'Normal');
    doc.text('o', bulletX, y);

    // Texto completo (título + descripción)
    const textoCompleto = `${tituloNegrita}${descripcion}`;
    const lineas = doc.splitTextToSize(textoCompleto, maxWidthBullet);

    for (let i = 0; i < lineas.length; i++) {
      const linea = lineas[i];

      if (i === 0) {
        // Primera línea: separamos el título del resto para aplicar negrita solo al título
        const tituloEnLinea = linea.startsWith(tituloNegrita) ? tituloNegrita : '';
        let cursorX = textX;

        if (tituloEnLinea) {
          const resto = linea.substring(tituloEnLinea.length);

          doc.setFont('Times', 'Bold');
          doc.text(tituloEnLinea, cursorX, y);
          cursorX += doc.getTextWidth(tituloEnLinea);

          if (resto.trim().length > 0) {
            doc.setFont('Times', 'Normal');
            doc.text(resto, cursorX, y);
          }
        } else {
          // Por seguridad, si no coincide, imprimimos toda la línea normal
          doc.setFont('Times', 'Normal');
          doc.text(linea, textX, y);
        }
      } else {
        // Líneas siguientes: solo texto normal, alineado con el inicio
        doc.setFont('Times', 'Normal');
        doc.text(linea, textX, y);
      }

      y += lineHeight;
    }

    // espacio extra entre ítems
    y += 1.5;

    return y;
  }

  private obtenerFechaHoy(): string {
    const hoy = new Date();
    const dia = hoy.getDate().toString().padStart(2, '0');
    const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
    const anio = hoy.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  async cargarImagenBase64(url: string): Promise<string> {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
