好的，这是一个非常好的设计思路！将原始的 API Endpoint 抽象成用户易于理解的“数据集 (Dataset)”，是低代码平台提升用户体验和可维护性的关键一步。

下面我将为你详细设计这个功能所需的数据接口和配置界面的字段信息。

-----

### **一、 数据集下拉菜单 (Dropdown) 的数据接口设计**

这个接口是整个设计方案的基石。它不仅定义了下拉菜单中显示的内容，更重要的是，它**驱动了整个配置界面的动态生成**。

我建议使用一个包含丰富元数据（metadata）的数组结构来定义你的数据集列表。

**TypeScript 接口定义示例：**

```typescript
// 单个数据集的结构定义
export interface Dataset {
  id: string | number;         // 数据集的唯一标识符, e.g., 'monthly_sales_stats'
  name: string;                // 用户友好的名称，显示在下拉菜单中, e.g., "月度销售额统计"
  description: string;         // 详细描述，可作为 tooltip 或帮助文本, e.g., "按月统计所有产品的总销售额"
  endpoint: string;            // 对应的后端 API 路径, e.g., "/api/v1/statistics/monthly-sales"
  method: 'GET' | 'POST';      // 请求方法
  
  // 核心部分：定义此数据集可接受的动态参数，用于动态生成配置UI
  parameters: DatasetParameter[];

  // 可选：定义如何解析API响应，为图表提供默认映射建议
  responseMapping?: {
    // 数据列表在响应体中的路径，支持点表示法, e.g., 'data.records'
    listKey?: string; 
    // 建议的默认 X 轴字段
    defaultXField?: string; 
    // 建议的默认 Y 轴字段
    defaultYField?: string; 
  };
}

// 单个动态参数的结构定义
export interface DatasetParameter {
  name: string;                // 参数名，用于API请求, e.g., "productId"
  label: string;               // 在UI上显示的标签, e.g., "产品选择"
  type: 'string' | 'number' | 'date' | 'date-range' | 'select' | 'boolean'; // 决定了UI渲染的控件类型
  required: boolean;           // 是否为必填项
  defaultValue?: any;         // 参数的默认值
  
  // 当 type 为 'select' 时，提供下拉选项
  options?: Array<{ label: string; value: any }>; 
  
  // 其他UI辅助属性
  placeholder?: string;        // 输入框的占位提示
  helpText?: string;           // 字段下方的帮助文本
}
```

**一个具体的数据集列表 (`datasets.json` 或从API获取)：**

```json
[
  {
    "id": "monthly_sales_stats",
    "name": "月度销售额统计",
    "description": "按月统计指定时间范围内的总销售额数据。",
    "endpoint": "/api/v1/statistics/monthly-sales",
    "method": "GET",
    "parameters": [
      {
        "name": "dateRange",
        "label": "时间范围",
        "type": "date-range",
        "required": true
      }
    ],
    "responseMapping": {
      "listKey": "data",
      "defaultXField": "month",
      "defaultYField": "salesAmount"
    }
  },
  {
    "id": "user_activity_by_product",
    "name": "用户活跃度（按产品）",
    "description": "查询指定产品的日活跃用户数(DAU)。",
    "endpoint": "/api/v1/activity/daily-active-users",
    "method": "GET",
    "parameters": [
      {
        "name": "productId",
        "label": "选择产品",
        "type": "select",
        "required": true,
        "options": [
          { "label": "产品A", "value": "prod_a" },
          { "label": "产品B", "value": "prod_b" }
        ]
      },
      {
        "name": "days",
        "label": "查询天数",
        "type": "number",
        "required": false,
        "defaultValue": 30,
        "placeholder": "默认为最近30天"
      }
    ],
    "responseMapping": {
      "listKey": "data.records",
      "defaultXField": "date",
      "defaultYField": "dau"
    }
  }
]
```

-----

### **二、 右侧配置面板的字段设计**

基于上述接口，我们可以设计一个功能强大且用户友好的配置面板。推荐使用**标签页 (Tabs)** 来组织不同的配置项。

#### **标签页 1: 数据源 (Data Source)**

这是配置的核心，所有内容都由用户选择的数据集动态驱动。

1.  **数据集 (Dataset)**

      * **字段类型:** 下拉列表 (Dropdown / Select)
      * **功能:** 用户在此选择一个数据集。这是所有后续配置的起点。列表选项的 `label` 来自 `Dataset.name`，`value` 来自 `Dataset.id`。

