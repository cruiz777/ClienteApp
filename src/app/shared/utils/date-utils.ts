export class DateUtils {
  /**
   * Convierte un string en formato 'YYYY-MM-DD' a un objeto Date.
   * @param dateStr Fecha en formato string.
   */
  static parseDateOnly(dateStr?: string): Date | null {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);  // Mes en JS es 0-indexado
  }

  /**
   * Formatea una fecha Date al formato 'YYYY-MM-DD'.
   * @param date Objeto Date.
   */
  static formatDateOnly(date?: Date): string | null {
    if (!date) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');  // Mes 1-12
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
