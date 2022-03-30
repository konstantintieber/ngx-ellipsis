import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  InjectionToken,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { BehaviorSubject, combineLatest, merge, Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, pairwise, startWith, takeUntil, withLatestFrom } from 'rxjs/operators';
import { Observe } from './observe.decorator';
import { ResizeObserverService } from './resize-observer.service';

export const LX_ELLIPSIS_DEBOUNCE_ON_RESIZE = new InjectionToken<number>('LX_ELLIPSIS_DEBOUNCE_ON_RESIZE', {
  providedIn: 'root',
  factory: () => 500
});

/**
 * You can set a custom max-width CSS property on your lx-ellipsis host element
 * if you want its content to never exceed a specific width,
 * e.g. <lx-ellipsis style="max-width: 300px" content="Hello World[..]"></lx-ellipsis>.
 */
@Component({
  selector: 'lx-ellipsis',
  templateUrl: 'lx-ellipsis.component.html',
  styleUrls: [`lx-ellipsis.component.scss`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LxEllipsisComponent implements OnInit, OnDestroy {
  @Input() content: string = '';
  @Input() showMoreButtonText = 'Show more';
  @Input() showLessButtonText = 'Show less';

  @Observe('contentSpanEl') private contentSpanEl$!: Observable<ElementRef<HTMLSpanElement>>;
  @ViewChild('contentEl') contentSpanEl!: ElementRef<HTMLSpanElement>;
  @Observe('showMoreButtonEl') private showMoreButtonEl$!: Observable<ElementRef<HTMLButtonElement>>;
  @ViewChild('showMoreButton', { read: ElementRef })
  showMoreButtonEl!: ElementRef<HTMLButtonElement>;

  isShowingMore$ = new BehaviorSubject(false);

  showButton$!: Observable<boolean>;
  showMoreButtonLabel$!: Observable<string>;

  @Observe('content')
  private content$!: Observable<string>;

  private destroyed$ = new Subject<void>();

  constructor(
    @Inject(LX_ELLIPSIS_DEBOUNCE_ON_RESIZE)
    private debounceMsAfterResize: number,
    private cdRef: ChangeDetectorRef,
    private hostEl: ElementRef,
    private resizeObserverService: ResizeObserverService
  ) {}

  ngOnInit(): void {
    this.showMoreButtonLabel$ = this.isShowingMore$.pipe(
      map((isShowingMore) => {
        return isShowingMore ? this.showLessButtonText : this.showMoreButtonText;
      })
    );
    const newWidthOnResize$ = new Subject<number>();
    const newHeightOnResize$ = new Subject<number>();
    this.resizeObserverService.observe(this.hostEl.nativeElement, (resizedElement) => {
      newWidthOnResize$.next(resizedElement.contentRect.width);
      newHeightOnResize$.next(resizedElement.contentRect.height);
    });
    const containerWidthChangedSignificantlyAfterResize$ = newWidthOnResize$.pipe(
      startWith(0),
      pairwise(),
      filter(([previousWidth, newWidth]) => Math.abs(newWidth - previousWidth) > 1),
      map(([, newWidth]) => newWidth)
    );

    const reevaluateIfContentIsOverflowing$ = combineLatest([
      this.contentSpanEl$,
      this.content$,
      containerWidthChangedSignificantlyAfterResize$
    ]);
    const isContentOverflowing$ = reevaluateIfContentIsOverflowing$.pipe(
      debounceTime(this.debounceMsAfterResize),
      map(([contentSpanRef]) => this.isContentOverflowing(contentSpanRef))
    );

    const userTriggeredTriggeredShowMore$ = this.isShowingMore$.pipe(filter((isShowingMore) => isShowingMore));

    const buttonHeight$ = this.showMoreButtonEl$.pipe(
      filter((showMoreButtonEl) => !!showMoreButtonEl),
      map((showMoreButtonEl) => showMoreButtonEl.nativeElement.offsetHeight),
      distinctUntilChanged()
    );
    const userIncreasedBrowserWindowSizeToThePointOfNoTruncationNecessary$ = combineLatest([
      buttonHeight$,
      newHeightOnResize$.pipe(distinctUntilChanged())
    ]).pipe(
      withLatestFrom(this.isShowingMore$),
      filter(([, isShowingMore]) => isShowingMore),
      map(([[buttonHeight, newHeight]]) => {
        const showLessButtonMarginTop = 4; // 4 for the 4px top margin that the button has in "show less" mode
        const thresholdToDetectContentInSingleLine = 10;
        const differenceBetweenContentSpanAndButtonHeight = Math.abs(newHeight - buttonHeight - showLessButtonMarginTop);
        const isSpanContentDisplayedInOneLineAgain = differenceBetweenContentSpanAndButtonHeight < thresholdToDetectContentInSingleLine;
        return isSpanContentDisplayedInOneLineAgain;
      })
    );
    const contentFitsInOneLineAgainWhileShowMoreIsEnabled$ = userIncreasedBrowserWindowSizeToThePointOfNoTruncationNecessary$.pipe(
      map((textIsNowInOneLineAgain) => !textIsNowInOneLineAgain)
    );
    const contentIsOverflowingAndShowMoreIsNotEnabled$ = isContentOverflowing$.pipe(
      withLatestFrom(this.isShowingMore$),
      filter(([, isShowingMore]) => !isShowingMore),
      map(([isContentLongerThanContainerWidth]) => {
        return isContentLongerThanContainerWidth;
      })
    );
    this.showButton$ = merge(
      userTriggeredTriggeredShowMore$,
      contentFitsInOneLineAgainWhileShowMoreIsEnabled$,
      contentIsOverflowingAndShowMoreIsNotEnabled$
    );

    // As long as no parent component is listening on resize events,
    // the ChangeDetectorRef.markForCheck() call done by the async pipe
    // will not result in a change detection cycle in this component when its size changes.
    // This is the least amount of ChangeDetectorRef.detectChanges() calls
    // I was able to come up with. The Angular profiler shows acceptable numbers of change detection.
    this.detectChangesWhenObservableEmits(isContentOverflowing$);
    this.detectChangesWhenObservableEmits(this.showButton$);
    this.detectChangesWhenObservableEmits(this.content$);
    this.detectChangesWhenObservableEmits(contentIsOverflowingAndShowMoreIsNotEnabled$);
    this.detectChangesWhenObservableEmits(isContentOverflowing$);
  }

  onShowMoreToggle() {
    this.isShowingMore$.next(!this.isShowingMore$.getValue());
    this.cdRef.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.resizeObserverService.unobserve(this.hostEl.nativeElement);
  }

  private detectChangesWhenObservableEmits(observable$: Observable<any>) {
    observable$.pipe(takeUntil(this.destroyed$)).subscribe(() => this.cdRef.detectChanges());
  }

  private isContentOverflowing(contentSpanElRef: ElementRef<HTMLSpanElement>) {
    const scrollWidth = contentSpanElRef.nativeElement.scrollWidth;
    const clientWidth = contentSpanElRef.nativeElement.clientWidth;
    return clientWidth < scrollWidth;
  }
}
