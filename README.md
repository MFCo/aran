# Aran <img src="aran.png" align="right" alt="aran-logo" title="Aran Linvail"/>

Aran is a npm module for facilitating the development of JavaScript dynamic analysis tools. Aran is based on a source-to-source code transformation fully compatible with ECMAScript5 specification (see http://www.ecma-international.org/ecma-262/5.1/) and enable amongst other things: sandboxing, tracing and symbolic execution. To install it, simply run: `npm install aran`.

**Attention, Aran uses ECMAScript6 Harmony Proxies which is currently supported by Node (with the `--harmony` flag) and Firefox; this module will NOT work on Safari, Chrome and Internet Explorer!!!**

This module exposes a function that expects three arguments:

* `sandbox`: a value used as the global object for evaluating the code to be analyzed.
* `hooks`: a set of functions used for tracing purposes.
* `traps`: a set of functions for modifying most of JavaScript semantic.

And returns a function that will perform the dynamic analysis on any given code string.

```javascript
var Aran = require('aran');
var sandbox = ...       // An object to mock the global object
var hooks = ...         // An object containings function for tracing purpose
var traps = ...         // An object containings function for intercepting runtime values
var run = Aran(sandbox, hooks, traps)
var input = {code:...}
var result = run(input)
console.log(input.compiled)
console.log(result)
```

Note that JavaScript features dynamic code evaluation through the infamous `eval` function and the `Function` constructor. Consequently, as shown in the above snippet, Aran has to be run along the code being analyzed to intercept and transform every bit of JavaScript code. Having application code evaluated without resorting to `Aran` will compromise the validity of the application's analysis. It is the responsibility of the user to make sure that dynamic code evaluation eventually resort to `Aran`.

## Demonstration

Download the files `demo/demo.html` and `demo/bundle.js` and put them into the same directory. Then simply open `demo.html` with a recent version of Firefox. 
<img src="demo.png" align="center" alt="demo" title="Demonstration"/>

## Sandbox

As stated above, the sandbox parameter will act in all point as if it was the global object of the code being analyzed. The difficulty of coming up with a suitable sandbox for complex analysis such as dynamic symbolic execution is not to be underestimated. If the traps `has`, `get`, `set` and `delete` are implemented, the sandbox parameter can be of any type, otherwise should probably be a JavaScript object.

Two sandbox properties have a particular status:
  * `eval`: letting the target code accessing the original `eval` function enable direct eval call, any other value will prevent the target to perform direct eval call.
  * `undefined`: hidding merely prevent the target code to access the `undefined` value with an identifier named `'undefined'`, if you want to catch all appearance of the `undefined` value you should use `traps.undefined` instead.

## Hooks

Hooks are functions that are called before executing statements and expressions. Hooks follow the AST types described in https://github.com/lachrist/esvisit and will recieved the corresponding syntactic information. All hooks are optional. 

## Traps

Unlike hooks, traps are designed to modify the semantic of the code being analyzed. They are useful for implementing shadow execution and, in general, any dynamic analysis that requires runtime values. Traps have been designed to provide a minimal interface for piloting JavaScript semantic. That is that many non-fundamental JavaScript statements / expressions of such as `x++` have been destructed to be expressed with simpler concepts. All traps are optional. Traps are listed in the table below, traps arguments that start with a capital letters are raw (unintercepted) value, while traps arguments that start with a lower case letter are intercepted values.

 Trap | Target | Transformed
:-----|:-------|:-----------
`primitive(Value)` | `'foo'` | `aran.traps.primitive('foo')`
`undefined(Cause)` | `return` | `return aran.traps.undefined('empty-return')`
`object(Object)` | `{a:x}` | `aran.traps.object({a:x})`
`array(Array)` | `[x,y,z]` | `aran.traps.array([x,y,z])`
`arguments(Arguments)` | `function () {}` | `aran.traps.function(function () { arguments = aran.traps.arguments(arguments) })`
`function(Function)` | `function () {}` | `aran.traps.function(function () { arguments = aran.traps.arguments(arguments) })`
`regexp(Pattern, Flags)` | `/abc/g` | `aran.traps.regexp("abc", "g")`
`booleanize(value, Cause)` | `x?:y:z` | `aran.traps.booleanize(x, '?:')?y:z`
`stringify(value)` | `eval(x)` | `eval(aran.compile(aran.traps.stringify(x)))`
`throw(exception)` | `throw x` | `throw aran.traps.throw(x)`
`catch([E/e]xception)` | `try {} catch (e) {}` | `try {} catch (e) { e = aran.traps.catch(e) }`
`unary(Operator, argument)` | `!x` | `aran.traps.unary('!', x)`
`binary(Operator, left, right)` | `x+y` | `aran.traps.binary('+', x, y)`
`apply(function, this, Arguments)` | `f(x, y)` | `aran.traps.apply(f, undefined, [x,y])`
`new(function, Arguments)` | `new F(x, y)` | `aran.traps.new(F, [x,y])`
`get(object, [P/p]roperty)` | `o[k]` | `aran.traps.get(o, k)`
`set(object, [P/p]roperty)` | `o[k] = v` | `aran.traps.set(o, k, v)`
`delete(object, [P/p]roperty)` | `delete o[k]` | `aran.traps.delete(o, k)`
`enumerate(object)` | `for ... in` | Its complicated...
`exist(object, Property)` | Its complicated... | Its complicated...
`erase(Identifier, Result)` | `delete x` | `aran.traps.erase('x', delete x)`

### Remarks

* `primitive`: primitive creation arise on the following literals:
    * `null`
    * `false`
    * `true`
    * numbers
    * strings

* `undefined`: valid `Cause` parameters are:
    * `'empty-return'`: return statement without argument.
    * `'no-return'`: function ending without any return statement.
    * `'argument-ID'`: `ID` is the name of the argument being undefined.
    * `'variable-ID'`: `ID` is the name of the variable being undefined.
    * `identifier`: identifier named `'undefined'` accessing the `undefined` value.

* `object`: guaranteed to contain plan data field whose values have been recursively intercepted. In particular, inline accessors (see: http://www.ecma-international.org/ecma-262/5.1/#sec-11.1.5) have been deplaced to a call to `Object.defineProperties`.

* `array`: elements have been intercepted.

* `booleanize`: valid `Cause` parameters are:
    * `'if'`
    * `'if-else'`
    * `'while'`
    * `'do-while'`
    * `'for'`
    * `'?:'`

* `stringify`: only used to perform direct call to `eval` as defined in http://www.ecma-international.org/ecma-262/5.1/#sec-15.1.2.1.1.

* `unary`: valid `Operator` are:
    * `'-'`
    * `'+'`
    * `'!'`
    * `'~'`
    * `'typeof'`
    * `'void'`

* `binary`: valid `Operator` are:
    * `'=='`
    * `'!='`
    * `'===`
    * `'!=='`
    * `'<'`
    * `'<='`
    * `'>'`
    * `'>='`
    * `'<<'`
    * `'>>'`
    * `'>>>'`
    * `'+'`
    * `'-'`
    * `'*'`
    * `'/'`
    * `'%'`
    * `'|'`
    * `'^'`
    * `'&'`
    * `'in'`
    * `'instanceof'`
    * `'..'`

* `get`, `set`, `delete`: The `property` parameter can either be:
    * A raw string if it came from a static property access (e.g. `o.a`).
    * A wrapped value if it came from a computed member expression (e.g. `o["a"]`).

* `exist`: triggered when scope lookup hits a `with` statement or the global object. The value returned by this trap should indcate whether the identifier exists in the environment-object. In the case of a `with` statement, a false value will make the lookup propagate to the enclosing scope. In the case of the global object, a false value will trigger a reference error.


### Precision concerning JavaScript

You are free to return the value you want from trap calls, however be aware that doing so carelessly will most likely result into a modification of JavaScript semantic. For instance you are free to say that `1+1 = 11` (JCVD was right after all) but the target program will not behave the same after instrumentation. For those of you who want to stick close to JavaScript semantic here is a list of things to keep in mind when implementing traps:

* `object`: object literals verify below assertions:

    ```javascript
    var o = {a:1}
    assert(Object.getPrototypeOf(o) === Object.prototype);
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(o, 'a')) === '{"value":1,"writable":true,"enumerable":true,"configurable":true}')
    ```

* `array`: array literals verify below assertions:

    ```javascript
    var xs = [1,2,3];
    assert(Object.getPrototypeOf(xs) === Array.prototype);
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(xs, 1)) === '{"value":2,"writable":true,"enumerable":true,"configurable":true}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(xs, 'length')) === '{"value":3,"writable":true,"enumerable":false,"configurable":false}');
    ```

    N.B.: The `length` property of JavaScript arrays has a special behavior described in http://www.ecma-international.org/ecma-262/5.1/#sec-15.4.

* `arguments`: pure data objects whose keys are numbers ; arguments objects verify the below assertions:

   ```javascript
   function f (x1, x2) {
     assert(Object.getPrototypeOf(arguments) === Object.prototype);
     assert(arguments.callee === f);
     assert(JSON.stringify(Object.getOwnPropertyDescriptor(arguments, 'callee')) === '{"writable":true,"enumerable":false,"configurable":true}');
     assert(JSON.stringify(Object.getOwnPropertyDescriptor(arguments, 'length')) === '{"value":5,"writable":true,"enumerable":false,"configurable":true}');
     assert(JSON.stringify(Object.getOwnPropertyDescriptor(arguments, 1)) === '{"value":12,"writable":true,"enumerable":true,"configurable":true}');
   }
   f(11,12,13,14,15);
   ```

   N.B.: The `arguments` object points to the same locations as the ones pointed by the formal parameters ; changing the value of a formal parameter also change the value of the corresponding argument's number field. Consequently, if `traps.undefined` is implemented, undefined arguments will be updated.  The behaviors described above do not hold in strict mode (which is ignored by Aran anyway).

* `function`: function literals verify below assertions:

    ```javascript
    var f = function (x, y, z) { return x+y+z };
    assert(Object.getPrototypeOf(f) === Function.prototype);
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(f, 'length')) === '{"value":3,"writable":false,"enumerable":false,"configurable":false}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(f, 'prototype')) === '{"value":{},"writable":true,"enumerable":false,"configurable":false}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(f.prototype, 'constructor')) === '{"writable":true,"enumerable":false,"configurable":true}');
    assert(f.prototype.constructor === f);
    ```

* `regexp`: regular expression literals verify below assertions:

    ```javascript
    var r = /abc/gi;
    assert(Object.getPrototypeOf(r) === RegExp.prototype);
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(r, 'global')) === '{"value":true,"writable":false,"enumerable":false,"configurable":false}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(r, 'ignoreCase')) === '{"value":true,"writable":false,"enumerable":false,"configurable":false}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(r, 'multiline')) === '{"value":false,"writable":false,"enumerable":false,"configurable":false}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(r, 'lastIndex')) === '{"value":0,"writable":true,"enumerable":false,"configurable":false}');
    ```

## ToDo

* Support strict mode (currently being ignored).
* Support last valued expression e.g.: `eval('if (true) 1; else 2;')`.
* Statically optimize traps insertion (for now traps existence are checked during compilation while they could be checked only once).
