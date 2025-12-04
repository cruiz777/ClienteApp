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
    const doc = new jsPDF(); // por defecto: A4, mm

    const logoBase64 = await this.cargarImagenBase64('assets/logo/GS1-logo.png');
    const firmaBase64 = await this.cargarImagenBase64('assets/logo/firma.png');

    // Márgenes para A4
    const pageWidth = doc.internal.pageSize.getWidth(); // ~210mm en A4
    const leftMargin = 20;
    const rightMargin = 20;
    const margenX = leftMargin;
    const maxWidth = pageWidth - leftMargin - rightMargin;
    const lineHeight = 5.5;

    let y = 20;

    // 🟦 Página 1
    doc.addImage(logoBase64, 'PNG', margenX, y, 30, 20);
    doc.setFontSize(10);

    const xRight = pageWidth - rightMargin;
    doc.text(this.prefijo || '', xRight, y + 5, { align: 'right' });
    doc.text(this.obtenerFechaHoy(), xRight, y + 10, { align: 'right' });

    y += 25;

    doc.setFontSize(12);

    // --- Destinatario ---
    doc.setFont('Times', 'Normal');
    doc.text('Señor(a):', margenX, y);
    y += lineHeight;

    // Representante (negrita, mayúsculas, multi-línea)
    doc.setFont('Times', 'Bold');
    const repText = (this.representante || '').toUpperCase();
    const repLines = doc.splitTextToSize(repText, maxWidth);
    doc.text(repLines, margenX, y);
    y += repLines.length * lineHeight;

    // Representante Legal
    doc.setFont('Times', 'Normal');
    doc.text('Representante Legal', margenX, y);
    y += lineHeight;

    // Empresa (negrita, multi-línea)
    doc.setFont('Times', 'Bold');
    const empresaText = (this.empresa || '').toUpperCase();
    const empresaLinesCab = doc.splitTextToSize(empresaText, maxWidth);
    doc.text(empresaLinesCab, margenX, y);
    y += empresaLinesCab.length * lineHeight - 2;

    // Dirección + ciudad (normal, multi-línea)
    doc.setFont('Times', 'Normal');
    const direccionLinesCab = doc.splitTextToSize(this.direccion || '', maxWidth);
    doc.text(direccionLinesCab, margenX, y);
    y += direccionLinesCab.length * lineHeight;

    const ciudadLinesCab = doc.splitTextToSize(this.ciudad || '', maxWidth);
    doc.text(ciudadLinesCab, margenX, y);
    y += ciudadLinesCab.length * lineHeight + 4;

    // --------------------------------------------
    doc.text('Estimado(a):', margenX, y);
    y += 7;

    const parrafos = [
      `Nos complace informarle que su solicitud de afiliación a GS1 Ecuador ha sido aprobada. Agradecemos la confianza depositada en nuestra organización y estamos seguros de que, con su participación, lograremos importantes avances en la optimización de procesos y la identificación de productos.`,
      `A partir de esta fecha, su empresa cuenta con el Prefijo Global de Compañía GS1 (GCP), con el cual podrá codificar sus productos de acuerdo con los estándares internacionales.`,
      `Asimismo, se le ha asignado el Número de Localización Global (GLN), herramienta que fortalecerá las relaciones con socios comerciales y clientes, aportando eficiencia y valor a sus transacciones. Adjuntamos un folleto informativo con detalles adicionales.`
    ];

    // IMPORTANTE: para justificar, pasamos el texto completo y usamos splitText solo para calcular altura
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

    // const notas = [
    //   `El uso y generación de códigos de producto se rige por el Estándar de Especificaciones Generales GS1, cuyo cumplimiento es obligatorio.`,
    //   `A continucación, se destacan los principales lineamientos::`,
    // ];

    // for (const n of notas) {
    //   const split = doc.splitTextToSize(n, maxWidth);
    //   doc.text(n, margenX, y, { maxWidth, align: 'justify' });
    //   y += split.length * lineHeight + 4;
    // }
    // Primer párrafo justificado
    // Primer párrafo justificado
    // Segundo párrafo - alineado a la IZQUIERDA y SIN negritas
    doc.setFont('Times', 'normal');
    const lineamientos = `A continuación, se destacan los principales lineamientos:`;
    const lineamientosSplit = doc.splitTextToSize(lineamientos, maxWidth);
    doc.text(lineamientos, margenX, y, { maxWidth, align: 'left' });
    y += lineamientosSplit.length * lineHeight + 1.8;

    // Configuración para salto de página dinámico
    const pageHeight = doc.internal.pageSize.getHeight(); // ~297mm en A4
    const bottomMargin = 60; // Espacio para firmas
    const sangria = margenX + 10;
    const maxWidthSangria = maxWidth - 10;
    const sangriaSubItem = sangria + 15;
    const maxWidthSubItem = maxWidth - 25;

    // Función auxiliar para verificar espacio y agregar página si es necesario
    const verificarEspacio = (alturaRequerida: number) => {
      if (y + alturaRequerida > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
        doc.addImage(logoBase64, 'PNG', margenX, y, 30, 20);
        y += 30;
        doc.setFont('Times', 'normal');
        doc.setFontSize(12);
        doc.text('Pág. 2', margenX, y);
        y += 10;
      }
    };

    // Item 1
    doc.setFont('Times', 'normal');
    const item1 = `1.      El Prefijo Global de Compañía (GCP) es intransferible. No puede venderse, alquilarse ni compartirse con terceros. Esto garantiza la correcta identificación y responsabilidad sobre los productos que utilicen dicho prefijo.`;
    const item1Split = doc.splitTextToSize(item1, maxWidthSangria);
    const alturaItem1 = item1Split.length * lineHeight + 2.5;
    verificarEspacio(alturaItem1);
    doc.text(item1, sangria, y, { maxWidth: maxWidthSangria, align: 'justify' });
    y += alturaItem1 - 1;

    // Item 2
    const item2 = `2.     El incumplimiento de las normas establecidas en el Estándar de Especificaciones Generales GS1 podrá ser causa de cancelación del número de fabricante asignado.`;
    const item2Split = doc.splitTextToSize(item2, maxWidthSangria);
    const alturaItem2 = item2Split.length * lineHeight + 2.3;
    verificarEspacio(alturaItem2);
    doc.text(item2, sangria, y, { maxWidth: maxWidthSangria, align: 'justify' });
    y += alturaItem2 - 1;

    // Item 3
    const item4 = `3.     Las marcas y descripciones de los productos son responsabilidad exclusiva de la empresa. El Prefijo Global de Compañía solo puede utilizarse para identificar productos cuya marca sea de su propiedad. Si fabrica productos para terceros, deberán ser ellos quienes proporcionen los códigos correspondientes.`;
    const item4Split = doc.splitTextToSize(item4, maxWidthSangria);
    const alturaItem4 = item4Split.length * lineHeight + 2.5;
    verificarEspacio(alturaItem4);
    doc.text(item4, sangria, y, { maxWidth: maxWidthSangria, align: 'justify' });
    y += alturaItem4 - 1;

    // //PAGINA 2
    // doc.addPage();
    // y = 20;
    // doc.addImage(logoBase64, 'PNG', margenX, y, 30, 20);
    // y += 35;
    // doc.setFont('times', 'normal');
    // doc.setFontSize(12);

    // Item 4 - Título
    const item3Titulo = `4.     Cuotas aplicables:`;
    const item3TituloSplit = doc.splitTextToSize(item3Titulo, maxWidthSangria);
    const alturaItem3Titulo = item3TituloSplit.length * lineHeight + 1.2;
    doc.text(item3Titulo, sangria, y, { maxWidth: maxWidthSangria, align: 'left' });
    y += alturaItem3Titulo;

    // Sub-item a
    doc.setFont('times', 'bold');
    const subATitulo = `o     Cuota de afiliación: `;
    const subATituloWidth = doc.getTextWidth(subATitulo);
    doc.text(subATitulo, sangriaSubItem, y);

    doc.setFont('times', 'normal');
    const subATexto = `se paga una sola vez, al momento de incorporarse al sistema.`;
    const anchoDisponibleA = pageWidth - rightMargin - (sangriaSubItem + subATituloWidth);
    const subALines = doc.splitTextToSize(subATexto, anchoDisponibleA);
    //USAR subALines (el array), NO subATexto (el string)
    // NO usar opciones { maxWidth, align }
    doc.text(subALines, sangriaSubItem + subATituloWidth, y);
    y += subALines.length * lineHeight + 1.5;

    // Sub-item b
    doc.setFont('times', 'bold');
    const subBTitulo = `o     Cuota de asignación del número de empresa: `;
    const subBTituloWidth = doc.getTextWidth(subBTitulo);
    doc.text(subBTitulo, sangriaSubItem, y);

    doc.setFont('times', 'normal');
    const subBTexto = `también se paga una sola vez, al recibir su prefijo GS1.`;
    const anchoDisponibleB = pageWidth - rightMargin - (sangriaSubItem + subBTituloWidth);
    const subBLines = doc.splitTextToSize(subBTexto, anchoDisponibleB);
    doc.text(subBLines, sangriaSubItem + subBTituloWidth, y);
    y += subBLines.length * lineHeight + 1.5;

    // Sub-item c
    doc.setFont('times', 'bold');
    const subCTitulo = `o     Cuota de mantenimiento anual: `;
    const subCTituloWidth = doc.getTextWidth(subCTitulo);
    doc.text(subCTitulo, sangriaSubItem, y);

    doc.setFont('times', 'normal');
    const subCTexto = `se paga cada año, mientras los productos identificados con el prefijo GS1 permanezcan activos en el sistema. Esta cuota garantiza el uso continuo y actualizado de los estándares GS1.`;
    const anchoDisponibleC = pageWidth - rightMargin - (sangriaSubItem + subCTituloWidth);
    const subCLines = doc.splitTextToSize(subCTexto, anchoDisponibleC);
    doc.text(subCLines, sangriaSubItem + subCTituloWidth, y);
    y += subCLines.length * lineHeight + 2.5;

    // Párrafo pequeño después del item 4
    doc.setFont('Times', 'normal');
    const valorCuotas = `El valor de las cuotas se determinará de acuerdo a las tarifas que se encuentren en vigor a la fecha que se realice su pago.`;
    const valorCuotasSplit = doc.splitTextToSize(valorCuotas, maxWidth);
    const alturaValorCuotas = valorCuotasSplit.length * lineHeight + 3;
    verificarEspacio(alturaValorCuotas);
    doc.text(valorCuotas, margenX, y, { maxWidth, align: 'justify' });
    y += alturaValorCuotas;

    // Continuar con parrafos3 (sin crear página 2 manual)
    doc.setFont('Times', 'normal');
    // // 🟦 Página 2
    // doc.addPage();
    // y = 20;

    // doc.addImage(logoBase64, 'PNG', margenX, y, 30, 20);
    // y += 30;

    // doc.setFont('Times', 'Roman');
    // doc.setFontSize(12);
    // doc.text('Pág. 2', margenX, y);
    // y += 10;

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
    doc.text('Cordialmente,', margenX, y)

    // 🖋 Firma
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

    const empresaLines = doc.splitTextToSize(this.empresa || '', 80);
    doc.text(empresaLines, pageWidth / 2, y);

    const fecha = new Date();
    const fechaStr = fecha.toISOString().slice(0, 16).replace('T', '-').replace(':', '-');
    const nombreLimpio = (this.empresa || '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .toUpperCase();
    doc.save(`Carta-${nombreLimpio}-${fechaStr}.pdf`);
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
