[[借鉴枚举和模式匹配]]
[[由学习Rust概念展开的联想]]
当然可以！这是一个非常棒的进阶想法。利用 TypeScript 强大的类型系统，我们可以创建一套通用的工具函数，来极大简化模式匹配的写法，使其更具声明性，也更接近函数式编程的风格。

我们的目标是创建几个核心函数：

1. `match()`: 一个**穷尽的**匹配函数，它会强制你处理所有情况，并返回一个值。
    
2. `when()`: 一个类似 `if let` 的辅助函数，当匹配到特定情况时执行一个操作。
    

下面我们就一步步构建这个迷你“模式匹配”库。

---

### 准备工作：通用的可辨识联合类型

首先，我们需要一个通用的接口来描述我们的可辨识联合类型，这样我们的工具函数才能处理任意的联合类型，而不仅仅是 `DataState`。

```ts
// 所有联合类型成员都必须遵守这个接口
// K 是“标签”属性的名称，默认为 'kind'
export interface DiscriminatedUnion<K extends string = 'kind'> {
  [key: K]: string;
}
```

---

### 1. 核心工具函数：`match()`

这个函数将是我们模式匹配的“主力”。它接受一个联合类型的值和一个“处理器”对象，然后返回一个结果。

#### 实现 `match()`

```ts
/**
 * 处理器对象的类型定义。
 * - TUnion: 我们的联合类型，例如 DataState<User>
 * - TResult: 每个处理器分支返回的结果类型
 * - K: 标签属性的 key，默认为 'kind'
 */
type Matcher<TUnion extends DiscriminatedUnion<K>, TResult, K extends string = 'kind'> = {
  // Mapped Type: key 是联合类型中每个成员的 kind 值
  // value 是一个函数，接收该 kind 对应的具体类型，并返回 TResult
  [V in TUnion[K]]: (value: Extract<TUnion, Record<K, V>>) => TResult;
};

/**
 * 一个类型安全的、穷尽的模式匹配函数。
 * @param value 要匹配的联合类型的值
 * @param handlers 处理器对象，必须包含联合类型的所有变体
 * @param kindKey (可选) 辨识用的标签 key，默认为 'kind'
 * @returns 匹配到的处理器分支的返回值
 */
export function match<
  TUnion extends DiscriminatedUnion<K>,
  TResult,
  K extends string = 'kind'
>(
  value: TUnion,
  handlers: Matcher<TUnion, TResult, K>,
  kindKey: K = 'kind' as K
): TResult {
  // 根据 value 的 kind，从 handlers 中找到对应的处理函数并执行
  // as any 是为了绕过 TypeScript 的一个限制，但外部类型是安全的
  const handler = handlers[value[kindKey] as TUnion[K]];
  return handler(value as any);
}
```

**关键点解析**：

- **泛型 (`<...>`):** 让函数变得通用。
    
- **`Matcher<...>` 类型**: 这是实现类型安全的核心。
    
    - `[V in TUnion[K]]`: 这段代码的意思是“遍历 `TUnion` 所有可能的 `kind` 值”。如果 `DataState` 有 `'Loading'`, `'Success'`, `'Error'` 三种 `kind`，那么 `Matcher` 对象就必须有这三个同名属性。如果你少写一个，TypeScript 就会报错！**这就实现了穷尽性检查**。
        
    - `Extract<TUnion, Record<K, V>>`: 这是 TypeScript 的一个工具类型，它能从 `TUnion` 中“提取”出 `kind` 值为 `V` 的那个具体的类型。例如，当 `V` 是 `'Success'` 时，`Extract` 会返回 `SuccessState<T>` 类型。这保证了在 `handler` 函数内部，`value` 参数的类型是完全正确的，你可以安全地访问 `value.data`。
        

#### `match()` 使用示例

```ts
// 假设我们有上一节定义的 DataState 和一个 state 实例
const currentState: DataState<User[]> = { kind: 'Success', data: [{ name: 'Alice' }] };

// 使用 match 函数来根据状态生成页面标题
const pageTitle = match(currentState, {
  Loading: () => "Loading users...",
  Success: (state) => `Users found: ${state.data.length}`, // state 类型被正确推断为 SuccessState<User[]>
  Error: (state) => `Error: ${state.error}`, // state 类型被正确推断为 ErrorState
});

console.log(pageTitle); // 输出 "Users found: 1"
```

