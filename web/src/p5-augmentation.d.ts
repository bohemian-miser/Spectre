import 'p5';

declare module 'p5' {
  interface Element {
    option(name: string, value?: string): void;
    changed(fx: (...args: any[]) => void): void;
    value(): string | number;
    value(val: string | number): Element;
    input(fx: (...args: any[]) => void): void;
    checked(): boolean;
    checked(val: boolean): Element;
    mousePressed(fx: (...args: any[]) => void): void;
  }
}
