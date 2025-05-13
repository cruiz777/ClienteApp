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

    /**
   * Convierte fecha desde string tipo 'yyyy-MM-dd hh:mm:ss' o 'dd/MM/yyyy' a 'yyyy-MM-dd'
   */
  static normalizeDateString(input?: string): string | null {
    if (!input) return null;

    // Caso: yyyy-MM-dd hh:mm:ss
    if (input.includes('-') && input.includes(':')) {
      return input.split(' ')[0]; // solo la parte yyyy-MM-dd
    }

    // Caso: dd/MM/yyyy
    if (input.includes('/')) {
      const [dd, mm, yyyy] = input.split('/');
      return `${yyyy}-${mm}-${dd}`;
    }

    return null;
  }

}
