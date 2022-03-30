import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LxEllipsisComponent } from './lx-ellipsis.component';
import { LxResizeObserverCallback, ResizeObserverService } from './resize-observer.service';

describe('LxEllipsisComponent', () => {
  describe('class tests', () => {
    const buttonOffsetHeight = 17; // we use the button as a reference of the height our span element would have if its content was all displayed in one line
    let resizeObserverService: ResizeObserverService;
    let hostElementRef: ElementRef;
    let contentSpanElementRef!: ElementRef<HTMLSpanElement>;
    let showMoreButtonElementRef!: ElementRef<HTMLButtonElement>;
    let resizeCallback: LxResizeObserverCallback;
    let cdRef: ChangeDetectorRef;
    let component: LxEllipsisComponent;

    beforeEach(() => {
      cdRef = {
        detectChanges: () => {},
        markForCheck: () => {}
      } as any;
      resizeObserverService = {
        observe: (_element: any, callback: LxResizeObserverCallback) => {
          resizeCallback = callback;
        },
        unobserve: () => {}
      } as any;
      hostElementRef = { nativeElement: document.createElement('div') };
      contentSpanElementRef = { nativeElement: document.createElement('span') };
      const buttonEl = document.createElement('button');
      jest.spyOn(buttonEl, 'offsetHeight', 'get').mockImplementation(() => buttonOffsetHeight);
      showMoreButtonElementRef = { nativeElement: buttonEl };
      component = new LxEllipsisComponent(500, cdRef, hostElementRef, resizeObserverService);
      component.contentSpanEl = contentSpanElementRef;
      component.showMoreButtonEl = showMoreButtonElementRef;
    });

    describe('showButton$', () => {
      it('is true when the span elements clientWidth is smaller than its scrollWidth (aka its content is truncated)', (done) => {
        component.ngOnInit();

        component.showButton$.subscribe((showButton) => {
          expect(showButton).toBe(true);
          done();
        });

        mockResizeEvent({ newClientWidth: 200, newScrollWidth: 500 });
      });

      it('is false when the span elements clientWidth is equal to its scrollWidth (aka its content is not truncated)', (done) => {
        component.ngOnInit();

        component.showButton$.subscribe((showButton) => {
          expect(showButton).toBe(false);
          done();
        });

        mockResizeEvent({ newClientWidth: 500, newScrollWidth: 500 });
      });

      it('is true when the "show more" button was clicked', (done) => {
        component.ngOnInit();

        component.showButton$.subscribe((showButton) => {
          expect(showButton).toBe(true);
          done();
        });

        component.onShowMoreToggle();
      });

      it('is false when the span element size grows to the size where it\'s no longer truncated after the user previously clicked "show more"', (done) => {
        component.ngOnInit();

        let emitCount = 0;
        component.showButton$.subscribe((showButton) => {
          if (emitCount === 0) {
            expect(showButton).toBe(true);
          } else if (emitCount === 1) {
            expect(showButton).toBe(false);
            done();
          }
          emitCount++;
        });

        component.onShowMoreToggle();
        mockResizeEvent({ newClientWidth: 500, newScrollWidth: 500, newClientHeight: buttonOffsetHeight + 4 });
      });

      function mockResizeEvent({
        newClientWidth,
        newScrollWidth,
        newClientHeight
      }: {
        newClientWidth: number;
        newScrollWidth: number;
        newClientHeight?: number;
      }) {
        jest.spyOn(contentSpanElementRef.nativeElement, 'clientWidth', 'get').mockImplementation(() => newClientWidth);
        jest.spyOn(contentSpanElementRef.nativeElement, 'scrollWidth', 'get').mockImplementation(() => newScrollWidth);
        resizeCallback({
          contentRect: {
            width: newClientWidth,
            height: newClientHeight
          }
        } as any);
      }
    });

    describe('ngOnDestroy', () => {
      it('calls ResizeObserverService.unobserve with the hostElement', () => {
        const unobserveSpy = jest.spyOn(resizeObserverService, 'unobserve');

        component.ngOnDestroy();

        expect(unobserveSpy).toHaveBeenCalledWith(hostElementRef.nativeElement);
      });
    });
  });
  describe('TestBed tests', () => {
    @Component({
      selector: 'lx-test-ellipsis',
      template: `<lx-ellipsis [content]="content"></lx-ellipsis>`,
      styles: [
        `
          :host {
            display: block;
          }
        `
      ]
    })
    class TestEllipsisComponent implements AfterViewInit {
      static DEFAULT_CLIENT_WIDTH = 300;
      static SCROLL_WIDTH_WHEN_TRUNCATED = 500;
      @Input() mockContentBeingTooBigForContainer: boolean = false;
      @Input() content: string = '';
      @ViewChild(LxEllipsisComponent) ellipsisComponent!: LxEllipsisComponent;

      ngAfterViewInit(): void {
        const mockClientWidth = TestEllipsisComponent.DEFAULT_CLIENT_WIDTH;
        const mockScrollWidth = this.mockContentBeingTooBigForContainer
          ? TestEllipsisComponent.SCROLL_WIDTH_WHEN_TRUNCATED
          : mockClientWidth;
        jest.spyOn(this.ellipsisComponent.contentSpanEl.nativeElement, 'clientWidth', 'get').mockImplementation(() => mockClientWidth);
        jest.spyOn(this.ellipsisComponent.contentSpanEl.nativeElement, 'scrollWidth', 'get').mockImplementation(() => mockScrollWidth);
      }
    }

    let fixture: ComponentFixture<TestEllipsisComponent>;

    let resizeCallback: LxResizeObserverCallback;

    beforeEach(() => {
      TestBed.configureTestingModule({
        declarations: [TestEllipsisComponent, LxEllipsisComponent],
        imports: [CommonModule],
        providers: [
          {
            provide: ResizeObserverService,
            useValue: {
              observe: (_element: any, callback: LxResizeObserverCallback) => {
                resizeCallback = callback;
              },
              unobserve: () => {}
            }
          }
        ]
      });
    });

    beforeEach(() => {
      fixture = TestBed.createComponent(TestEllipsisComponent);
    });

    it('does not show "show more" button, when input content is empty', fakeAsync(() => {
      setupFixture({
        content: '',
        mockContentBeingTooBigForContainer: false
      });

      const buttonEl = showMoreButton();

      expect(buttonEl).toBeFalsy();
    }));

    it('does not show "show more" button when the content fits in one line without being truncated', fakeAsync(() => {
      setupFixture({
        content: 'This content is not wider its container',
        mockContentBeingTooBigForContainer: false
      });

      const buttonEl = showMoreButton();

      expect(buttonEl).toBeFalsy();
    }));

    it('shows "show more" button when the content does not fit in the container without being truncated', fakeAsync(() => {
      setupFixture({
        content: 'This content is too big to show without truncation in its container',
        mockContentBeingTooBigForContainer: true
      });

      const buttonEl = showMoreButton();

      expect(buttonEl).toBeTruthy();
    }));

    it('uses "show more" as label for button when truncated', fakeAsync(() => {
      setupFixture({
        content: 'This content is too big to show without truncation in its container',
        mockContentBeingTooBigForContainer: true
      });

      const buttonEl = showMoreButton();

      expect(buttonEl.nativeElement.textContent).toContain('Show more');
    }));

    it('uses "show less" as label for button when truncated', fakeAsync(() => {
      setupFixture({
        content: 'This content is too big to show without truncation in its container',
        mockContentBeingTooBigForContainer: true
      });

      showMoreButton().triggerEventHandler('click', {});
      fixture.detectChanges();

      expect(showMoreButton().nativeElement.textContent).toContain('Show less');
    }));

    it('adds "showMore" CSS class to content span when the "show more" button is clicked', fakeAsync(() => {
      setupFixture({
        content: 'This content is too big to show without truncation in its container',
        mockContentBeingTooBigForContainer: true
      });

      showMoreButton().triggerEventHandler('click', {});
      fixture.detectChanges();

      expect(contentSpan().classes['showMore']).toBe(true);
    }));

    it('removes "showMore" CSS class from content span when content is collapsed again', fakeAsync(() => {
      setupFixture({
        content: 'This content is too big to show without truncation in its container',
        mockContentBeingTooBigForContainer: true
      });

      showMoreButton().triggerEventHandler('click', {});
      fixture.detectChanges();
      showMoreButton().triggerEventHandler('click', {});
      fixture.detectChanges();

      expect(contentSpan().classes['showMore']).toBeUndefined();
    }));

    function showMoreButton() {
      return fixture.debugElement.query(By.css('button'));
    }

    function contentSpan() {
      return fixture.debugElement.query(By.css('span.content'));
    }

    function setupFixture({
      content,
      mockContentBeingTooBigForContainer
    }: {
      content: string;
      mockContentBeingTooBigForContainer: boolean;
    }) {
      fixture.componentInstance.mockContentBeingTooBigForContainer = mockContentBeingTooBigForContainer;
      fixture.componentInstance.content = content;
      fixture.detectChanges();
      resizeCallback({
        contentRect: {
          width: TestEllipsisComponent.DEFAULT_CLIENT_WIDTH
        }
      } as any);
      fixture.detectChanges();
      tick(LxEllipsisComponent.DEFAULT_RESIZE_DEBOUNCE_MS);
    }
  });
});