这个写法比 `switch` 语句更紧凑，也更具“表达式”的风格。

---

### 2. 辅助函数：`when()`

有时候我们只关心一种情况，比如“当状态是Error时，弹出一个提示框”。`when` 函数就是为此而生。

#### 实现 `when()`

```ts
/**
 * 当 value 匹配到指定的 kind 时，执行一个操作 (无返回值)。
 * @param value 要匹配的联合类型的值
 * @param targetKind 我们关心的那个 kind
 * @param action 要执行的操作函数
 * @param kindKey (可选) 辨识用的标签 key，默认为 'kind'
 */
export function when<
  TUnion extends DiscriminatedUnion<K>,
  TTargetKind extends TUnion[K],
  K extends string = 'kind'
>(
  value: TUnion,
  targetKind: TTargetKind,
  action: (value: Extract<TUnion, Record<K, TTargetKind>>) => void,
  kindKey: K = 'kind' as K
): void {
  if (value[kindKey] === targetKind) {
    // 当 kind 匹配时，执行回调
    action(value as any);
  }
}
```

#### `when()` 使用示例

```ts
const errorState: DataState<User> = { kind: 'Error', error: 'Network Failed' };
const successState: DataState<User> = { kind: 'Success', data: { name: 'Bob' } };

// 只在 errorState 是 'Error' 的时候执行
when(errorState, 'Error', (state) => {
  // state 的类型被正确推断为 ErrorState
  console.error('Logging error to monitoring service:', state.error); 
});
// > Logging error to monitoring service: Network Failed

// successState 的 kind 不是 'Error'，所以 action 不会执行
when(successState, 'Error', (state) => {
  console.error('This will not be printed');
});
```

这个函数完美替代了 `if let` 的场景，让意图更加清晰。

---

### 在 Angular 组件中的综合应用

现在，我们把这些工具函数应用到 Angular 组件中，看看代码会变得多优雅。

```ts
// my-component.ts
import { Component } from '@angular/core';
import { DataState, User } from './...';
import { match, when } from './pattern-match.utils'; // 引入我们的工具函数

@Component({ /* ... */ })
export class MyComponent {
  // 假设 state 是一个普通的属性，而不是 Observable
  state: DataState<User[]> = { kind: 'Loading' };

  constructor() {
    // 模拟数据加载
    setTimeout(() => {
      this.updateState({ kind: 'Success', data: [{ name: 'Charlie' }] });
    }, 2000);
  }

  // 使用 getter 属性，可以在模板中直接绑定 [title]="title"
  get title(): string {
    return match(this.state, {
      Loading: () => 'Please wait',
      Success: () => 'Data Loaded Successfully',
      Error: (s) => `Operation Failed: ${s.error}`,
    });
  }

  // 组件内部的逻辑更新
  updateState(newState: DataState<User[]>) {
    this.state = newState;
    
    // 使用 when 来处理副作用，比如打日志或弹窗
    when(this.state, 'Error', (s) => {
      // 在这里调用弹窗服务
      // this.toastService.showError(s.error);
      console.log(`Toast pop-up with error: ${s.error}`);
    });
  }
}
```

在模板中，你可以这样使用：

```html
<h1>{{ title }}</h1>

<div [ngSwitch]="state.kind">
  </div>
```

### 总结

通过创建 `match` 和 `when` 这两个通用的、类型安全的工具函数，我们成功地将 Rust 模式匹配的强大思想以一种函数式、声明式的方式引入到了 TypeScript 和 Angular 开发中。

**这样做的好处：**

1. **减少模板代码**：将 `switch` 逻辑从 `.ts` 文件中抽离出来，使其成为可复用的函数。
    
2. **代码更具表现力**：`match(state, { ... })` 的写法比 `switch` 语句块更能体现“输入 -> 输出”的映射关系。
    
3. **极致的类型安全**：利用 TypeScript 的高级类型（泛型、映射类型、条件类型），我们确保了在编译时就能捕获到忘记处理的状态，并且在每个处理分支中都能获得正确的类型推断。
    

虽然这需要一些前期设置，但对于复杂的状态管理，这套模式能极大地提升代码的健壮性和可维护性。你甚至可以考虑将这些工具函数发布成一个内部的 npm 包，在团队中推广使用。
