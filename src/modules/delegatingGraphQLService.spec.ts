import {from, Subject} from 'rxjs';
import {GraphQLService} from 'apollo-server-core';
import {DelegatingGraphQLService} from './delegatingGraphQLService';
import {GraphQLSchema} from 'graphql';

describe('DelegatingGraphQLService', () => {
    let service: DelegatingGraphQLService | undefined;

    afterEach(() => {
        service?.dispose();
    });

    it('Delegates load to provided service', async () => {
        const executor = jest.fn().mockResolvedValueOnce('executor result');
        const schema = new GraphQLSchema({query: null});

        const implementation = {
            load: jest.fn().mockResolvedValueOnce({executor, schema}),
            onSchemaChange: jest.fn(),
        };

        service = new DelegatingGraphQLService(from([implementation]));

        const loadResult = await service.load({});
        expect(implementation.load).toBeCalledTimes(1);
        expect(loadResult.schema).toBe(schema);
    });

    it('Delegates executor to provided services', async () => {
        const servicesSource = new Subject<GraphQLService>();
        service = new DelegatingGraphQLService(servicesSource);

        for (let i = 0; i < 5; i++) {
            const executor = jest.fn().mockResolvedValueOnce('executor result' + i);
            const schema = new GraphQLSchema({query: null});
            const implementation = {
                load: jest.fn().mockResolvedValueOnce({executor, schema, i: 1}),
                onSchemaChange: jest.fn(),
            };

            servicesSource.next(implementation);
            if (i === 0) {
                await service.load({});
            }

            await Promise.resolve(); // flush observables

            const executorInput = {} as any;
            const executorResult = await service.executor(executorInput);

            expect(executor).toBeCalledTimes(1);
            expect(executor).toBeCalledWith(executorInput);
            expect(executorResult).toBe('executor result' + i);
        }
    });
});
