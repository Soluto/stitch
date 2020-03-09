import {Unsubscriber, GraphQLServiceConfig, SchemaChangeCallback} from 'apollo-server-core';
import {parse, execute} from 'graphql';
import {Observable, Subscription} from 'rxjs';
import {shareReplay, map, take, tap, catchError, skip} from 'rxjs/operators';

import {directiveMap} from './directives';
import {ResourceGroup} from './resource-repository';
import {buildSchemaFromFederatedTypeDefs} from './buildFederatedSchema';
import * as baseSchema from './baseSchema';
import {ActiveDirectoryAuth} from './auth/activeDirectoryAuth';
import {sdl as directivesSdl} from './directives';
import logger from './logger';
import {AuthenticationConfig} from './auth/types';

export function createGraphQLService(config: {resourceGroups: Observable<ResourceGroup>}) {
    let currentSchemaConfig: GraphQLServiceConfig | null = null;

    const subscription = new Subscription();
    const newSchemaConfigs = config.resourceGroups.pipe(
        tap(() => logger.info('Loading new resources')),
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

export function createSchemaConfig(rg: ResourceGroup): GraphQLServiceConfig {
    const activeDirectoryAuth = new ActiveDirectoryAuth();
    const upstreamsByHost = new Map(rg.upstreams.map(u => [u.host, u]));
    const upstreamClientCredentialsByAuthority = new Map(
        rg.upstreamClientCredentials.map(u => [u.activeDirectory.authority, u])
    );
    const schemas = rg.schemas.length === 0 ? [defaultSchema] : rg.schemas;

    const authenticationConfig: AuthenticationConfig = {
        getUpstreamByHost(host: string) {
            return upstreamsByHost.get(host);
        },
        getUpstreamClientCredentialsByAuthority(authority: string) {
            return upstreamClientCredentialsByAuthority.get(authority);
        },
        activeDirectoryAuth,
    };

    const schema = buildSchemaFromFederatedTypeDefs({
        typeDefs: Object.fromEntries(schemas.map(s => [`${s.metadata.namespace}/${s.metadata.name}`, parse(s.schema)])),
        baseTypeDefs: baseSchema.baseTypeDef,
        directiveTypeDefs: directivesSdl,
        resolvers: baseSchema.resolvers,
        schemaDirectives: directiveMap,
        schemaDirectivesContext: {authenticationConfig},
    });

    return {
        schema,
        executor(requestContext) {
            requestContext.context.authenticationConfig = authenticationConfig;

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

const defaultSchema = {
    metadata: {namespace: '__internal__', name: 'default'},
    schema: 'type Query { default: String! @stub(value: "default") }',
};

declare module './context' {
    interface RequestContext {
        authenticationConfig: AuthenticationConfig;
    }
}
