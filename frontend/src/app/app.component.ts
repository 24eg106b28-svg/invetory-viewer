import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryService } from './inventory.service';
import { Item, SortKey, Status } from './item.model';

const RANK: Record<Status, number> = { out: 0, low: 1, ok: 2 };
const LABEL: Record<Status, string> = {
  ok: 'In stock',
  low: 'Low stock',
  out: 'Out of stock'
};

const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
});

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  private api = inject(InventoryService);

  items = signal<Item[]>([]);
  error = signal('');
  q = signal('');
  cat = signal('');
  st = signal('');
  sortKey = signal<SortKey>('name');
  dir = signal(1);
  draft: Item | null = null;

  categories = computed(() =>
    [...new Set(this.items().map(i => i.category))].sort()
  );

  view = computed(() => {
    const q = this.q().toLowerCase();
    const c = this.cat();
    const s = this.st();
    const k = this.sortKey();
    const d = this.dir();

    return this.items()
      .filter(
        i =>
          (!q || `${i.name} ${i.sku}`.toLowerCase().includes(q)) &&
          (!c || i.category === c) &&
          (!s || this.status(i) === s)
      )
      .sort((a, b) => {
        const x = this.key(a, k);
        const y = this.key(b, k);
        return (x > y ? 1 : x < y ? -1 : 0) * d;
      });
  });

  stats = computed(() => {
    const all = this.items();

    return [
      { label: 'Items', value: String(all.length) },
      {
        label: 'Low stock',
        value: String(all.filter(i => this.status(i) === 'low').length)
      },
      {
        label: 'Out of stock',
        value: String(all.filter(i => this.status(i) === 'out').length)
      },
      {
        label: 'Total value',
        value: money.format(
          all.reduce((a, i) => a + i.quantity * i.price, 0)
        )
      }
    ];
  });

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.list().subscribe({
      next: r => {
        this.items.set(r);
        this.error.set('');
      },
      error: () =>
        this.error.set(
          'Cannot reach the server. Start the backend with "npm start" in the backend folder.'
        )
    });
  }

  status(i: Item): Status {
    return i.quantity === 0
      ? 'out'
      : i.quantity < i.minStock
        ? 'low'
        : 'ok';
  }

  label(i: Item) {
    return LABEL[this.status(i)];
  }

  fill(i: Item) {
    return Math.min(
      100,
      Math.round(
        (i.quantity / (Math.max(i.minStock, 1) * 2)) * 100
      )
    );
  }

  fmt(n: number) {
    return money.format(n);
  }

  key(i: Item, k: SortKey): string | number {
    return k === 'status'
      ? RANK[this.status(i)]
      : k === 'value'
        ? i.quantity * i.price
        : i[k];
  }

  arrow(k: SortKey) {
    return this.sortKey() === k
      ? this.dir() > 0
        ? '▲'
        : '▼'
      : '';
  }

  sort(k: SortKey) {
    if (this.sortKey() === k) {
      this.dir.update(d => -d);
    } else {
      this.sortKey.set(k);
      this.dir.set(1);
    }
  }

  add() {
    this.draft = {
      id: 0,
      name: '',
      sku: '',
      category: '',
      quantity: 0,
      minStock: 0,
      price: 0
    };
  }

  edit(i: Item) {
    this.draft = { ...i };
  }

  cancel() {
    this.draft = null;
  }

  save() {
    const d = this.draft;

    if (!d) return;

    const req = d.id
      ? this.api.update(d)
      : this.api.create(d);

    req.subscribe({
      next: () => {
        this.draft = null;
        this.load();
      },
      error: e =>
        this.error.set(
          e.error?.error ?? 'Could not save the item.'
        )
    });
  }

  remove(i: Item) {
    if (!confirm(`Delete ${i.name}? This cannot be undone.`)) return;

    this.api.remove(i.id).subscribe({
      next: () => this.load(),
      error: () =>
        this.error.set('Could not delete the item.')
    });
  }
}