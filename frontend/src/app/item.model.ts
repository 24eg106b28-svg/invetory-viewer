export interface Item {
  id: number;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minStock: number;
  price: number;
}
export type Status = 'ok' | 'low' | 'out';
export type SortKey = 'name' | 'category' | 'quantity' | 'status' | 'value';
