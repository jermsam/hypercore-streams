class InstrumentedTransformStream extends TransformStream {
  static #stats = [];
  static #timerLastId = 0;

  constructor(transformer, writableStrategy = {}, readableStrategy = {}) {
    class InstrumentedTransformStreamController {
      #controller;
      #stat;

      constructor(controller, stat) {
        this.#controller = controller;
        this.#stat = stat;
      }

      get desiredSize() {
        return this.#controller.desiredSize;
      }

      enqueue(chunk) {
        if (!this.#stat.end) {
          this.#stat.end = performance.timeOrigin + performance.now();
        }
        return this.#controller.enqueue(chunk);
      }

      error(reason) {
        if (!this.#stat.end) {
          this.#stat.end = performance.timeOrigin + performance.now();
        }
        return this.#controller.error(reason);
      }

      terminate() {
        return this.#controller.terminate();
      }
    }

    if (!transformer) {
      transformer = {
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
      };
    }
    if (!transformer.transform) {
      transformer = Object.assign(
        {
          transform(chunk, controller) {
            controller.enqueue(chunk);
          },
        },
        transformer,
      );
    }
    const timerName =
      transformer.name ?? `timer-${InstrumentedTransformStream.#timerLastId++}`;
    const idProperty = transformer.chunkIdProperty ?? "timestamp";

    const instrumentedTransformer = Object.assign({}, transformer, {
      async transform(chunk, controller) {
        const chunkId = chunk?.[idProperty] ?? "__unidentified";
        let stats = InstrumentedTransformStream.#stats.find(
          (s) => s.id === chunkId,
        );
        if (!stats) {
          stats = {
            id: chunkId,
          };
          InstrumentedTransformStream.#stats.push(stats);
        }
        stats[timerName] = {
          start: performance.timeOrigin + performance.now(),
        };
        const instrumentedController =
          new InstrumentedTransformStreamController(
            controller,
            stats[timerName],
          );
        const res = await transformer.transform.apply(this, [
          chunk,
          instrumentedController,
        ]);

        // Transformation may not have called controller.enqueue
        if (!stats[timerName].end) {
          stats[timerName].end = performance.timeOrigin + performance.now();
        }
        return res;
      },

      setEndTime(chunkId) {
        const stats = InstrumentedTransformStream.#stats.find(
          (s) => s.id === chunkId,
        );
        if (!stats) {
          return;
        }
        stats[timerName].end = performance.timeOrigin + performance.now();
      },
    });

    super(instrumentedTransformer, writableStrategy, readableStrategy);
  }

  static collectStats() {
    return InstrumentedTransformStream.#stats;
  }

  static resetStats() {
    InstrumentedTransformStream.#stats = [];
  }
}

export default InstrumentedTransformStream;
