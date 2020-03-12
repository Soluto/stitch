type DisposeFunction = () => Promise<void> | void;

export function beforeEachDispose(beforeEachFn: () => DisposeFunction | Promise<DisposeFunction>) {
    let dispose: DisposeFunction;

    beforeEach(async () => {
        dispose = await beforeEachFn();
    });

    afterEach(() => dispose && dispose());
}
