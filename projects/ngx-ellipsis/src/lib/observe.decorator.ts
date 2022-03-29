import { BehaviorSubject, Observable } from 'rxjs';
import { map, skipWhile } from 'rxjs/operators';

/**
 * Observe creates an Observable stream and notifies the changes from an observed property.
 *
 * @example
 * Input() foo: string;
 * @Observe('foo') foo$: Observable<string>;
 */
export function Observe<T>(observedKey: string): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Object, key: string | symbol): void => {
    const subjects = new WeakMap<Record<string, unknown>, BehaviorSubject<T | undefined>>();

    const getSubject = (instance: Record<string, unknown>) => {
      if (!subjects.has(instance)) {
        subjects.set(instance, new BehaviorSubject<T | undefined>(undefined));
      }
      return subjects.get(instance) || new BehaviorSubject<T | undefined>(undefined);
    };

    Object.defineProperty(target, key, {
      get(): Observable<T> {
        return getSubject(this).pipe(
          // An initial `undefined` value is triggered above when initializing the subject for a given instance.
          // This skips the initial `undefined` values, until a defined value is provided. Then, no values
          // are removed from the stream.
          skipWhile((value) => value === undefined),
          map((value) => value as T) // required for TS null check
        );
      }
    });

    Object.defineProperty(target, observedKey, {
      get(): T | undefined {
        return getSubject(this).getValue();
      },
      set(instanceNewValue: T): void {
        getSubject(this).next(instanceNewValue);
      }
    });
  };
}
