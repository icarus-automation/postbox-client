import { Component, input } from '@angular/core';

@Component({
  selector: 'app-divider-block',
  template: `<hr class="border-border" />`,
})
export class DividerBlock {
  readonly blockId = input.required<string>();
  readonly preview = input(false);
}
