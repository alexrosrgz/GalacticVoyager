export class ObjectPool {
  constructor(factory, resetFn, initialSize = 20) {
    this.factory = factory;
    this.resetFn = resetFn;
    this.pool = [];

    for (let i = 0; i < initialSize; i++) {
      this.pool.push({ active: false, obj: this.factory() });
    }
  }

  acquire() {
    let entry = this.pool.find(e => !e.active);
    if (!entry) {
      entry = { active: false, obj: this.factory() };
      this.pool.push(entry);
    }
    entry.active = true;
    return entry.obj;
  }

  release(obj) {
    const entry = this.pool.find(e => e.obj === obj);
    if (entry) {
      entry.active = false;
      this.resetFn(entry.obj);
    }
  }

  forEach(fn) {
    for (const entry of this.pool) {
      if (entry.active) {
        fn(entry.obj);
      }
    }
  }

  getActive() {
    const result = [];
    for (const entry of this.pool) {
      if (entry.active) result.push(entry.obj);
    }
    return result;
  }
}
