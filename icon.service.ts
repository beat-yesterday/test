import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';

export interface Icon {
  name: string; // 图标名称，用于搜索和显示
  category: string; // 所属分类
  key: string; // 对应SVG Sprite中的ID (例如 'icon-home')
  tags?: string[]; // 可选的搜索标签
}

@Injectable({
  providedIn: 'root',
})
export class IconService {
  private icons: Icon[] = [];
  private iconsLoaded = false;

  // 通常图标数据会放在一个JSON文件中
  private iconsUrl = 'assets/icons/icons-data.json';

  constructor(private http: HttpClient) {}

  // 加载所有图标数据，并缓存起来
  loadIcons(): Observable<Icon[]> {
    if (this.iconsLoaded) {
      return of(this.icons);
    }
    return of([
      {
        name: '房子',
        category: '通用',
        key: 'icon-home',
        tags: ['main', 'page'],
      },
      {
        name: '设置',
        category: '通用',
        key: 'icon-settings',
        tags: ['config', 'options'],
      },
      { name: '用户', category: '人物', key: 'icon-user' },
      { name: '图表', category: '数据', key: 'icon-chart' },
    ]).pipe(
      tap((data) => {
        this.icons = data;
        this.iconsLoaded = true;
      })
    );
    return this.http
      .get<Icon[]>(this.iconsUrl)
      .pipe()
      .pipe(
        tap((data) => {
          this.icons = data;
          this.iconsLoaded = true;
        })
      );
  }

  // 提供一个同步获取方法，前提是已加载
  getIcons(): Icon[] {
    return this.icons;
  }
}
