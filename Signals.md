
#### Types
- `Writable`
- `Read-only`
	- Computed signal

#### Difference between `set` and `update`
- `set` sets a new value
- `update` can compute a value from previous one
```ts
count.set(3);

count.update(value => value + 1);
```

#### Dynamic dependencies

#### Effect()
- By default, you can only create an `effect()` within an injection context.
- To create an effect outside of the constructor, you can pass an `Injector` to `effect` via its options
```ts
	...
	constructor(private injector: Injector) {}
	initializeEffect(): void {
		effect(() => {
			// handle effect
		}, {injector: this.injector})
	}
	...
```

#### Equality function
```ts
import _ from 'lodash';

const data = signal(['test'], { equal: _.isEqual});

// won't trigger any updates
data.set(['test']);
```


#### state management
- [Link](https://medium.com/@eugeniyoz/application-state-management-with-angular-signals-b9c8b3a3afd7)
- Computed can be used as state and selector
- [Effect](https://gist.github.com/e-oz/62fed6d626df5fab5e34402b5f6ec06e)

#### watcher function
- `effect` and `template`
- cannot detect reactivity graph dependencies inside asynchronous calls