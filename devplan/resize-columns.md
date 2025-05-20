好的，在 Angular Material Table (`mat-table`) 基础上实现列的动态调整（resize）功能，并且参考 React Material Design Data Grid（通常指 MUI DataGrid）的交互体验，同时引入一个最右侧的虚拟列来辅助宽度计算，这是一个相对复杂的自定义实现，因为 `mat-table` 本身不直接提供列拖拽调整大小的功能。

我们将通过创建一个自定义指令来附加到表头单元格上，处理拖拽逻辑，并由父组件管理列宽状态。虚拟列将使用 Flexbox 布局来自动填充剩余空间或在总宽度固定时吸收调整带来的变化。

**核心思路：**

1.  **创建 Resize Handle：** 在每个可调整大小的列头单元格中，添加一个小的、可拖拽的“把手”元素。
2.  **自定义指令 (`ResizableColumnDirective`)：** 该指令附加到表头单元格，监听在“把手”上的 `mousedown` 事件，并在拖拽时发出列宽变化事件。
3.  **父组件状态管理：** Table 所在的父组件负责维护所有列的宽度状态。
4.  **动态应用宽度：** 父组件根据状态动态地将宽度应用到对应的 `mat-header-cell` 和 `mat-cell`。
5.  **Flexbox 布局与虚拟列：** `mat-table` 默认使用 Flexbox 布局。我们将为实际数据列设置具体的宽度（或 `flex-basis`），而最右侧的虚拟列将设置 `flex-grow: 1` 来填充剩余空间。当表格总宽度固定时，调整某一列会影响这个虚拟列的宽度。

**一、详细步骤**

**1. 项目准备**

  * 确保已安装 `@angular/material` 和 `@angular/cdk`。

**2. 创建 Resize Handle 的 HTML 和 CSS**

在每个可调整大小的列的 `mat-header-cell` 内部添加一个调整器元素。

```html
<ng-container [matColumnDef]="column.id" *ngFor="let column of columnsToDisplayWithoutVirtual">
  <th mat-header-cell *matHeaderCellDef [appResizableColumn]="column.id" (resizeEnd)="onResize($event)">
    {{ column.label }}
    <div class="resize-handle" (mousedown)="$event.stopPropagation()"></div>
  </th>
  <td mat-cell *matCellDef="let element"> {{ element[column.id] }} </td>
</ng-container>

<ng-container matColumnDef="virtualResizerColumn">
  <th mat-header-cell *matHeaderCellDef></th>
  <td mat-cell *matCellDef="let element"></td>
</ng-container>
```

对应的 CSS (`your-table.component.scss` 或全局 `styles.scss`)：

```scss
.mat-mdc-header-cell { // 或者 .mat-header-cell 如果你还在用旧版 Material
  position: relative; // 为了 resize-handle 的绝对定位

  .resize-handle {
    position: absolute;
    top: 0;
    right: -4px; // 稍微突出一点，方便点击
    width: 8px;
    height: 100%;
    cursor: col-resize;
    z-index: 10; // 确保在其他内容之上
    // background-color: rgba(0,0,255,0.1); // 可选：调试时显示出来
  }
}

// 确保表格和行使用 flex 布局 (新版 Material table 默认就是)
.mat-mdc-table { // 或者 .mat-table
  display: table; // Material table 默认是 display: table
  width: 100%; // 或者一个固定宽度
  overflow: hidden; // 防止内容溢出，依赖外部容器滚动
}

.mat-mdc-header-row, .mat-mdc-row { // 或者 .mat-header-row, .mat-row
  display: flex;
  width: 100%;
}

.mat-mdc-header-cell, .mat-mdc-cell { // 或者 .mat-header-cell, .mat-cell
  // 默认情况下，flex: 1; 我们需要覆盖它
  // 通过 [style.flex] 或 [style.width] 在组件中动态设置
}

// 虚拟列的样式
.mat-mdc-header-cell.mat-column-virtualResizerColumn,
.mat-mdc-cell.mat-column-virtualResizerColumn {
  flex-grow: 1; // 占据剩余空间
  flex-basis: 0; // 从0开始增长
  min-width: 10px; // 可选的最小宽度
  // background-color: rgba(255,0,0,0.1); // 可选：调试时显示出来
}
```

