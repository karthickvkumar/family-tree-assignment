import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthModule } from './feature-module/auth/auth.module';
import { HomeModule } from './feature-module/home/home.module';
import { TreeAPIService } from './core-services/tree-api.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    AuthModule,
    HomeModule,
    BrowserAnimationsModule,
  ],
  providers: [TreeAPIService],
  bootstrap: [AppComponent]
})
export class AppModule { }
