import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LxEllipsisComponent } from './lx-ellipsis.component';


describe('NgxEllipsisComponent', () => {
  let component: LxEllipsisComponent;
  let fixture: ComponentFixture<LxEllipsisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LxEllipsisComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LxEllipsisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
