import { defer, empty, from, Observable, OperatorFunction } from "rxjs";
import {
    catchError,
    combineAll,
    concat,
    delay,
    map,
    repeat,
    shareReplay,
    startWith,
    // tslint:disable-next-line:no-submodule-imports
} from "rxjs/operators";
import sources from "../sources-config";

import { AgogosObjectConfig } from "./object-types";

export interface IAggObjsByName { [name: string]: AgogosObjectConfig }
export interface IAggObjByNameByKind { [kind: string]: IAggObjsByName }

const addSourceToName = (source: string, name: string): string =>
    `${source}.${name}`;
const renameKeys = (source: string, obj: IAggObjsByName): IAggObjsByName =>
    Object.keys(obj).reduce(
        (acc, key) => ({ ...acc, ...{ [addSourceToName(source, key)]: obj[key] } }),
        {}
    );
const renameSubKeys = (
    source: string,
    obj: IAggObjByNameByKind
): IAggObjByNameByKind =>
    Object.keys(obj).reduce(
        (acc, key) => ({ ...acc, [key]: renameKeys(source, obj[key]) }),
        {}
    );

const safeMergeProperty = (
    obj: IAggObjByNameByKind,
    key: string,
    value: IAggObjsByName
): IAggObjByNameByKind =>
    obj[key]
        ? { ...obj, [key]: { ...obj[key], ...value } }
        : { ...obj, [key]: value };
const safeMergeObjects = (
    o1: IAggObjByNameByKind,
    o2: IAggObjByNameByKind
): IAggObjByNameByKind =>
    Object.entries(o2).reduce(
        (acc, [key, value]) => safeMergeProperty(acc, key, value),
        o1
    );

const emitAndWait = (duration: number) => concat(empty().pipe(delay(duration)));

const gqlObjects$: Observable<IAggObjByNameByKind> = from(
    Object.entries(sources)
).pipe(
    map(([sourceName, source]) =>
        defer((): Promise<IAggObjByNameByKind> => source.getAgogosObjects()).pipe(
            map(sourceData => renameSubKeys(sourceName, sourceData)),
            emitAndWait(5000) as OperatorFunction<
                IAggObjByNameByKind,
                IAggObjByNameByKind
            >,
            catchError(err => {
                console.warn("Error getting schema from source", source, err);
                return empty();
            }),
            repeat(),
            // tslint:disable-next-line:no-object-literal-type-assertion
            startWith({} as IAggObjByNameByKind)
        )
    ),
    combineAll(),
    map(x => x.reduce((acc, next) => safeMergeObjects(acc, next)), {}),
    shareReplay(1)
);

export default gqlObjects$;
