type Params = object;
type Value = any;

type RequestTransformer = (p:Params)=>Params
type ResponseTransformer = (p:Params, value: Value )=>Value
type Resolver = Handler

type Handler = (p:Params)=> [Value, Error]
type Middleware = (next: Handler) => Handler


function createValueResolver(resolver:Resolver) : Middleware {
	return (next)=> (p)=>{
        const [value, error] = resolver(p)
        return [{
            meta: {},
            value: {value}
        }, error]
    }
}

function createRequestTransformer(transformer: RequestTransformer) : Middleware {
	return (next)=>(p)=> next(transformer(p))
}

function createResponseTransformer(transformer: ResponseTransformer) : Middleware {
	return (next)=>(p)=> {
        const [{value, meta}, error] = next(p)
        return [transformer(p, {value, meta}), error]
    }
}