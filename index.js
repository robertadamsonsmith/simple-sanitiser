
module.exports = sane;

module.exports.validate = validate;

const types = {};
module.exports.types = types;



/*********************
* Error handler
**********************/

class SaneError extends Error 
{
	constructor(type, message){
		super();
		this.type = type;
		this.message = message;
		this.value_stack = [];
	}

	toString(){

		var message = this.message;
		if(this.value_stack.length){
			let value_stack = this.value_stack.slice(0);
			value_stack.reverse;
			let label = value_stack.join('.');
			message = message.replace(':label', '"'+label+'"');
		}
		return message;
	}
}
sane.Error = SaneError;




/**********************
* Types
***********************/

class Tester
{
	constructor(value){
		this.value = value;
	}

	error(message)
	{
		throw new SaneError(this._type, message);
	}

	type(){} //ignore
	default(){} //ignore
	required(){} //ignore

	allow(arg){
		let allowed = false;
		if(Array.isArray(arg)){
			for(const value of arg){
				if(value === this.value){
					allowed = true;
					break;
				}
			}
		}
		else if(this.value === arg){
			allowed = true;
		}
		if(!allowed){
			this.error(":label is not an allowed value");
		}
	}
	disallow(arg){
		let disallowed = false;
		if(Array.isArray(arg)){
			for(const value of arg){
				if(value === this.value){
					disallow = true;
					break;
				}
			}
		}
		else if(arg === this.value){
			disallowed = true;
		}
		if(!allowed){
			this.error(":label is a disallowed value");
		}
	}
	custom(arg){
		arg.call(this);
	}
}
types.mixed = Tester;

class ForbiddenTester extends Tester
{
	constructor(...args){
		super(...args);
		this._type = 'forbidden';
		this.error(":label is forbidden");
	}
}
types.forbidden = ForbiddenTester;

class StringTester extends Tester
{
	constructor(...args){
		super(...args);
		this._type = 'string';
		if(typeof this.value !== 'string'){
			try{
				this.value = String(this.value);
			}
			catch(e){
				this.error(":label could not be converted to string");
			}
			if(typeof this.value !== 'string'){
				this.error(":label could not be converted to string");
			}
		}
	}
	lowercase(){this.value = this.value.toLowerCase()}
	uppercase(){this.value = this.value.toUpperCase()}
	trim(){this.value = this.value.trim()}
	replace(arg){this.value = this.value.replace(arg[0], arg[1])}
	truncate(arg){this.value = this.value.substr(0, arg)}
	max(arg){if(this.value.length>arg)this.error(":label is longer than "+arg+" characters")}
	min(arg){if(this.value.length<arg)this.error(":label is less than "+arg+" characters")}
	length(arg){if(this.value.length!==arg)this.error(":label is not "+arg+" characters long")}
	match(arg){if(!this.value.match(arg))this.error(":label does not match pattern")}
}
types.string = StringTester;

class RegExpTester extends StringTester
{
	constructor(...args){
		super(...args);
		this._type = 'regexp';
	}

	type(arg){
		if(!this.value.match(arg))
			this.error(":label does not match pattern");
	}
}
types.regexp = RegExpTester;

class IPTester extends StringTester
{
	constructor(...args){
		super(...args);
		this._type = 'ip';
		if(!this.value.match(/^(\\d{1, 2}|(0|1)\\d{2}|2[0-4]\\d|25[0-5])$/))
			this.error(":label is not a valid ip address")
	}
}
types.ip = IPTester;

class AlphanumericTester extends StringTester
{
	constructor(...args){
		super(...args);
		this._type = 'alphanumeric';
		if(!this.value.match(/^[a-zA-Z0-9]$/))
			this.error(":label is not numeric")	
	}
}
types.alphanumeric = AlphanumericTester;

class EmailTester extends StringTester
{
	constructor(...args){
		super(...args);
		this._type = 'email';
		if(!this.value.match(/^\S+@\S+\.\S+$/))
			this.error(":label is not a valid email address")
	}
}
types.email = EmailTester;

