"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var UnicodeRange = /** @class */ (function () {
    function UnicodeRange() {
    }
    UnicodeRange.parse = function (arr) {
        var result = new Set();
        for (var _i = 0, arr_1 = arr; _i < arr_1.length; _i++) {
            var range = arr_1[_i];
            if (!UnicodeRange.REGEXP.test(range)) {
                throw new TypeError("\"" + range + "\" is invalid unicode-range.");
            }
            var _a = range.match(UnicodeRange.REGEXP), single = _a[1], start = _a[2], end = _a[3];
            // Single unicode-range (e.g. U+20, U+3F U+30??)
            if (single) {
                if (/\?[^?]+$/.test(single)) {
                    throw new TypeError("\"" + range + "\" is invalid unicode-range.");
                }
                if (single.includes('?')) {
                    var start_1 = single.replace(/\?/g, '0');
                    var end_1 = single.replace(/\?/g, 'F');
                    var tmp = UnicodeRange.parse(["U+" + start_1 + "-" + end_1]);
                    for (var _b = 0, tmp_1 = tmp; _b < tmp_1.length; _b++) {
                        var codePoint = tmp_1[_b];
                        result.add(codePoint);
                    }
                }
                else {
                    result.add(parseInt(single, 16));
                }
            }
            // Interval unicode-range (e.g. U+30-39)
            if (start && end) {
                var startCodePoint = parseInt(start, 16);
                var endCodePoint = parseInt(end, 16);
                for (var codePoint = startCodePoint; codePoint <= endCodePoint; codePoint++) {
                    result.add(codePoint);
                }
            }
        }
        return Array.from(result).sort(function (a, b) { return a - b; });
    };
    UnicodeRange.stringify = function (arr) {
        var sorted = Array.from(new Set(arr)).sort(function (a, b) { return a - b; });
        var results = [];
        var rangeStart;
        for (var idx = 0; idx < sorted.length; idx++) {
            var current = sorted[idx];
            var prev = sorted[idx - 1];
            if (rangeStart && current - prev !== 1) {
                results.push(UnicodeRange.rangeString(rangeStart, prev));
                rangeStart = current;
            }
            // First
            if (!rangeStart) {
                rangeStart = current;
            }
            // Last
            if (idx === sorted.length - 1) {
                if (rangeStart === current) {
                    results.push(UnicodeRange.rangeString(current));
                }
                else {
                    results.push(UnicodeRange.rangeString(rangeStart, current));
                }
            }
        }
        return results;
    };
    UnicodeRange.rangeString = function (start, end) {
        if (!end || start === end) {
            return "U+" + start.toString(16);
        }
        return "U+" + start.toString(16) + "-" + end.toString(16);
    };
    UnicodeRange.REGEXP = /^u\+(?:([0-9a-f]?[0-9a-f?]{1,5})|([0-9a-f]{1,6})-([0-9a-f]{1,6}))?$/i;
    return UnicodeRange;
}());
exports.UnicodeRange = UnicodeRange;
