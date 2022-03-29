import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { LxEllipsisModule } from 'projects/ngx-ellipsis/src/public-api';
import { AppComponent } from './app.component';


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule, LxEllipsisModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
