import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, merge, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, pairwise, startWith, withLatestFrom } from 'rxjs/operators';
import { Observe } from './observe.decorator';
import { ResizeObserverService } from './resize-observer.service';

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

  @Observe('contentSpanEl') private contentSpanEl$!: Observable<ElementRef<HTMLSpanElement>>;
  @ViewChild('contentEl') contentSpanEl!: ElementRef<HTMLSpanElement>;
  @Observe('showMoreButtonEl') private showMoreButtonEl$!: Observable<ElementRef<HTMLButtonElement>>;
  @ViewChild('showMoreButton', { read: ElementRef }) showMoreButtonEl!: ElementRef<HTMLButtonElement>;

  isShowingMore$ = new BehaviorSubject(false);

  showButton$!: Observable<boolean>;
  showMoreButtonLabel$!: Observable<string>;

  @Observe('content')
  private content$!: Observable<string>;

  constructor(
    private hostEl: ElementRef,
    private resizeObserverService: ResizeObserverService
  ) {}

  ngOnInit(): void {
    this.showMoreButtonLabel$ = this.isShowingMore$.pipe(
      map((isShowingMore) => {
        return isShowingMore ? 'Show less' : 'Show more';
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
      filter(([previousWidth, newWidth]) => Math.abs(newWidth - previousWidth) > 10),
      map(([, newWidth]) => newWidth)
    );

    const reevaluateIfContentIsOverflowing$ = combineLatest([
      this.contentSpanEl$,
      this.content$,
      containerWidthChangedSignificantlyAfterResize$
    ]);
    const isContentOverflowing$ = reevaluateIfContentIsOverflowing$.pipe(
      map(([contentSpanRef]) => this.isContentOverflowing(contentSpanRef))
    );

    const userTriggeredTriggeredShowMore$ = this.isShowingMore$.pipe(filter((isShowingMore) => isShowingMore));

    const buttonHeight$ = this.showMoreButtonEl$.pipe(
      filter((showMoreButtonEl) => !!showMoreButtonEl),
      map((showMoreButtonEl) => showMoreButtonEl.nativeElement.offsetHeight)
    );
    const userIncreasedBrowserWindowSizeToThePointOfNoTruncationNecessary$ = combineLatest([buttonHeight$, newHeightOnResize$]).pipe(
      withLatestFrom(this.isShowingMore$),
      filter(([, isShowingMore]) => isShowingMore),
      map(([[buttonHeight, newHeight]]) => {
        const showLessButtonMarginTop = 4;
        const differenceBetweenContentSpanAndButtonHeight = Math.abs(newHeight - buttonHeight - showLessButtonMarginTop); // 4 for the 4px top margin that the button has in "show less" mode
        const isSpanContentDisplayedInOneLineAgain = differenceBetweenContentSpanAndButtonHeight < showLessButtonMarginTop;
        return isSpanContentDisplayedInOneLineAgain;
      }),
      distinctUntilChanged()
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
  }

  onShowMoreToggle() {
    this.isShowingMore$.next(!this.isShowingMore$.getValue());
  }

  ngOnDestroy(): void {
    this.resizeObserverService.unobserve(this.hostEl.nativeElement);
  }

  private isContentOverflowing(contentSpanElRef: ElementRef<HTMLSpanElement>) {
    const scrollWidth = contentSpanElRef.nativeElement.scrollWidth;
    const offsetWidth = contentSpanElRef.nativeElement.clientWidth;
    return offsetWidth < scrollWidth;
  }
}
