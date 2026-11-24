import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

interface Item { id?: number; name: string; description: string; quantity: number; createdBy?: string; }

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h3>{{ form.id ? 'Edit item #' + form.id : 'New item' }}</h3>
    <form (ngSubmit)="save()">
      <input [(ngModel)]="form.name" name="name" placeholder="Name" required>
      <input [(ngModel)]="form.description" name="description" placeholder="Description">
      <input type="number" [(ngModel)]="form.quantity" name="quantity" min="0">
      <button type="submit">{{ form.id ? 'Update' : 'Create' }}</button>
      @if (form.id) { <button type="button" (click)="reset()">Cancel</button> }
    </form>
    @if (error()) { <p style="color:#b00">{{ error() }}</p> }

    <table border="1" cellpadding="6" style="margin-top:16px;border-collapse:collapse">
      <tr><th>ID</th><th>Name</th><th>Description</th><th>Qty</th><th>Created by</th><th></th></tr>
      @for (i of items(); track i.id) {
        <tr>
          <td>{{ i.id }}</td><td>{{ i.name }}</td><td>{{ i.description }}</td>
          <td>{{ i.quantity }}</td><td>{{ i.createdBy }}</td>
          <td><button (click)="edit(i)">Edit</button> <button (click)="remove(i)">Delete</button></td>
        </tr>
      }
    </table>
  `,
})
export class ItemsComponent implements OnInit {
  private http = inject(HttpClient);
  private url = `${environment.apiBase}/items`;

  items = signal<Item[]>([]);
  error = signal('');
  form: Item = this.blank();

  ngOnInit() { this.load(); }

  load() {
    this.http.get<Item[]>(this.url).subscribe({
      next: r => this.items.set(r),
      error: e => this.error.set('Load failed: ' + e.status),
    });
  }

  save() {
    const body = { name: this.form.name, description: this.form.description, quantity: this.form.quantity };
    const req = this.form.id
      ? this.http.put<Item>(`${this.url}/${this.form.id}`, body)
      : this.http.post<Item>(this.url, body);
    req.subscribe({
      next: () => { this.reset(); this.load(); },
      error: e => this.error.set('Save failed: ' + e.status),
    });
  }

  edit(i: Item) { this.form = { ...i }; }

  remove(i: Item) {
    this.http.delete(`${this.url}/${i.id}`).subscribe({
      next: () => this.load(),
      error: e => this.error.set('Delete failed: ' + e.status),
    });
  }

  reset() { this.form = this.blank(); this.error.set(''); }
  private blank(): Item { return { name: '', description: '', quantity: 0 }; }
}
