import sources from "../sources-config";
import { defer, from, empty, Observable } from "rxjs";
import {
  mergeMap,
  concat,
  delay,
  repeat,
  map,
  scan,
  filter,
  shareReplay,
  distinctUntilChanged
} from "rxjs/operators";
import {
  makeGqlDocumentFromGqlSources,
  GqlSources
} from "../graphql/create-schema";
import Source from "../sources";
import { print } from "graphql/language/printer";

const wait = (duration: number) => concat(empty().pipe(delay(duration)));

const getSchemaFromSource = (source: Source) =>
  defer(() => source.getSchemas()).pipe(
    map(schemaByNames => Object.values(schemaByNames).join("\n"))
  );

const sync$ = from(Object.entries(sources)).pipe(
  mergeMap(
    ([sourceName, source]) =>
      getSchemaFromSource(source).pipe(
        filter(schema => !!schema),
        map(schema => [sourceName, schema]),
        wait(5000) as any,
        repeat()
      ) as Observable<[string, string]>
  ),
  scan(
    (schemaBySources: GqlSources, [source, schema]: [string, string]) => ({
      ...schemaBySources,
      [source]: schema
    }),
    {}
  ),
  map(schemaBySource => makeGqlDocumentFromGqlSources(schemaBySource)),
  map(print),
  distinctUntilChanged(),
  shareReplay(1)
);

export default sync$;
