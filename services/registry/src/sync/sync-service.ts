import sources from "../sources-config";
import { defer, from, empty, Observable, OperatorFunction } from "rxjs";
import {
    concat,
    delay,
    repeat,
    map,
    scan,
    shareReplay,
    catchError,
    combineAll,
    startWith,
} from "rxjs/operators";

type GqlObjsByName = { [name: string]: any };
export type GqlObjByNameByKind = { [kind: string]: GqlObjsByName };
type GqlObjsByNameByKindBySource = { [source: string]: GqlObjByNameByKind };

const addSourceToName = (source: string, name: string): string => `${source}.${name}`;
const renameKeys = (source: string, obj: GqlObjsByName): GqlObjsByName => Object.keys(obj).reduce((acc, key) => ({ ...acc, ...{ [addSourceToName(source, key)]: obj[key] } }), {});
const renameSubKeys = (source: string, obj: GqlObjByNameByKind): GqlObjByNameByKind => Object.keys(obj).reduce((acc, key) => ({ ...acc, [key]: renameKeys(source, obj[key]) }), {});

const safeMergeProperty = (obj: GqlObjByNameByKind, key: string, value: GqlObjsByName): GqlObjByNameByKind => obj[key] ? ({ ...obj, [key]: { ...obj[key], ...value } }) : ({ ...obj, [key]: value });
const safeMergeObjects = (o1: GqlObjByNameByKind, o2: GqlObjByNameByKind): GqlObjByNameByKind => Object.entries(o2).reduce((acc, [key, value]) => safeMergeProperty(acc, key, value), o1);

const emitAndWait = (duration: number) => concat(empty().pipe(delay(duration)));

const gqlObjects$: Observable<GqlObjByNameByKind> =
    from(Object.entries(sources))
        .pipe(
            map(([sourceName, source]) =>
                defer((): Promise<GqlObjByNameByKind> => source.getGqlObjects())
                    .pipe(
                        map(sourceData => renameSubKeys(sourceName, sourceData)),
                        emitAndWait(5000) as OperatorFunction<GqlObjByNameByKind, GqlObjByNameByKind>,
                        catchError(err => {
                            console.warn("Error getting schema from source", source, err);
                            return empty();
                        }),
                        repeat(),
                        startWith({} as GqlObjByNameByKind)
                    )
            ),
            combineAll(),
            map(x => x.reduce((acc, next) => safeMergeObjects(acc, next)), {}),
            shareReplay(1),
        );

export default gqlObjects$;
