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
  const doc = new jsPDF();
  const logoBase64 = await this.cargarImagenBase64('assets/logo/GS1-logo.png');
  const firmaBase64 = await this.cargarImagenBase64('assets/logo/firma.png');

  const margenX = 20;
  let y = 20;

  // 🟦 Página 1
  doc.addImage(logoBase64, 'PNG', margenX, y, 30, 20);
  doc.setFontSize(10);
  doc.text(this.prefijo, 200, y + 5, { align: 'right' });
  doc.text(this.obtenerFechaHoy(), 200, y + 10, { align: 'right' });

  y += 35;

  doc.setFont('Times', 'Normal');
  doc.setFontSize(12);
  doc.text(`Señor(a):`, margenX, y); y += 7;
  doc.text(this.representante, margenX, y); y += 7;
  doc.text(`Representante Legal`, margenX, y); y += 7;
  doc.text(this.empresa, margenX, y); y += 7;
  doc.text(this.direccion, margenX, y); y += 7;
  doc.text(this.ciudad, margenX, y); y += 10;

  doc.text(`Estimado(a):`, margenX, y); y += 10;

  const parrafos = [
    `Es un gusto informarle que ha sido aprobada la solicitud de afiliación de su empresa a GS1-Ecuador y estamos seguros que con su activa participación conseguiremos los objetivos de nuestra organización.`,
    `Informo que a partir de esta fecha su empresa cuenta con el Prefijo Global de compañía GS1, GCP con el que podrá codificar sus productos.`,
    `Hemos asignado el Número de Localización Global (GLN) que le permitirá mejorar eficientemente las relaciones entre socios comerciales y clientes, añadiendo valor a sus transacciones y beneficiando a los consumidores. Para lo cual adjuntamos un folleto con información correspondiente.`
  ];

  for (const p of parrafos) {
    doc.text(p, margenX, y, { maxWidth: 170, align: 'justify' });
    y += 25;
  }

  doc.setFont('Times', 'Bold');
  doc.text('Prefijo GS1', margenX + 40, y);
  doc.text('GLN', margenX + 100, y);
  y += 7;

  doc.setFont('Times', 'Normal');
  doc.text(this.gcp, margenX + 40, y);
  doc.text(this.gln, margenX + 100, y);
  y += 15;

  const notas = [
    `Las bases sobre las que se obtienen su código de producto autorizado por el Sistema Internacional de Codificación de Productos se encuentran contenidas en el Manual General de Codificación GS1-Ecuador, cuyo contenido deberá respetar.`,
    `Del contenido del Manual indicado en el párrafo anterior, se destacan los siguientes aspectos:`,
    `1. El Prefijo Global de Compañía, GCP que se les asigna es intransferible, no puede venderse, alquilarse o compartirse con otra empresa. Esta política de uso asegura que las bases claves de identificación estén en línea con el Manual y que la responsabilidad sobre el uso de los términos que se precisan en el documento.`
  ];

  for (const n of notas) {
    doc.text(n, margenX, y, { maxWidth: 170, align: 'justify' });
    y += 15;
  }

  // 🟦 Página 2
  doc.addPage();
  y = 20;

  doc.addImage(logoBase64, 'PNG', margenX, y, 30, 20);
  y += 30;

  doc.setFont('Times', 'Roman');
  doc.setFontSize(12);
  doc.text('Pág. 2', margenX, y); y += 10;

  const parrafos2 = [
    `2. Será causa de cancelación del número de fabricante asignado, el incumplimiento de cualquiera de las bases consignadas en el Manual.`,
    `3. GS1 Ecuador cobrará a cada una de las empresas que participan en el Sistema, una cuota de afiliación, una cuota de asignación de número de empresa y una de mantenimiento anual.`,
    `4. Las cuotas de que se trata se determinarán de acuerdo a las tarifas que se encuentren en vigor a la fecha en que se realice su pago.`,
    `5. La marca y descripción de los productos es absoluta responsabilidad de la empresa. Solo se puede usar el Prefijo Global de la Compañía GS1, GCP ${this.gcp} para identificar productos cuya marca le pertenece. Los estándares globales GS1 establecen que de fijarse la marca pone el código sin importar quién lo elabore el producto. Si se fabrican productos para otra empresa esta última debe proporcionarle los códigos respectivos.`
  ];

  for (const p of parrafos2) {
    doc.text(p, margenX, y, { maxWidth: 170, align: 'justify' });
    y += 18;
  }

  // 👉 Separar el párrafo 3
  y += 10;
  const parrafos3 = [
    `Cualquier controversia derivada del presente documento será sometida a la jurisdicción de la autoridad competente.`
  ];
  for (const p of parrafos3) {
    doc.text(p, margenX, y, { maxWidth: 170, align: 'justify' });
    y += 15;
  }

  y += 3;
  doc.text('Agradecemos su firma de conformidad y la remisión de uno de los originales.', margenX, y, { maxWidth: 170, align: 'justify' });

  y += 20;
  doc.setFont('Times', 'Italic');
  doc.text('Cordialmente,', 105, y, { align: 'center' });

  // 🖋 Firma
  y += 15;
  doc.addImage(firmaBase64, 'PNG', margenX + 5, y, 40, 15);

  y += 22;
  doc.setFont('Times', 'Bold');
  doc.text('ESTEBAN MUÑOZ MIÑO', margenX + 5, y);
  doc.text(this.representante.toUpperCase(), 105, y);

  y += 5;
  doc.setFont('Times', 'Normal');
  doc.text('Gerente General', margenX + 5, y);
  doc.text('Representante Legal', 105, y);

  y += 5;
  doc.text('GS1-Ecuador', margenX + 5, y);
    const empresaLines = doc.splitTextToSize(this.empresa, 80);
  doc.text(empresaLines, 105, y);

 const fecha = new Date();
const fechaStr = fecha.toISOString().slice(0, 16).replace('T', '-').replace(':', '-');
const nombreLimpio = this.empresa.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').toUpperCase();
doc.save(`Carta-${nombreLimpio}-${fechaStr}.pdf`);

}


  private obtenerFechaHoy(): string {
    const hoy = new Date();
    const dia = hoy.getDate().toString().padStart(2, '0');
    const mes = (hoy.getMonth() + 1).toString().padStart(2, '0'); // Mes empieza en 0
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
