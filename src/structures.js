class Queue {
  constructor() {
    this.elements = [];
  }

  getElements() {
    return this.elements;
  }

  enqueue(node) {
    this.elements.push(node);
  }

  dequeue() {
    return this.elements.shift();
  }

  isEmpty() {
    return this.elements.length === 0;
  }
}

module.exports = Queue;
