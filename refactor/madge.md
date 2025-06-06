好的，这个问题非常好，在大型项目中分析文件依赖关系是重构和维护的关键一步。`madge` 是一个非常强大的工具，并且它完全支持 `tsconfig.json` 的路径映射。

下面我将分步介绍如何使用 `madge`，并提供一个可以直接通过 `npx` 或 `node` 执行的脚本来自动化这个过程。

---

### 方案一：直接使用 `madge` 命令

如果你只是想快速查询，可以直接在命令行中使用 `madge`。

1.  **安装 `madge`** (如果你尚未安装)：
    ```bash
    npm install -g madge
    ```

2.  **核心命令：`--reverse` 和 `--tsconfig`**
    * `--reverse <file>` 或 `-R <file>`: 这是关键参数，用于查找哪些文件依赖于指定的 `<file>`。
    * `--tsconfig <path>`: 这是解决你路径映射问题的关键参数。它会告诉 `madge` 读取指定的 `tsconfig.json` 文件来解析路径别名（如 `@/app/...`, `@my-org/utils` 等）。

3.  **使用示例：**
    假设你的项目结构如下：
    ```
    /my-project
    ├── apps/
    │   └── my-app/
    │       ├── src/
    │       │   ├── main.ts
    │       │   └── app/
    │       │       └── components/
    │       │           └── home.component.ts
    ├── libs/
    │   └── shared/
    │       └── services/
    │           └── user.service.ts  <--- 我们要查这个文件
    ├── tsconfig.base.json
    └── package.json
    ```
    并且 `tsconfig.base.json` 中有类似这样的路径映射：
    ```json
    {
      "compilerOptions": {
        "paths": {
          "@my-org/shared/services": ["libs/shared/services/src/index.ts"]
        }
      }
    }
    ```
    现在，你想知道项目中哪些文件引用了 `user.service.ts`。你需要执行以下命令：

    ```bash
    madge --reverse --tsconfig tsconfig.base.json libs/shared/services/user.service.ts .
    ```

    * **`--reverse`**: 表示执行反向依赖查找。
    * **`--tsconfig tsconfig.base.json`**: 指定了包含路径映射的配置文件。
    * **`libs/shared/services/user.service.ts`**: 这是你要查询的目标文件。
    * **`.`**: 这是 `madge` 开始扫描的入口目录（这里我们从项目根目录开始扫描）。

    `madge` 会输出一个列表，列出所有直接或间接 `import` 了 `user.service.ts` 的文件。

---

### 方案二：可工作的 Node.js 脚本 (一键执行)

为了实现你想要的“一键执行”效果，我们可以编写一个简单的 Node.js 脚本来封装上面的命令。

**步骤 1: 创建脚本文件**

在你的项目根目录下，创建一个名为 `find-dependents.js` 的文件，并将以下代码复制进去：

