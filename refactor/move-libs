当然可以。将共享代码从大型应用中抽离到 `libs` 中是 Nx Monorepo 的核心优势和最佳实践。这个过程不仅能优化项目结构，还能显著提升编译和测试速度。

这是一个详细、分阶段的实施方案，帮助你系统地完成这项重构工作。

---

### **核心理念**

整个重构过程遵循 **“识别 -> 分组 -> 提取 -> 替换”** 的循环。关键在于不要急于移动代码，而是先做好充分的分析和规划。

### **第一阶段：分析与规划 (最重要的阶段) 🗺️**

这个阶段的目标是弄清楚现有代码的混乱关系，并制定出一份清晰的重构蓝图。

1.  **使用 Nx 依赖图进行分析：**
    这是你最有力的工具！在项目根目录运行以下命令，打开一个可视化的依赖关系图：
    ```bash
    nx graph
    ```
    通过这个图，你可以清晰地看到 `master` 和 `admin` 内部及它们之间的依赖关系。重点关注那些被多个模块引用的“中心节点”，它们通常是优先抽离的对象。

2.  **识别和分类共享代码：**
    遍历 `master` 应用中的代码，根据功能和职责将其分类。这是决定 `libs` 结构的关键。常见的分类如下：
    * **UI (展示型组件):**
        * **描述:** 纯粹的、无业务逻辑的 UI 组件，如按钮、输入框、卡片、布局等。它们通过 `@Input()` 接收数据，通过 `@Output()` 发出事件。
        * **示例:** `libs/shared/ui/button`, `libs/shared/ui/forms`
    * **Feature (功能型库):**
        * **描述:** 实现特定业务功能的“智能”组件或模块，它们可能包含自己的路由、服务和状态。
        * **示例:** `libs/products/feature-search`, `libs/orders/feature-management`
    * **Data Access (数据访问):**
        * **描述:** 负责与后端 API 交互的服务。通常包含 `HttpClient`调用、数据转换逻辑，以及状态管理（如 NgRx, Akita, 或基于 Signal 的 Store）。
        * **示例:** `libs/products/data-access`, `libs/auth/data-access`
    * **Utils (工具库):**
        * **描述:** 全局可用的、无状态的纯函数、管道 (Pipes)、指令 (Directives)、常量等。
        * **示例:** `libs/shared/utils/formatters`, `libs/shared/utils/validators`
    * **Models (模型/接口):**
        * **描述:** TypeScript 的 `interface` 和 `type` 定义。
        * **示例:** `libs/shared/models` (这个库通常没有 `.ts` 文件，只有 `.ts` 类型定义)

3.  **制定提取计划：**
    * **自下而上提取：** 优先提取那些依赖最少的库。通常顺序是：**Models -> Utils -> UI -> Data Access -> Feature**。
    * **创建任务清单：** 制作一个表格或清单，明确列出要移动的每个模块/组件/服务，以及它将要归属的新 `lib`。

---

### **第二阶段：执行重构 (增量式进行) 🚀**

在这个阶段，你将按照计划，逐个创建库并迁移代码。**强烈建议在新的 Git 分支上进行此操作，并进行小批量、高频率的提交。**

对于**每一个**要创建的库（例如，一个 `ui-button` 库），重复以下循环：

1.  **生成新库 (Generate Lib):**
    使用 Nx Generator 创建一个库。`--buildable` 标志非常重要，它能让 Nx 缓存该库的构建结果，从而加速后续的编译。
    ```bash
    # 创建一个可构建的、名为 button 的库，放在 shared/ui 目录下
    nx g @nx/angular:library button --directory=shared/ui --buildable
    ```
    * `--directory` 参数可以帮助你组织 `libs` 文件夹。

2.  **移动代码 (Move Code):**
    将 `apps/master/src/...` 中对应的组件文件（.ts, .html, .scss, .spec.ts）移动到新创建的库目录中 `libs/shared/ui/button/src/lib/`。

