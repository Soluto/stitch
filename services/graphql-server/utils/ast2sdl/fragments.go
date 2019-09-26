package ast2sdl

type fragmentClause struct {
	fragmentsToAdd []string
	addedFragments map[string]bool
}

// PushFragmentIfNotExists - checks if the fragment was already added to list of fragments and adds it if it wasn't
func (f *fragmentClause) PushFragmentIfNotExists(name string) {
	if addedToQuery, ok := f.addedFragments[name]; !ok || !addedToQuery {
		f.fragmentsToAdd = append(f.fragmentsToAdd, name)
	}
}

// PopFragment - returns first fragment if exists, otherwise returns nil
func (f *fragmentClause) PopFragment() (string, bool) {
	if len(f.fragmentsToAdd) == 0 {
		return "", false
	}

	fragmentName := f.fragmentsToAdd[0]
	f.addedFragments[fragmentName] = true
	f.fragmentsToAdd = f.fragmentsToAdd[1:]
	return fragmentName, true
}

func makeFragmentClause() fragmentClause {
	return fragmentClause{
		addedFragments: make(map[string]bool),
	}
}