**3. 创建 `ResizableColumnDirective`**

```bash
ng generate directive resizableColumn
```

`resizable-column.directive.ts`:

```typescript
import { Directive, ElementRef, EventEmitter, HostListener, Input, Output, Renderer2, OnInit, OnDestroy } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface ColumnResizeEvent {
  columnId: string;
  newWidth: number;
}

@Directive({
  selector: '[appResizableColumn]',
  standalone: true, // 如果你的项目使用独立组件
})
export class ResizableColumnDirective implements OnInit, OnDestroy {
  @Input('appResizableColumn') columnId!: string; // 列的唯一标识
  @Output() resizeStart = new EventEmitter<string>(); // 开始调整事件
  @Output() resizeEnd = new EventEmitter<ColumnResizeEvent>(); // 调整结束事件

  private startX?: number;
  private startWidth?: number;
  private resizerElement!: HTMLElement;

  private mouseMoveSubscription?: Subscription;
  private mouseUpSubscription?: Subscription;

  // 定义最小和最大列宽
  private readonly MIN_WIDTH = 50; // 最小宽度，例如50px
  private readonly MAX_WIDTH = 1000; // 最大宽度，例如1000px


  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngOnInit(): void {
    // 查找或创建 resize handle (如果HTML中没有显式创建)
    // 这里假设 HTML 中已经有 .resize-handle
    const handle = this.el.nativeElement.querySelector('.resize-handle');
    if (handle) {
      this.resizerElement = handle as HTMLElement;
      this.renderer.listen(this.resizerElement, 'mousedown', this.onMouseDown.bind(this));
    } else {
      console.warn(`ResizableColumnDirective: .resize-handle not found for column ${this.columnId}`);
    }
  }

  private onMouseDown(event: MouseEvent): void {
    event.preventDefault(); // 防止文本选择等默认行为
    event.stopPropagation(); // 阻止事件冒泡到父级 (例如，排序)

    this.startX = event.clientX;
    this.startWidth = this.el.nativeElement.offsetWidth; // 获取当前列头的宽度

    this.resizeStart.emit(this.columnId);

    // 使用 RxJS fromEvent 监听全局 mousemove 和 mouseup
    const mouseMove$ = fromEvent<MouseEvent>(document, 'mousemove');
    const mouseUp$ = fromEvent<MouseEvent>(document, 'mouseup');

    this.mouseMoveSubscription = mouseMove$
      .pipe(takeUntil(mouseUp$)) // 当 mouseup 发生时自动取消订阅 mousemove
      .subscribe(this.onMouseMove.bind(this));

    this.mouseUpSubscription = mouseUp$.subscribe(this.onMouseUp.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.startX === undefined || this.startWidth === undefined) {
      return;
    }
    const deltaX = event.clientX - this.startX;
    let newWidth = this.startWidth + deltaX;

    // 应用最小/最大宽度约束
    newWidth = Math.max(this.MIN_WIDTH, Math.min(newWidth, this.MAX_WIDTH));

    // 实时更新列宽 (可选：可以只在 mouseup 时更新，或添加视觉反馈)
    // this.renderer.setStyle(this.el.nativeElement, 'width', `${newWidth}px`);
    // this.renderer.setStyle(this.el.nativeElement, 'flex', `0 0 ${newWidth}px`);

    // 建议通过事件通知父组件来更新所有相关单元格的宽度
    // 为了实时预览，可以暂时更新自己的宽度，但最终宽度由父组件统一管理
    this.resizeEnd.emit({ columnId: this.columnId, newWidth }); // 或者一个 resizeProgress 事件
  }

  private onMouseUp(event: MouseEvent): void {
    if (this.startX === undefined || this.startWidth === undefined) {
      this.cleanupSubscriptions();
      return;
    }
    // 最终的宽度计算
    const deltaX = event.clientX - this.startX;
    let finalWidth = this.startWidth + deltaX;
    finalWidth = Math.max(this.MIN_WIDTH, Math.min(finalWidth, this.MAX_WIDTH));

    this.resizeEnd.emit({ columnId: this.columnId, newWidth: finalWidth });

    this.startX = undefined;
    this.startWidth = undefined;
    this.cleanupSubscriptions();
  }

  private cleanupSubscriptions(): void {
    if (this.mouseMoveSubscription) {
      this.mouseMoveSubscription.unsubscribe();
      this.mouseMoveSubscription = undefined;
    }
    if (this.mouseUpSubscription) {
      this.mouseUpSubscription.unsubscribe();
      this.mouseUpSubscription = undefined;
    }
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }
}
```

