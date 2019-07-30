import sources from "../sources-config";
import { defer, from, empty, Observable, OperatorFunction } from "rxjs";
import {
    concat,
    delay,
    repeat,
    map,
    shareReplay,
    catchError,
    combineAll,
    tap,
    startWith
} from "rxjs/operators";

import { AgogosObjectConfig } from "./object-types";

export type AggObjsByName = { [name: string]: AgogosObjectConfig };
export type AggObjByNameByKind = { [kind: string]: AggObjsByName };

const addSourceToName = (source: string, name: string): string =>
    `${source}.${name}`;
const renameKeys = (source: string, obj: AggObjsByName): AggObjsByName =>
    Object.keys(obj).reduce(
        (acc, key) => ({ ...acc, ...{ [addSourceToName(source, key)]: obj[key] } }),
        {}
    );
const renameSubKeys = (
    source: string,
    obj: AggObjByNameByKind
): AggObjByNameByKind =>
    Object.keys(obj).reduce(
        (acc, key) => ({ ...acc, [key]: renameKeys(source, obj[key]) }),
        {}
    );

const safeMergeProperty = (
    obj: AggObjByNameByKind,
    key: string,
    value: AggObjsByName
): AggObjByNameByKind =>
    obj[key]
        ? { ...obj, [key]: { ...obj[key], ...value } }
        : { ...obj, [key]: value };
const safeMergeObjects = (
    o1: AggObjByNameByKind,
    o2: AggObjByNameByKind
): AggObjByNameByKind =>
    Object.entries(o2).reduce(
        (acc, [key, value]) => safeMergeProperty(acc, key, value),
        o1
    );

const emitAndWait = (duration: number) => concat(empty().pipe(delay(duration)));

const gqlObjects$: Observable<AggObjByNameByKind> = from(
    Object.entries(sources)
).pipe(
    map(([sourceName, source]) =>
        defer((): Promise<AggObjByNameByKind> => source.getAgogosObjects()).pipe(
            map(sourceData => renameSubKeys(sourceName, sourceData)),
            emitAndWait(5000) as OperatorFunction<
                AggObjByNameByKind,
                AggObjByNameByKind
            >,
            catchError(err => {
                console.warn("Error getting schema from source", source, err);
                return empty();
            }),
            repeat(),
            startWith({} as AggObjByNameByKind)
        )
    ),
    combineAll(),
    map(x => x.reduce((acc, next) => safeMergeObjects(acc, next)), {}),
    shareReplay(1)
);

export default gqlObjects$;
