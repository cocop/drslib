# drslib

Utility Library for Reflection Architecture

~~[Click here for details of the architecture](https://gist.github.com/cocop/953ac9e9be10d5846705c873eb67d6fd)~~  
I'm writing explanation so wait a days

Supported typescript
```typescript
import * as drs from "drslib";

class Increment implements drs.IAction<number, number> {
    do(p: number) {
        return p + 1
    }
}

const action = new drs.Chain<number>()
    .join(new drs.Free((p: number) => p + "0"))
    .join(new drs.Free((p: string) => parseInt(p) + 1))
    .join(new Increment())
    .create();

const result: number = action.do(1); //result = 12
```


## Installation

```
npm install drslib
```

## License
[Apache License 2.0](https://github.com/cocop/drslib/blob/master/LICENSE)