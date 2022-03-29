import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'lx-ellipsis',
  template: `
    <p>
      lx-ellipsis works!
      {{ content }}
    </p>
  `,
  styles: [
  ]
})
export class LxEllipsisComponent implements OnInit {
  @Input() content: string = ''

  constructor() { }

  ngOnInit(): void {
  }

}