**4. 父组件 (`your-table.component.ts`) 逻辑**

父组件负责管理列的宽度，并将这些宽度应用到模板中。

```typescript
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ColumnResizeEvent } from './resizable-column.directive'; // 导入指令和事件类型

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
  description: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  { position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H', description: 'A light gas' },
  { position: 2, name: 'Helium', weight: 4.0026, symbol: 'He', description: 'An inert gas' },
  // ... more data
];

interface ColumnDefinition {
  id: string;
  label: string;
  defaultWidth?: number; // 添加默认宽度
}

@Component({
  selector: 'app-your-table',
  templateUrl: './your-table.component.html',
  styleUrls: ['./your-table.component.scss'],
  // ViewEncapsulation.None 可以使组件的 SCSS 作用到 mat-table 的内部元素，
  // 但更好的方式是提供全局样式或在 styles.scss 中定义。
  // 如果 ResizableColumnDirective 是独立组件，需要导入。
  // standalone: true, // 如果父组件也是独立组件
  // imports: [ResizableColumnDirective, CommonModule, MatTableModule, ...],
})
export class YourTableComponent implements OnInit {
  columns: ColumnDefinition[] = [
    { id: 'position', label: 'No.', defaultWidth: 80 },
    { id: 'name', label: 'Name', defaultWidth: 200 },
    { id: 'weight', label: 'Weight', defaultWidth: 100 },
    { id: 'symbol', label: 'Symbol', defaultWidth: 80 },
    { id: 'description', label: 'Description', defaultWidth: 300 },
  ];

  // 包含所有真实列的ID
  columnsToDisplayWithoutVirtual: string[] = this.columns.map(c => c.id);
  // 包含虚拟列的ID，用于mat-table的displayedColumns
  displayedColumns: string[] = [...this.columnsToDisplayWithoutVirtual, 'virtualResizerColumn'];

  dataSource = ELEMENT_DATA;

  // 存储每列的当前宽度
  columnWidths: { [key: string]: number } = {};

  ngOnInit(): void {
    // 初始化列宽
    this.columns.forEach(column => {
      if (column.defaultWidth) {
        this.columnWidths[column.id] = column.defaultWidth;
      }
    });
    // 你也可以从 localStorage 或后端加载保存的列宽
  }

  onResize(event: ColumnResizeEvent): void {
    // 更新特定列的宽度
    if (this.columnWidths[event.columnId]) { // 确保只更新已定义的列
        this.columnWidths = {
            ...this.columnWidths,
            [event.columnId]: event.newWidth,
        };
        // console.log('Updated column widths:', this.columnWidths);
        // 可以将更新后的列宽保存到 localStorage 或后端
    }
  }

  // 用于在模板中获取列宽样式
  getColumnStyle(columnId: string): { [key: string]: string } {
    const width = this.columnWidths[columnId];
    if (width) {
      // 使用 flex-basis 来控制宽度，同时允许 flex-grow/shrink 为0，确保宽度固定
      return {
        'flex-basis': `${width}px`,
        'flex-grow': '0',
        'flex-shrink': '0',
        'width': `${width}px`, //  作为备用或给某些不支持flex-basis的旧table布局
      };
    }
    // 如果没有指定宽度，可以给一个默认的 flex 行为
    return {
        'flex': '1', // 或者其他默认值
    };
  }
}
```

**5. 父组件模板 (`your-table.component.html`) 应用动态样式**

修改 `ng-container` 中的 `mat-header-cell` 和 `mat-cell` 以应用动态宽度：