2.  **动态参数配置 (Dynamic Parameters)**

      * **字段类型:** 这是一个**动态渲染区域**。
      * **功能:** 当用户选择了数据集后，此区域会根据所选数据集的 `parameters` 数组动态生成表单控件。
          * `v-for="param in selectedDataset.parameters"`
          * 根据 `param.type` 渲染不同的组件：
              * `type: 'string'` -\> `<input type="text">`
              * `type: 'number'` -\> `<input type="number">`
              * `type: 'date-range'` -\> `<el-date-picker type="daterange">` (以Element Plus为例)
              * `type: 'select'` -\> `<el-select>`，其选项来自 `param.options`
              * `type: 'boolean'` -\> `<el-switch>`
          * 每个控件都与一个请求参数对象 `requestParams` 进行双向绑定。

3.  **数据刷新设置 (Data Refresh)**

      * **自动刷新 (Auto Refresh):**
          * **字段类型:** 开关 (Switch / Toggle)
          * **功能:** 用户决定图表数据是否需要定时轮询更新。
      * **刷新频率 (Refresh Interval):**
          * **字段类型:** 下拉列表或输入框
          * **功能:** 当“自动刷新”开启时，设定刷新间隔（如：30秒, 1分钟, 5分钟, 自定义）。

4.  **数据预览与调试 (Data Preview & Debug)**

      * **预览数据 (Preview Data):**
          * **字段类型:** 按钮 (Button)
          * **功能:** 点击后，根据当前选择的数据集、配置的动态参数，立即发起一次API请求。
      * **响应结果 (Response Body):**
          * **字段类型:** 代码显示区 (`<pre>` 或 JSON Viewer 组件)
          * **功能:** 将预览请求返回的原始 JSON 数据展示出来。这对开发者和高级用户配置图表数据映射时非常有用，可以清楚地看到可用的字段。

#### **标签页 2: 图表配置 (Chart Configuration)**

这个标签页负责图表的视觉表现和数据映射。

1.  **通用样式 (General Style)**

      * **图表标题 (Chart Title):**
          * **字段类型:** 文本输入框
      * **图例 (Legend):**
          * **字段类型:** 开关 (Switch / Toggle)
      * **配色方案 (Color Palette):**
          * **字段类型:** 颜色选择器或预设方案下拉列表

2.  **数据映射 (Data Mapping)**

      * **X轴字段 (X-Axis Field):**
          * **字段类型:** 下拉列表
          * **功能:** 列表的选项**动态生成**，来源于“数据源”标签页中预览请求返回的数据的字段键名。可以根据 `Dataset.responseMapping.defaultXField` 设置默认选中项。
      * **Y轴字段 (Y-Axis Field(s)):**
          * **字段类型:** 下拉列表（支持多选）
          * **功能:** 同上，来源于预览数据的字段键名。允许多选，以支持在同一个图表上展示多条系列（例如：同时展示产品A和产品B的销量）。
      * **分组/堆叠字段 (Group/Stack By Field):**
          * **字段类型:** 下拉列表
          * **功能:** 用于创建分组柱状图或堆叠面积图。选项同样来源于预览数据的字段键名。

#### **标签页 3: 交互 (Interactions) (可选的高级功能)**

1.  **图表联动 (Chart Interactivity)**
      * **点击事件 (Click Event):**
          * **字段类型:** 下拉列表
          * **功能:** 定义点击图表上的数据点时触发什么动作（如：无、打开链接、联动刷新其他图表、显示详情弹窗）。
      * **联动目标 (Target Chart):**
          * **字段类型:** 下拉列表
          * **功能:** 当点击事件为“联动刷新”时，选择要刷新的画布上的其他图表。

### **工作流程示例**

1.  用户从左侧组件库拖动一个“柱状图”到画布上。
2.  用户点击画布上的柱状图，右侧配置面板激活。
3.  在“数据源”标签页，用户从**数据集**下拉列表中选择“用户活跃度（按产品）”。
4.  界面立即在下方**动态参数配置**区域生成了“选择产品”的下拉框和“查询天数”的数字输入框。
5.  用户在“选择产品”中选择了“产品A”，并保持“查询天数”为默认的30。
6.  用户点击**预览数据**按钮，系统根据配置向 `/api/v1/activity/daily-active-users?productId=prod_a&days=30` 发起请求，并将返回的JSON展示在**响应结果**区。
7.  用户切换到“图表配置”标签页。
8.  **X轴字段**和**Y轴字段**的下拉框已经自动根据 `responseMapping` 的建议，选中了 `date` 和 `dau`。图表成功渲染。
9.  用户在**图表标题**中输入“产品A - 近30日DAU”，图表标题随之更新。

通过这种设计，你将原本复杂、对技术要求高的API配置过程，转变成了一个对业务用户非常友好的、声明式的配置体验。