3.  **更新新库的模块定义:**
    * 打开新库的 `.module.ts` 文件（例如 `libs/shared/ui/button/src/lib/button.module.ts`）。
    * 在 `declarations` 中声明你移入的组件。
    * 在 `exports` 中导出这些组件，以便其他模块可以使用它们。
    * **对于 Standalone 组件:** 无需模块文件，只需在库的 `index.ts` 中导出组件即可。

4.  **暴露公共 API (Expose Public API):**
    打开新库的入口文件 `libs/shared/ui/button/src/index.ts`。从这里导出所有需要被外部使用的模块、组件、服务、接口等。这是 Nx 库封装的核心。
    ```typescript
    // libs/shared/ui/button/src/index.ts
    export * from './lib/button.module';
    export * from './lib/button/button.component';
    ```

5.  **修正内部路径 (Fix Internal Paths):**
    检查刚移入的代码，修正它们内部可能存在的相对路径引用错误。

6.  **替换旧引用 (The Real Refactoring):**
    * 回到 `master` 和 `admin` 应用（以及任何其他使用了这些旧代码的地方）。
    * **更新 NgModule:** 从应用的 `.module.ts` 中移除旧的组件声明，并 `import` 新的库模块。
        ```typescript
        // a-module-in-master-app.module.ts
        // import { MyButtonComponent } from '../path/to/my-button.component'; // <--- 移除旧的
        import { ButtonModule } from '@my-org/shared/ui/button'; // <--- 导入新的 (路径别名由 Nx 自动配置)

        @NgModule({
          // declarations: [MyButtonComponent], // <--- 从这里移除
          imports: [CommonModule, ButtonModule], // <--- 在这里导入
        })
        ```
    * **更新导入路径:** 使用 IDE 的全局搜索替换功能，将所有对旧文件的相对路径引用 (`../..`) 替换为新的库路径别名 (例如 `@my-org/shared/ui/button`)。

7.  **测试与验证 (Test & Verify):**
    * 运行新库的测试：`nx test shared-ui-button`
    * 运行受影响应用的测试：`nx test master`, `nx test admin`
    * 运行 Linter：`nx lint`
    * 启动应用 (`nx serve master`)，确保功能正常。编译器和 Linter 将是你最好的帮手。

8.  **提交 (Commit):**
    为一个库的成功提取创建一个独立的 Git 提交。这使得回滚和排查问题变得非常容易。

**重复以上 1-8 步，直到你的任务清单完成。**

---

### **第三阶段：验证与优化 🏆**

1.  **再次检查依赖图：**
    重构完成后，再次运行 `nx graph`。你会看到一个非常清晰的结构：
    * `apps` 依赖于 `libs`。
    * `libs` 之间根据功能互相依赖（例如 `feature` 依赖 `ui` 和 `data-access`）。
    * **绝不应该出现 `libs` 依赖 `apps` 的情况。**

2.  **利用构建缓存：**
    现在，当你修改 `master` 应用的某个组件时，运行 `nx build master`，Nx 会直接使用未变动的库的缓存结果，构建速度会得到质的飞跃。

3.  **强制执行边界规则：**
    在 `nx.json` 或根目录的 `eslint.config.js` (或 `.eslintrc.json`) 中，配置 `@nx/enforce-module-boundaries` 规则。这可以防止团队成员未来再次创建混乱的依赖关系，例如：
    * 禁止 `data-access` 库导入 `feature` 库。
    * 禁止 `ui` 库导入 `data-access` 或 `feature` 库。

---

### **总结与长期收益**

这个重构过程虽然初期投入较大，但会带来巨大的长期收益：

* **逻辑清晰：** 代码按职责划分，结构一目了然。
* **高度复用：** `admin` 和 `master`（以及未来的任何新应用）可以轻松复用 `libs` 中的代码。
* **编译加速：** Nx 的计算缓存机制将显著缩短构建和测试时间。
* **团队协作：** 不同团队可以并行负责不同的 `libs`，降低代码冲突。
* **可维护性：** 修改一个独立的 `lib` 比修改一个庞大应用中的代码要安全和简单得多。

从最没有依赖的 `utils` 和 `models` 库开始，一步一个脚印，你就能成功地将这个大型项目重构成一个清晰、高效的 Nx Monorepo。祝你好运！
