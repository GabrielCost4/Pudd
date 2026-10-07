import { Component, input, output } from '@angular/core';
@Component({ selector: 'app-pagination', templateUrl: './pagination.html', styleUrl: './pagination.css' })
export class Pagination {
  readonly page = input(1);
  readonly hasNext = input(false);
  readonly busy = input(false);
  readonly changed = output<number>();
}