**`find-dependents.js`**
```javascript
#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// --- 配置 ---
// 默认的 tsconfig 文件名。如果你的项目使用不同的名称，请修改这里。
const TSCONFIG_NAME = 'tsconfig.base.json'; 
// --- 结束配置 ---

// 1. 解析命令行参数
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('❌ 错误: 请提供要查询的目标文件路径。');
  console.log('用法: node find-dependents.js <目标文件路径> [项目扫描目录]');
  console.log('示例: npx find-dependents libs/shared/services/user.service.ts');
  process.exit(1);
}

const targetFileRelative = args[0];
const projectDir = args[1] ? path.resolve(args[1]) : process.cwd();

// 将相对路径转换为绝对路径
const targetFileAbsolute = path.resolve(projectDir, targetFileRelative);

// 2. 验证文件和配置是否存在
if (!fs.existsSync(targetFileAbsolute)) {
  console.error(`❌ 错误: 目标文件不存在: ${targetFileAbsolute}`);
  process.exit(1);
}

const tsconfigPath = path.join(projectDir, TSCONFIG_NAME);
if (!fs.existsSync(tsconfigPath)) {
  console.error(`❌ 错误: 在项目根目录未找到 '${TSCONFIG_NAME}'。请确保脚本从项目根目录运行，或修改脚本中的 TSCONFIG_NAME。`);
  process.exit(1);
}

// 3. 构建并执行 madge 命令
// 使用 npx 可以确保即使全局未安装 madge 也能运行
const command = `npx madge --reverse --tsconfig ${tsconfigPath} ${targetFileAbsolute} ${projectDir}`;

console.log('🔍 正在分析依赖关系，请稍候...');
console.log(`执行命令: ${command}\n`);

exec(command, (error, stdout, stderr) => {
  if (error && error.code !== 0) {
    // Madge 在找到依赖时退出码可能为0，但没找到时可能会有不同的退出码或错误信息
    // 我们主要关心 stderr
  }

  if (stderr) {
    console.error(`Madge 错误信息:\n${stderr}`);
    // 如果 stderr 包含 "could not resolve"，说明有路径解析问题
    if(stderr.includes('could not resolve')) {
        console.error('\n提示: 如果看到 "could not resolve" 错误，请检查 tsconfig 中的 paths 是否正确，或者尝试清理缓存。');
    }
  }

  // 4. 处理和显示结果
  const dependents = stdout.trim().split('\n').filter(Boolean); // 分割并移除空行

  if (dependents.length > 0 && !dependents[0].includes('No dependencies found')) {
    const relativeTarget = path.relative(projectDir, targetFileAbsolute);
    console.log(`✅ 找到了 ${dependents.length} 个文件依赖于: ${relativeTarget}`);
    console.log('--------------------------------------------------');
    dependents.forEach(dep => {
      // Madge的输出是绝对路径，我们转换为相对于项目根目录的路径以便阅读
      const relativePath = path.relative(projectDir, dep.trim());
      console.log(`  - ${relativePath}`);
    });
    console.log('--------------------------------------------------');
  } else {
    const relativeTarget = path.relative(projectDir, targetFileAbsolute);
    console.log(`🤷‍♂️ 未找到任何依赖于 ${relativeTarget} 的文件。`);
  }
});
```

**步骤 2: 如何执行脚本**

现在，你可以通过 `npx` 或 `node` 来一键执行这个脚本了。**确保你的终端当前目录在项目根目录。**

* **方式一：使用 `npx` (推荐)**
    `npx` 会自动处理 `madge` 的安装，即使你的项目没有显式依赖它。

    ```bash
    # 只需要提供目标文件的路径即可
    npx node find-dependents.js libs/shared/services/user.service.ts
    ```

* **方式二：使用 `node`**
    ```bash
    node find-dependents.js libs/shared/services/user.service.ts
    ```

* **可选参数：**
    如果你的项目源文件不在根目录，你可以提供第二个参数作为扫描的入口。
    ```bash
    # 假设所有源码都在 src 目录下
    npx node find-dependents.js src/app/services/user.service.ts src
    ```

### 脚本工作原理解释

1.  **参数解析：** 脚本获取你传入的目标文件路径。
2.  **路径和配置检查：** 它会验证目标文件是否存在，并检查项目根目录下是否有 `tsconfig.base.json` (这是 Nx 项目中包含路径映射的常见文件名，你可以在脚本中修改它)。
3.  **命令构建：** 它为你动态构建了我们在方案一中讨论的 `madge` 命令。
4.  **命令执行：** 使用 Node.js 的 `child_process.exec` 来执行这个命令。
5.  **结果格式化：** 它捕获 `madge` 的输出（一个文件列表），进行清理，并以清晰、易读的格式（相对于项目根目录的路径）展示给你。

### 其他技巧

* **可视化依赖图：** 如果你想查看某个文件的正向依赖关系图，可以使用 `madge` 的 `--image` 标志生成一张图片。
    ```bash
    # 查看 user.service.ts 依赖了哪些文件，并生成图片
    madge --image graph.png --tsconfig tsconfig.base.json libs/shared/services/user.service.ts
    ```
* **处理不同 `tsconfig` 文件：** 在大型 monorepo 中，可能会有 `tsconfig.app.json`, `tsconfig.lib.json` 等。通常，根目录的 `tsconfig.base.json` 包含了所有的路径映射，所以使用它一般是正确的。如果你的映射在别的文件里，只需相应地修改脚本中的 `TSCONFIG_NAME` 变量即可。

这个脚本为你提供了一个强大的、可复用的工具，能极大地方便你在大型项目中进行依赖分析和重构规划。
