export interface ApiListResponse<T> {
  id: string;
  type: string;
  data: T;
  message: string;
  count: number;
}
