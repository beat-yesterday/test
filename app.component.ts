import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Injectable, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Observable, of, tap } from 'rxjs';
import { IconPickerComponent } from './icon-picker/icon-picker.component';
import { Icon } from './icon.service';

@Component({
  // imports: [TableComponent],
  imports: [CommonModule, MatButtonModule, MatDialogModule],
  selector: 'mui-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title: string | null = 'mui';
  items = [
    { name: 'John', age: 30 },
    { name: 'Jane', age: 25 },
    { name: 'Jim', age: 35 },
  ];

  selectedIcon: Icon | null = null;

  constructor(public dialog: MatDialog) {}

  openIconPicker(): void {
    const dialogRef = this.dialog.open(IconPickerComponent, {
      // 在这里可以传入 n 和 m
      data: { rows: 6, cols: 12 },
    });

    dialogRef.afterClosed().subscribe((result) => {
      // result 就是在 IconPickerComponent 中选中的 icon 对象
      if (result) {
        console.log('选择的图标是:', result);
        this.selectedIcon = result;
      }
    });
  }

  ngOnInit(): void {
    console.log(this.items);
  }
}
