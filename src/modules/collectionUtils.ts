export function distinct<T>(arr: T[], valToKey: (val: T) => string) {
    const map = new Map<string, T>();
    for (const value of arr) {
        map.set(valToKey(value), value);
    }

    return Array.from(map.values());
}
