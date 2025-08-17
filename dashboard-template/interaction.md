当然，这是一个非常核心的交互流程，完美地体现了您的低代码平台“配置驱动”的理念。将这个流程梳理清楚，基本上就定义了平台的核心用户体验和前端架构的运作方式。

我们以您提到的具体场景为例：**用户拖入一个 Line Chart 组件，希望它能展示“最近一个月设备A的属性B的趋势”**。

这个过程可以分解为几个关键步骤，每一步都依赖于我们之前定义的数据结构和架构原则。

---

### **第一步：组件的“能力契约” (Component's Contract / Manifest)**

这是整个流程的基石。每个在左侧面板中可用的组件（无论是什么类型），都必须自身带有一份“说明书”，我们称之为**能力契约**或**清单 (Manifest)**。这份契约是**静态的、预定义**的，是组件代码的一部分。

`LineChart`组件的契约可能长这样：

TypeScript

```
// LineChart.manifest.ts

import { DataType } from './types';

export const LineChartManifest = {
  widgetType: 'LineChart', // 唯一的组件类型ID
  name: '折线图',          // 显示在左侧列表的名称
  icon: 'chart-line',     // 显示的图标

  // 核心！定义了该组件有哪些“数据槽位” (Data Slots)
  // 以及每个槽位能接受什么样的数据
  slots: [
    {
      id: 'yAxis', // 槽位的唯一标识
      name: 'Y轴 / 指标',
      description: '要展示其趋势的数值或时间序列数据',
      required: true,
      // 声明这个槽位只接受 TimeSeries 或 Numeric 类型的属性
      acceptedDataTypes: [DataType.TimeSeries, DataType.Numeric],
    },
    {
      id: 'xAxis',
      name: 'X轴 / 时间轴',
      description: '定义图表的时间或分类维度',
      required: false, // 可选，如果Y轴是TimeSeries，可以自动推断
      acceptedDataTypes: [DataType.TimeSeries, DataType.Categorical],
    },
    {
      id: 'series',
      name: '分组 / 系列',
      description: '将数据拆分成多条线',
      required: false,
      // 分组通常使用分类数据
      acceptedDataTypes: [DataType.Categorical],
    }
  ]
};
```

这份契约是您平台中所有智能行为的**“知识源”**。

### **第二步：拖拽组件，实例化Widget**

1. 用户从左侧组件列表中将“折线图”拖拽到画布上。
    
2. 系统捕获到这个动作，读取 `LineChartManifest`。
    
3. 在前端的 `IDashboardState` 中，系统在 `widgets` 对象里创建一个新的 `IWidget` 实例：
    
    JSON
    
    ```
    "widget_line_123": {
      "id": "widget_line_123",
      "widgetType": "LineChart", // 来自契约
      "position": { "x": 10, "y": 5, "w": 8, "h": 6 }, // 根据拖拽位置计算
      "bindings": {}, // **关键：初始绑定为空**
      "visualConfig": {}
    }
    ```
    
4. 画布上出现一个空的折线图占位符，同时，应用的状态更新，将 `widget_line_123` 设为当前选中的组件。
    

### **第三步：配置面板的动态渲染逻辑 (核心)**

这是您问题的核心。当用户选中这个新的折线图组件后，右侧配置面板会立即被激活，并执行以下**“智能匹配”**逻辑：

1. **获取上下文**: 配置面板知道当前选中的 `widgetId` 是 `widget_line_123`。
    
2. **获取组件契约**: 它根据 `widget.widgetType` (`'LineChart'`) 找到并加载 `LineChartManifest`。现在，面板知道了这个组件有 `yAxis`, `xAxis`, `series` 三个数据槽位，以及每个槽位分别接受什么 `DataType` 的属性。
    
3. **获取可用属性**: 面板从 `IDashboardState.properties` 中获取当前仪表盘上所有已定义的属性列表。
    
4. **执行匹配与过滤**: 面板开始“配对”。
    
    - 它为`yAxis`槽位生成一个下拉列表。为了填充这个列表的选项，它会遍历所有可用属性，**只筛选出那些 `property.dataType` 是 `TimeSeries` 或 `Numeric` 的属性**。
        
    - 它为`series`槽位生成另一个下拉列表。它会遍历所有可用属性，**只筛选出那些 `property.dataType` 是 `Categorical` 的属性**。
        
5. **渲染UI**: 最终，配置面板会渲染出类似这样的UI：
    
    - **Y轴 / 指标** `[下拉列表]`
        
        - 选项1: "设备A的属性B" (因为它的 `dataType` 是 `TimeSeries`)
            
        - 选项2: "设备C的电压" (因为它的 `dataType` 是 `Numeric`)
            
        - _... 其他所有符合条件的属性_
            
    - **分组 / 系列** `[下拉列表]`
        
        - 选项1: "设备区域" (因为它的 `dataType` 是 `Categorical`)
            
        - _... 其他所有符合条件的属性_
            

这个过程完美地实现了**“渐进式披露”**和**“引导式工作流”**。用户不会看到不相关的选项，系统通过**组件契约**和**属性类型**的匹配，智能地引导用户进行有效配置。

### **第四步：用户的交互与数据绑定**

现在，用户开始与这个动态生成的面板交互，以实现他的目标“展示最近一个月设备A的属性B的趋势”。

1. 在“Y轴 / 指标”的下拉列表中，用户找到了并选择了“设备A的属性B”（其ID为 `prop_b`）。
    
2. 前端应用监听到这个选择，执行状态更新操作：将 `widget_line_123` 的 `bindings` 对象更新为：
    
    JavaScript
    
    ```
    // 在 state.widgets['widget_line_123'] 中
    "bindings": {
      "yAxis": "prop_b" // 将 yAxis 槽位与 prop_b 的ID进行绑定
    }
    ```
    
3. 此时，绑定关系已经建立。
    

### **第五步：组件消费属性，数据的流动与最终渲染**

画布上的 `LineChartComponent` 实例是响应式的，它时刻“感知”着分配给自己的 `props`（即 `state.widgets['widget_line_123']` 的内容）。

1. 组件侦测到 `bindings.yAxis` 的值从 `undefined` 变成了 `'prop_b'`。
    
2. 组件内部逻辑启动。它使用这个ID `'prop_b'`，从全局状态 `state.properties` 中 O(1) 查找到对应的**属性对象**。
    
3. **组件现在持有了“设备A的属性B”这个属性对象的引用。**
    
4. 组件调用该属性对象的 `getDataStream()` 方法（或者类似的订阅机制）。
    
5. 属性对象内部开始工作：
    
    - 它知道自己关联了“设备A数据源”。
        
    - 它向该数据源发起数据请求，并传入必要的参数。**“最近一个月”这个时间范围，可以来自于仪表盘的全局时间选择器，或者是在配置面板上为该属性绑定动态生成的参数输入框。**
        
    - 数据源策略（`DeviceDataFetcher`）调用后端API，获取到原始数据。
        
    - 属性对象根据 `mappingPath` (`'telemetry.temperature'`) 从原始数据中提取出所需的时间序列数据。
        
    - 数据通过之前建立的订阅流，推送给 `LineChartComponent`。
        
6. `LineChartComponent` 收到格式化的 `TimeSeries` 数据后，调用底层的图表库（如 ECharts）的 `setOption` 方法，将数据渲染成一条时间趋势线。
    

至此，用户的目标就完全达成了。整个过程是**声明式**和**数据驱动**的，每一步的逻辑都清晰且解耦。
