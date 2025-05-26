在当前的 `data-grid.component.html` 模板文件中，有几个逻辑可以考虑封装成独立的指令或组件，以提高代码的清晰度和可维护性。以下是一些建议：

1. **工具栏 (Toolbar)**:
   - 将工具栏部分（包括搜索框、密度选择器和列管理菜单）封装成一个独立的组件，例如 `DataGridToolbarComponent`。这样可以使主组件更简洁，并且可以在其他地方重用。

2. **列头 (Column Header)**:
   - 列头的逻辑（包括列标题、列菜单和列宽调整手柄）可以封装成一个 `DataGridColumnHeaderComponent`。这将使列的定义和行为更加模块化。

3. **数据行 (Data Row)**:
   - 数据行的渲染逻辑（包括选择框、单元格编辑器和普通数据行内容）可以封装成一个 `DataGridRowComponent`。这样可以将行的逻辑与其他部分分离，便于管理和测试。

4. **筛选行 (Filter Row)**:
   - 筛选行的逻辑可以封装成一个 `DataGridFilterRowComponent`，以便于管理筛选逻辑和样式。

5. **组头行 (Group Header Row)**:
   - 组头行的逻辑（包括展开/收起按钮和聚合值显示）可以封装成一个 `DataGridGroupHeaderComponent`，以便于处理组的特定行为。

6. **分页器 (Paginator)**:
   - 分页器的逻辑可以封装成一个 `DataGridPaginatorComponent`，以便于管理分页功能。

7. **调试面板 (Debug Panel)**:
   - 调试面板的逻辑可以封装成一个 `DebugPanelComponent`，以便于在需要时显示调试信息。

通过将这些逻辑封装成独立的组件或指令，可以使 `data-grid.component.html` 更加简洁，易于理解和维护。同时，这也有助于实现更好的代码复用和测试。
