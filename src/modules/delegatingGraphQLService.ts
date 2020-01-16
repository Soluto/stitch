import {
    GraphQLService,
    SchemaChangeCallback,
    GraphQLServiceConfig,
    Unsubscriber,
    GraphQLRequestContext,
    GraphQLExecutionResult,
} from 'apollo-server-core';
import {Observable, Subscription} from 'rxjs';
import {take, switchMap, shareReplay} from 'rxjs/operators';

type ExecutorRequestContext<TContext> = GraphQLRequestContext<TContext> &
    Required<Pick<GraphQLRequestContext<TContext>, 'document' | 'operationName' | 'operation' | 'queryHash'>>;
type ValueOrPromise<T> = T | Promise<T>;

/**
 * This implementation assumes the only source of schema updates is the `services` constructor param
 * In other words, if the underlying GraphQLService calls the onSchemaChange callback - we don't forward it on to the user of the delegator
 */
export class DelegatingGraphQLService implements GraphQLService {
    protected serviceConfigs: Observable<GraphQLServiceConfig>;
    protected config?: GraphQLServiceConfig;
    protected subscription: Subscription = new Subscription();

    constructor(services: Observable<GraphQLService>) {
        this.serviceConfigs = services.pipe(
            switchMap(service => service.load({})),
            shareReplay(1)
        );
        this.subscription.add(this.serviceConfigs.subscribe(next => (this.config = next)));
    }

    async load(_: any): Promise<GraphQLServiceConfig> {
        const config = await this.serviceConfigs.pipe(take(1)).toPromise();

        return {
            schema: config.schema,
            executor: this.executor.bind(this),
        };
    }

    onSchemaChange(callback: SchemaChangeCallback): Unsubscriber {
        const subscription = this.serviceConfigs.subscribe(config => callback(config.schema));
        this.subscription.add(subscription);

        return subscription.unsubscribe.bind(subscription);
    }

    executor(requestContext: ExecutorRequestContext<any>): ValueOrPromise<GraphQLExecutionResult> {
        if (typeof this.config === 'undefined') {
            throw new Error('This is not supposed to happen');
        }

        return this.config.executor(requestContext);
    }

    dispose() {
        this.subscription.unsubscribe();
    }
}