class HexTester extends StringTester
{
	constructor(...args){
		super(...args);
		this._type = 'hex';
		if(!this.value.match(/^0[xX][0-9a-fA-F]+$/))
			this.error(":label is not a hexadecimal value")
	}
}
types.hex = HexTester;

class TokenTester extends StringTester
{
	constructor(...args){
		super(...args);
		this._type = 'token';
		if(!this.value.match(/^[a-zA-Z0-9_]$/))
			this.error(":label is not a valid token")
	}
}
types.token = TokenTester;

class URLTester extends StringTester
{
	constructor(...args){
		super(...args);
		this._type = 'url';

		if(!this.value.match(/^https?:\/\/\w+(\.\w+)*(:[0-9]+)?\/?(\/[.\w]*)*$/))
			this.error(":label is not a valid url");
	}
}
types.url = URLTester;

class DateTester extends Tester
{
	constructor(...args){
		super(...args);
		this._type = 'date';
		this.value = Date.parse(this.value);
		if(Number.isNaN(this.value)){
			this.error(":label could not be converted to a date");
		}
	}

	after(arg){if(this.value - arg < 0)this.error(":label is after given date")}
	before(arg){if(this.value - arg > 0)this.error(":label is before given date")}
}
types.date = DateTester;

class ObjectTester extends Tester
{
	constructor(value, schema){

		super(value, schema);
		this._type = 'object';

		if(typeof value !== 'object' || value === null){
			this.error(':label is not an object');
		}

		let getter = value.get && typeof(value.get) == 'function';
		let strict = schema.strict;

		let arg = schema.type || {}; //TODO check...

		let output = {};

		//For each attribute
		let count = 0;
		for(let attrib in arg){
			count++;

			//Get attribute value from object, as attribute or via get function
			let v = getter?value.get(attrib):value[attrib];

			//Recurse, and add to output if not undefined (i.e. an optional value that isn't there)
			v = sane(v, arg[attrib], attrib);
			if(typeof v !== 'undefined'){
				output[attrib] = v;
			}
		}

		//If no attributes specified, then that means get all, so leave as is
		if(count == 0){
			return;
		}

		//If not strict == false, then add other items not in schema
		if(strict === false){
			for(let attrib in value){
				if(attrib in output)continue;
				output[attrib] = value[attrib];
			}
		}
		//If strict == throw, then throw an exception if there are other items
		else if(strict === 'throw'){
			for(let attrib in value){
				if(attrib in output)continue;
				this.error(':label contains unexpected "'+attrib+'"');
			}
		}

		//Store to value
		this.value = output;
	}

	strict(){}; //ignore
}
types.object = ObjectTester;


class ArrayTester extends Tester
{
	constructor(...args){
		super(...args);
		this._type = 'array';
		if(!Array.isArray(this.value)){
			this.error(':label is not an array');
		}
	}
	type(arg){
		let output = [];
		for(let i=0; i<this.value.length; ++i){
			const v = sane(this.value[i], arg, i);
			if(typeof v !== 'undefined'){
				output.push(v);
			}
		}
		this.value = output;
	}

	min(arg){if(this.value.length<arg)this.error(":label has less than "+arg+" items")}
	max(arg){if(this.value.length>arg)this.error(":label has more than "+arg+" items")}
}
types.array = ArrayTester;


class NumberTester extends Tester
{
	constructor(...args){
		super(...args);
		this._type = 'number';
		if(typeof this.value !== 'number'){

			this.value = Number.parseFloat(this.value);
			if(Number.isNaN(this.value)){
				this.error(":label could not be converted to a number");
			}
		}
	}
	precision(arg){this.value=this.value.toFixed(arg)}

	unsafe(){if(this.value<Number.MIN_SAFE_INTEGER||this.value>Number.MAX_SAFE_INTEGER)this.error(":label is outside of safe number range")}
	greater(arg){if(this.value<=arg)this.error(":label is not greater than "+arg)}
	less(arg){if(this.value>=arg)this.error(":label is not less than "+arg)}
	max(arg){if(this.value>arg)this.error(":label is greater than "+arg)}
	min(arg){if(this.value<arg)this.error(":label is less than "+arg)}
	multiple(arg){if(this.value%arg)this.error(":label is not multiple of "+arg)}

