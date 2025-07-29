import { CommonModule } from '@angular/common';
import { Component, inject, Inject, OnInit } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatRippleModule } from '@angular/material/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs/operators';
import { Icon, IconService } from '../icon.service';

@Component({
  selector: 'mui-icon-picker',
  templateUrl: './icon-picker.component.html',
  styleUrls: ['./icon-picker.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatRippleModule,
    MatIconModule,
  ],
})
export class IconPickerComponent implements OnInit {
  // --- 数据源 ---
  allIcons: Icon[] = [];
  filteredIcons: Icon[] = [];
  categories: string[] = [];

  // --- 搜索和分类 ---
  searchControl = new FormControl('');
  selectedCategory = 'all';

  // --- 分页 ---
  paginatedIcons: Icon[] = [];
  currentPage = 1;
  itemsPerPage: number; // 由 n*m 计算得出
  totalPages = 1;
  rows = 5; // n行
  cols = 10; // m列

  iconService = inject(IconService);
  constructor(
    public dialogRef: MatDialogRef<IconPickerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any // 可以从打开处传入数据
  ) {
    // 可以通过 data 传入 n 和 m
    this.rows = data?.rows || 5;
    this.cols = data?.cols || 10;
    this.itemsPerPage = this.rows * this.cols;
  }

  ngOnInit(): void {
    this.iconService.loadIcons().subscribe((icons) => {
      this.allIcons = icons;
      this.categories = ['all', ...new Set(icons.map((icon) => icon.category))];
      this.applyFilters();
    });

    this.searchControl.valueChanges
      .pipe(startWith(''), debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.applyFilters());
  }

  applyFilters(): void {
    const searchTerm = this.searchControl.value?.toLowerCase() || '';

    // 1. 分类过滤
    let iconsByCategory = this.allIcons;
    if (this.selectedCategory !== 'all') {
      iconsByCategory = this.allIcons.filter(
        (icon) => icon.category === this.selectedCategory
      );
    }

    // 2. 搜索过滤
    this.filteredIcons = iconsByCategory.filter(
      (icon) =>
        icon.name.toLowerCase().includes(searchTerm) ||
        (icon.tags &&
          icon.tags.some((tag) => tag.toLowerCase().includes(searchTerm)))
    );

    // 3. 重置分页并更新
    this.currentPage = 1;
    this.updatePagination();
  }

  onCategoryChange(category: string): void {
    if (category && category !== this.selectedCategory) {
      this.selectedCategory = category;
      this.applyFilters();
    }
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredIcons.length / this.itemsPerPage);
    if (this.totalPages === 0) this.totalPages = 1;

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedIcons = this.filteredIcons.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  selectIcon(icon: Icon): void {
    // 关闭模态框并返回选中的图标数据
    this.dialogRef.close(icon);
  }

  // 用于在模板中正确显示SVG
  getIconUrl(key: string): string {
    return `assets/icons/icon-sprite.svg#${key}`;
  }
}
