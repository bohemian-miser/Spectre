declare class UnicodeRange {
    static REGEXP: RegExp;
    static parse(arr: string[]): number[];
    static stringify(arr: number[]): string[];
    private static rangeString;
}
export { UnicodeRange };