	positive(){if(this.value<=0)this.error(":label is not positive")}
	negative(){if(this.value>=0)this.error(":label is not negative")}
	port(){if(this.value<0||this.value>65535||(this.value%1))this.error(":label is outside of port range")}
}
types.number = NumberTester;

class IntegerTester extends NumberTester
{
	constructor(...args){
		super(...args);
		this._type = 'integer';
		this.value = Math.round(this.value);
	}
}
types.integer = IntegerTester;

class BooleanTester extends Tester
{
	constructor(...args){
		super(...args);
		this._type = 'boolean';
		switch(typeof(this.value)){
			case 'boolean':
				//do nothing!
			break;
			case 'string':
				this.value = this.value == '1' || this.value.toLowerCase() == 'true' || this.value.toLowerCase() == 'yes';
			break;
			case 'number':
				this.value !== 0;
			default:
				this.error(":label cannot be converted to a boolean value");
			break;
		}
		this.value = this.value ? true : false;
	}
}
types.boolean = BooleanTester;


/***********************
* Main function
************************/

function sane(value, type, label) 
{
	//If 'type' is a schema object, use it (otherwise it is just a type without schema)
	let schema = {};
	if(typeof type === 'object' && 'type' in type){
		schema = type;
		type = schema.type;
	}

	//Get the 'type' as a string, and for 'object'/'array', set schema as type
	switch(typeof type){
		case 'object':
			if(Array.isArray(type)){

				//If no items, then it is an array of 'any', otherwise child schema is first array item
				schema.type = (type.length == 1 ? type[0] : 'mixed');
				if(type.length > 1){
					throw "Schema array has more than 1 item";
				}
				type = 'array';
			}
			else if(type instanceof RegExp){
				schema.type = type;
				type = 'regexp';
			}
			else{
				schema.type = type;
				type = 'object';

				//an empty object, could be an array of 'any_object'? ...
			}
		break;
		case 'boolean':
			type = type ? 'mixed' : 'forbidden';
		break;
		case 'function': //String/Number/sane.Port etc.
			type = type.name.toLowerCase();
		break;
		case 'string': //'string'/'number'/'port' etc.
			//type = schema;
		break;
		case 'undefined':
		default:
			throw "Schema is undefined";
		break;
	}

	//Get the constructor
	var con = types[type];
	if(!con){
		throw '"'+type+'"'+" is not a known schema type";
	}

	//Get label from given, or in schema, or default to 'value'
	label = label || schema.label || 'value';

	//If value is undefined, or an empty string
	if(typeof value == "undefined" || value === null || value === ""){

		//If there is a default, return it
		if('default' in schema){
			if(typeof schema.default === 'function'){
				return schema.default();
			}
			else{
				return schema.default;
			}
		}
		//Else if it is optional, then return it
		else if(schema.required === false){
			return value;
		}
		//Else if type is an array, then value is an empty array
		else if(type == 'array'){
			value = [];
		}
		//Else throw
		else{
			throw new SaneError("undefined", '"'+label+'"'+" is missing");
		}
	}

	try{

		//Create tester (can throw)
		var tester = new con(value, schema);

		//Run each test (can throw)
		for(let attrib in schema){
			if(!(attrib in tester)){
				throw '"'+attrib+'" is not a valid function for type "'+type+'"';
			}
			tester[attrib](schema[attrib]);
		}

		//Return value
	    return tester.value;
	}
	catch(e){

		//If the error is a SaneError, and current label to stack (to help locate the issue)
		if(e instanceof SaneError){
			e.value_stack.push(label);
		}

		throw(e);
	}
}


function validate(obj, schema, name)
{
	try{
		sane(obj, schema, name);
	}
	catch(e){
		if(e instanceof SaneError){
			return e;
		}
		else{
			throw(e);
		}
	}

	return true;
}