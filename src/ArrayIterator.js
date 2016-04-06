class ArrayIterator {
    constructor(array) {
        this.array = array || [];
        this.index = -1;
    }

    current() {
        return this.array[this.index];
    }

    done() {
        return this.index >= this.array.length;
    }

    index() {
        return this.index;
    }

    prev() {
        this.index--;
    }

    next() {
        this.index++;
    }

    push(item) {
        this.array.push(item);
    }

    all() {
        return this.array;
    }
}

module.exports = ArrayIterator;