```html
<div class="table-container"> <table mat-table [dataSource]="dataSource">

    <ng-container [matColumnDef]="column.id" *ngFor="let column of columns">
      <th mat-header-cell *matHeaderCellDef
          [appResizableColumn]="column.id"
          (resizeEnd)="onResize($event)"
          [ngStyle]="getColumnStyle(column.id)"> {{ column.label }}
        <div class="resize-handle" (mousedown)="$event.stopPropagation()"></div>
      </th>
      <td mat-cell *matCellDef="let element" [ngStyle]="getColumnStyle(column.id)"> {{ element[column.id] }}
      </td>
    </ng-container>

    <ng-container matColumnDef="virtualResizerColumn">
      <th mat-header-cell *matHeaderCellDef></th> <td mat-cell *matCellDef="let element"></td> </ng-container>

    <tr mat-header-row [displayedColumns]="displayedColumns"></tr>
    <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
  </table>
</div>
```

**二、要点与注意事项**

1.  **Flexbox 布局：**

      * `mat-header-row`, `mat-row` 需要是 `display: flex`。
      * `mat-header-cell`, `mat-cell` 是 flex items。
      * 对于可调整宽度的列，其 `flex` 属性应设置为 `0 0 [width]px` 或通过 `flex-basis: [width]px; flex-grow: 0; flex-shrink: 0;` 来精确控制宽度。
      * 最右侧的**虚拟列** (`virtualResizerColumn`) 应设置为 `flex-grow: 1; flex-basis: 0;` 这样它会自动填充表格的剩余宽度。如果表格总宽度是固定的 (例如 `width: 1000px` 或 `width: 100%` 且其父容器宽度固定)，当其他列变宽时，此虚拟列会收缩；反之则扩展。

2.  **宽度管理：**

      * 父组件统一管理所有列的宽度。指令只负责发出宽度变化请求。
      * 初始宽度可以预设，也可以从 `localStorage` 或后端加载，以实现用户自定义宽度的持久化。

3.  **事件处理与性能：**

      * 在 `ResizableColumnDirective` 中，使用 RxJS 的 `fromEvent` 和 `takeUntil` 来处理全局的 `mousemove` 和 `mouseup` 事件，可以更好地管理订阅和自动取消。
      * 避免在 `mousemove` 中频繁地、大量地操作DOM。通过事件将最终宽度通知父组件，由父组件进行一次性的状态更新和样式应用通常更好。实时预览可以通过临时修改指令宿主元素的宽度来实现，但最终确认的宽度应由父组件驱动。

4.  **用户体验 (UX)：**

      * 调整手柄 (`resize-handle`) 的样式和可点击区域要易于用户操作。
      * 可以添加视觉反馈，例如在拖拽时显示一条指示线，或者改变调整手柄的颜色。这会增加指令的复杂度。
      * 设置最小/最大列宽限制，防止列被拖得过小或过大。

5.  **`$event.stopPropagation()`：**

      * 在 `resize-handle` 的 `mousedown` 事件中调用 `stopPropagation()` 是为了防止触发 `mat-header-cell` 上可能存在的其他事件，如排序。

6.  **表格总宽度与滚动：**

      * 如果表格的总列宽（包括显式设置的宽度和虚拟列的 `min-width`）超出了其容器的宽度，你需要确保表格的直接父容器设置了 `overflow-x: auto;` 以出现水平滚动条。`mat-table` 本身通常不直接滚动，而是其外部容器。

7.  **`ViewEncapsulation`：**

      * 如果 `resize-handle` 的样式定义在组件的 SCSS 文件中，并且该组件使用了默认的视图封装（`ViewEncapsulation.Emulated`），这些样式可能不会直接作用到 `mat-header-cell` 的子元素（如果 `mat-header-cell` 是由 `*matHeaderCellDef` 动态创建的）。你可能需要使用 `::ng-deep` (不推荐，但有时必要) 或将 `resize-handle` 的样式定义在全局 `styles.scss` 中，或者确保父组件没有视图封装 (`ViewEncapsulation.None`)。更现代的方法是确保你的 CSS 选择器足够精确或利用 Shadow DOM 的 `:host-context` 等（如果适用）。最简单的方式通常是将调整手柄的通用样式放在全局。

8.  **可维护性：**

      * 将调整逻辑封装在指令中，保持父组件的职责清晰（状态管理和视图更新），有助于提高代码的可维护性。

这个方案提供了一个相对完整且可维护的方式，在 Angular Material Table 上实现了类似 MUI DataGrid 的列宽调整功能，并利用了虚拟列来辅助宽度管理。实现过程中可能需要根据具体需求和 Material 版本细节进行微调。
