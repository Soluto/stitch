import {distinctUntilChanged, filter, map, shareReplay} from 'rxjs/operators';
import {print} from 'graphql';
import gqlObjects$ from './sync-service';
import {stitchSchemas} from '../graphql/stitch';

const syncSchema$ = gqlObjects$.pipe(
    map(x => x.schemas),
    filter(a => a && Object.keys(a).length > 0),
    map(schemaBySource => stitchSchemas(schemaBySource)),
    map(print),
    distinctUntilChanged(),
    shareReplay(1)
);

export default syncSchema$;
