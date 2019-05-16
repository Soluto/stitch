import sources from "../sources-config";
import { defer, from, empty, Observable } from "rxjs";
import {
  mergeMap,
  concat,
  delay,
  repeat,
  map,
  scan,
  shareReplay,
  distinctUntilChanged,
  tap,
  filter,
  catchError,
  combineAll
} from "rxjs/operators";
import {
  makeGqlDocumentFromGqlSources,
  GqlSources
} from "../graphql/create-schema";
import { print } from "graphql/language/printer";

const emitAndWait = (duration: number) => concat(empty().pipe(delay(duration)));

export const schemas$: Observable<GqlSources> = from(
  Object.entries(sources)
).pipe(
  map(([sourceName, source]) =>
    defer(() => source.getSchemas()).pipe(
      mergeMap(schemaByName => from(Object.entries(schemaByName))),
      map(([name, schema]) => [`${sourceName}.${name}`, schema]),
      emitAndWait(5000) as any,
      catchError(err => {
        console.warn("Error getting schema from source", source, err);
        return empty();
      }),
      repeat(),
      scan(
        (schemaBySources: GqlSources, [source, schema]: [string, string]) =>
          ({
            ...schemaBySources,
            [source]: schema
          } as GqlSources),
        {}
      )
    )
  ),
  combineAll(),
  map(schemas => schemas.reduce((acc, next) => ({ ...acc, ...next }))),
  shareReplay(1)
);

const sync$ = schemas$.pipe(
  map(schemaBySource => makeGqlDocumentFromGqlSources(schemaBySource)),
  map(print),
  distinctUntilChanged(),
  shareReplay(1)
);

export default sync$;
