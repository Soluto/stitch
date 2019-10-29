package middlewares

type Identity struct{}

func (r Identity) Wrap(next Resolver) Resolver {
	return next
}
