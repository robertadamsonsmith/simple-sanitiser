# simple-sanitiser
Simple sanitiser for user input that requires as little code to write as possible, makes sense, and runs quickly. Every other input sanitiser I could find was too verbose, so wrote one in the style of Mongoose (the MongoDB ORM). It is extremely straight forward to use, fast, and requires very little typing

This is a simple example:

```js
const sane = require('simple-sanitiser')
let input = "55"
let value = sane(input, Number)
```
The first parameter is the value to be sanitised, and the second value describes how the value should be

If the value cannot be sanitised or coerced appropriately, then an assertion will be thrown describing the failure 

Types can be:

'string' or String
'regexp' or RegExp
'ip'
'alphanumeric'
'email'
'hex'
'token'
'url'
'date' or Date
'number' or Number
'integer'
'boolean' or Boolean

Complex types can be:

'object' or { ... }
'array' or [ ... ]



This is a more complex example:
```js
const sane = require('simple-sanitiser')

let {email, password, password_confirm, redirect} = sane(ctx.request.body, {
	email:'email',
	password:String,
	password_confirm:String,
	redirect:{type:String, required:false},
});
```
In this case an object is being sanitised, and the sanitisation process recurses to each of the named attributes which must be present, unless explicitly set to not required