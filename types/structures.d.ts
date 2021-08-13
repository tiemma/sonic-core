// eslint-disable-next-line import/prefer-default-export
export class Queue<T = any> {
    elements: T[];

    getElements(): T[];

    // eslint-disable-next-line no-unused-vars
    enqueue(node: T): void;

    dequeue(): T;

    isEmpty(): boolean;
}
