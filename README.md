# drslib

Utility Library for Reflection Architecture

[Learn more about the architecture](https://gist.github.com/cocop/953ac9e9be10d5846705c873eb67d6fd)

```typescript
import * as drs from "drslib";

const action = new drs.Chain<number>()
    .join(new drs.Free((p: number) => "string"))
    .join(new drs.Free((p: string) => 0))
    .join(new drs.Free((p: number) => null))
    .create();

const result:null = action.do(0);
```


## Installation

```
npm install drslib
```

## License
[Apache License 2.0](https://github.com/cocop/drslib/blob/master/README.md)