
/**
 * Response genérico con paginación
 */
export interface PaginationResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  message?: string;
  nextPage?: number;
  previousPage?: number;
}
