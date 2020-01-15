import {
    GraphQLService,
    SchemaChangeCallback,
    GraphQLServiceConfig,
    Unsubscriber,
    GraphQLRequestContext,
    GraphQLExecutionResult,
} from 'apollo-server-core';
import {Observable, BehaviorSubject, Subscription} from 'rxjs';
import {take, switchMap, shareReplay, skip} from 'rxjs/operators';

type ExecutorRequestContext<TContext> = GraphQLRequestContext<TContext> &
    Required<Pick<GraphQLRequestContext<TContext>, 'document' | 'operationName' | 'operation' | 'queryHash'>>;
type ValueOrPromise<T> = T | Promise<T>;

export class DelegatingGraphQLService implements GraphQLService {
    protected serviceConfigs: Observable<GraphQLServiceConfig>;
    protected serviceConfigsSubject?: BehaviorSubject<GraphQLServiceConfig>;
    protected subscription: Subscription = new Subscription();

    constructor(services: Observable<GraphQLService>) {
        this.serviceConfigs = services.pipe(
            switchMap(service => service.load({})),
            shareReplay(1)
        );
    }

    protected initSubject(config: GraphQLServiceConfig) {
        this.serviceConfigsSubject = new BehaviorSubject(config);
        this.subscription.add(this.serviceConfigs.pipe(skip(1)).subscribe(this.serviceConfigsSubject));
    }

    async load(_: any): Promise<GraphQLServiceConfig> {
        const config = await this.serviceConfigs.pipe(take(1)).toPromise();
        this.initSubject(config);

        return {
            schema: config.schema,
            executor: this.executor.bind(this),
        };
    }

    onSchemaChange(callback: SchemaChangeCallback): Unsubscriber {
        const subscription = this.serviceConfigs.subscribe(config => callback(config.schema));

        return subscription.unsubscribe.bind(subscription);
    }

    executor(requestContext: ExecutorRequestContext<any>): ValueOrPromise<GraphQLExecutionResult> {
        const config = this.serviceConfigsSubject?.value;

        if (typeof config === 'undefined') {
            throw new Error('This is not supposed to happen');
        }

        return config.executor(requestContext);
    }

    dispose() {
        this.subscription.unsubscribe();
    }
}
