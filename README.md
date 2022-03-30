# NgxEllipsis

This project provides the [lx-ellipsis](projects/ngx-ellipsis/src/lib/lx-ellipsis.component.ts) component to truncate any text (or HTML) to one line with the possibility to expand it using a button.

It uses the <a href="https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver" target="_blank">ResizeObserver API</a> to show/hide the button depending on any CSS ellipsis effect being active.

**Less reading more trying?** Have a look at the demo page: [https://konstantintieber.github.io/ngx-ellipsis/](https://konstantintieber.github.io/ngx-ellipsis/)

## Usage

Anywhere in your template:

```html
<lx-ellipsis [content]="'Lorem ipsum dolor sit amet, consetetur sadipscing elitr'"></lx-ellipsis>

<!-- With max-width on container: -->
<lx-ellipsis style="max-width: 400px;" [content]="'Lorem ipsum dolor sit amet'"></lx-ellipsis>
```

### Inputs

These are the inputs that the `lx-ellipsis` component accepts

| Input | Description |
| ---- | ---- |
| __content__ | _required_ The text or HTML that you want to be truncated to one string using CSS. |
| __showMoreButtonText__ | Set the text of the `Show more` button. |
| __showLessButtonText__ | Set the text of the `Show less` button. |

### Configuring the debounce duration between resize events

In order to improve performance, we don't act immediately on a resize notification from the `ResizeObserver`, but we debounce those events by 500 milliseconds.
This debounce duration can be configured using the `LX_ELLIPSIS_DEBOUNCE_ON_RESIZE` injection token.

Example:
```typescript
@NgModule({
  /* ... */
  providers: [
      /* ... */
      {
          provide: LX_ELLIPSIS_DEBOUNCE_ON_RESIZE, useValue: 300
      }
  ],
})
export class YourAngularModule {}
```

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Jest](https://jestjs.io/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
