import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Item } from './item.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private url = '/api/items';

  list(): Observable<Item[]> { return this.http.get<Item[]>(this.url); }
  create(item: Item): Observable<Item> { return this.http.post<Item>(this.url, item); }
  update(item: Item): Observable<Item> { return this.http.put<Item>(`${this.url}/${item.id}`, item); }
  remove(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
}
