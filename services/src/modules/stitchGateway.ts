import {Unsubscriber, GraphQLServiceConfig, SchemaChangeCallback} from 'apollo-server-core';
import {parse, execute} from 'graphql';
import {Observable, Subscription} from 'rxjs';
import {shareReplay, map, take, tap, catchError, skip} from 'rxjs/operators';

import {directiveMap} from './directives';
import {ResourceGroup, UpstreamClientCredentials, Upstream} from './resource-repository';
import {buildSchemaFromFederatedTypeDefs} from './buildFederatedSchema';
import * as baseSchema from './baseSchema';
import {ActiveDirectoryAuth} from './activeDirectoryAuth';
import {sdl as directivesSdl} from './directives';
import logger from './logger';

export function createStitchGateway(config: {resourceGroups: Observable<ResourceGroup>}) {
    let currentSchemaConfig: GraphQLServiceConfig | null = null;

    const subscription = new Subscription();
    const newSchemaConfigs = config.resourceGroups.pipe(
        tap(rg => logger.info({etag: rg.etag}, 'Loading new resources')),
        map(createSchemaConfig),
        catchError((error, obs) => {
            logger.error(error, 'Error creating schema config');
            return obs.pipe(skip(1));
        }),
        shareReplay(1)
    );
    const startListening = () =>
        newSchemaConfigs.subscribe((schemaConfig: GraphQLServiceConfig) => {
            currentSchemaConfig = schemaConfig;
            logger.info('New resources loaded');
        });

    return {
        async load(): Promise<GraphQLServiceConfig> {
            subscription.add(startListening());
            currentSchemaConfig = await newSchemaConfigs.pipe(take(1)).toPromise();

            return {
                schema: currentSchemaConfig.schema,
                executor(requestContext) {
                    return currentSchemaConfig!.executor(requestContext);
                },
            };
        },
        onSchemaChange(callback: SchemaChangeCallback): Unsubscriber {
            const sub = newSchemaConfigs.pipe(map(sc => sc.schema)).subscribe(callback);
            subscription.add(sub);

            return sub.unsubscribe.bind(sub);
        },
        dispose() {
            subscription.unsubscribe();
        },
    };
}

function createSchemaConfig(rg: ResourceGroup): GraphQLServiceConfig {
    const activeDirectoryAuth = new ActiveDirectoryAuth();
    const upstreamsByHost = new Map(rg.upstreams.map(u => [u.host, u]));
    const upstreamClientCredentialsByAuthority = new Map(
        rg.upstreamClientCredentials.map(u => [u.activeDirectory.authority, u])
    );

    const schema = buildSchemaFromFederatedTypeDefs({
        typeDefs: Object.fromEntries(
            rg.schemas.map(s => [`${s.metadata.namespace}/${s.metadata.name}`, parse(s.schema)])
        ),
        baseTypeDefs: baseSchema.baseTypeDef,
        directiveTypeDefs: directivesSdl,
        resolvers: baseSchema.resolvers,
        schemaDirectives: directiveMap,
    });

    return {
        schema,
        executor(requestContext) {
            requestContext.context.upstreams = upstreamsByHost;
            requestContext.context.upstreamClientCredentials = upstreamClientCredentialsByAuthority;
            requestContext.context.activeDirectoryAuth = activeDirectoryAuth;

            return execute({
                document: requestContext.document,
                schema: schema,
                contextValue: requestContext.context,
                operationName: requestContext.operationName ?? requestContext.request.operationName,
                variableValues: requestContext.request.variables,
            });
        },
    };
}

declare module './context' {
    interface RequestContext {
        upstreams: Map<string, Upstream>; // By host
        upstreamClientCredentials: Map<string, UpstreamClientCredentials>; // By authority
        activeDirectoryAuth: ActiveDirectoryAuth;
    }
}
