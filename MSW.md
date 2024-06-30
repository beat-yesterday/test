## Integrate MSW into project
- install
- setup
- persist mock data
- structure handlers
- 

### Steps
```node
npx msw init ./public --save 
```

### Flow
- define data model type
- convert type to json schema
- generate mock data from json schema by faker
- return mock data with msw

#### Example
- [MSW + Faker](https://medium.com/admitad-tech/mocks-without-roadblocks-the-magic-of-mswjs-faker-js-306541458c2a)
- 