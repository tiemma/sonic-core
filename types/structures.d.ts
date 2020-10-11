import {Node} from "./graph-utils";

export = Queue;
declare class Queue {
    elements: Node[];
    enqueue(node: Node): void;
    dequeue(): Node;
    isEmpty(): boolean;
}
//# sourceMappingURL=structures.d.ts.map