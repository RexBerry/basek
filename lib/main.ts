/*
Bad characters:
URL sub delimiters: !$&'()*+,;=
URL general delimiters: :/?#[]@
URL percent-encoding: %
Some strings: '${}
XML: <&
Strings: "\
Markdown code blocks: `

Printable ASCII characters:
!"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~
*/
export const CHARSET_94 =
    `0123456789` +
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ` +
    `abcdefghijklmnopqrstuvwxyz` +
    `-_|~^>.!()*+,;=@:[]{}'$#?/%<&"\\\``;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
let cachedCharset = "";
const cachedCharsetDigitToChar = new Uint8Array(256);
const cachedCharsetCharToDigit = new Uint8Array(256);

const placeValueCache: number[][] = [[], []];
for (let base = 2; base <= 255; ++base) {
    let placeValue = 1;
    const placeValues = [placeValue];
    while (base * placeValue <= (Number.MAX_SAFE_INTEGER + 1) / 256) {
        placeValue *= base;
        placeValues.push(placeValue);
    }
    placeValues.reverse();
    placeValueCache.push(placeValues);
}

function cacheCharset(charset: string) {
    if (charset === cachedCharset) {
        return;
    }

    if (typeof charset !== "string") {
        throw new TypeError("charset is not a string");
    }

    const charIndexes = new Map<number, number>();
    for (let i = 0; i < charset.length; ++i) {
        if (/\s/u.test(charset[i])) {
            throw new Error("charset contains whitespace");
        }

        const charCode = charset.charCodeAt(i);
        if (charCode > 127) {
            throw new Error(`charset has non-ASCII character '${charset[i]}'`);
        }

        if (charIndexes.has(charCode)) {
            throw new Error(`charset has repeated character '${charset[i]}'`);
        }

        charIndexes.set(charCode, i);
    }

    if (charset.length < 2) {
        throw new Error("charset has fewer than 2 characters");
    }

    cachedCharset = "";

    for (let i = 0; i < cachedCharsetCharToDigit.length; ++i) {
        cachedCharsetCharToDigit[i] = 255;
    }

    for (const [char, index] of charIndexes.entries()) {
        cachedCharsetDigitToChar[index] = char;
        cachedCharsetCharToDigit[char] = index;
    }

    cachedCharset = charset;
}

export function encode(data: Uint8Array | Uint8ClampedArray, charset: string): string {
    if (!(data instanceof Uint8Array || data instanceof Uint8ClampedArray)) {
        throw new TypeError("data is not a Uint8Array or Uint8ClampedArray");
    }

    cacheCharset(charset);
    const base = charset.length;

    let encoded = new Uint8Array(Math.max(data.length, 2));
    let length = 0;

    const placeValues = placeValueCache[base];
    const prefixDivisor = placeValues[1];
    const secondPrefixDivisor = placeValues[2];

    let lo = 0;
    let hi = placeValues[0] - 1;
    let deferredCount = 0;
    let deferredLoPrefix = 0;

    for (const byte of data) {
        const diff = hi + 1 - lo;
        const delta = byte * diff;
        hi = lo + (Math.ceil((delta + diff) / 256) - 1);
        lo += Math.ceil(delta / 256);

        while (true) {
            const loPrefix = Math.floor(lo / prefixDivisor);
            const hiPrefix = Math.floor(hi / prefixDivisor);

            if (loPrefix !== hiPrefix) {
                if (hiPrefix - loPrefix !== 1) {
                    break;
                }

                const loSecondPrefix = Math.floor(lo / secondPrefixDivisor);
                const hiSecondPrefix = Math.floor(hi / secondPrefixDivisor);

                if (hiSecondPrefix - loSecondPrefix !== 1) {
                    break;
                }

                lo = loPrefix * prefixDivisor + (lo % secondPrefixDivisor) * base;
                hi =
                    hiPrefix * prefixDivisor +
                    (hi % secondPrefixDivisor) * base +
                    (base - 1);

                ++deferredCount;
                deferredLoPrefix = loPrefix;
                break;
            }

            encoded = emit(encoded, loPrefix, length++);
            if (deferredCount > 0) {
                const deferredValue = loPrefix === deferredLoPrefix ? base - 1 : 0;
                for (; deferredCount > 0; --deferredCount) {
                    encoded = emit(encoded, deferredValue, length++);
                }
            }

            lo = (lo % prefixDivisor) * base;
            hi = (hi % prefixDivisor) * base + (base - 1);
        }
    }

    if (deferredCount > 0) {
        const hiPrefix = Math.floor(hi / prefixDivisor);
        encoded = emit(encoded, hiPrefix, length++);
        while (deferredCount-- > 0) {
            encoded = emit(encoded, 0, length++);
        }

        lo = (lo % prefixDivisor) * base;
        hi = (hi % prefixDivisor) * base + (base - 1);
    }

    while (true) {
        if (lo === 0 && hi === placeValues[0] - 1) {
            encoded = emit(encoded, 0, length++);
            break;
        }

        const loPrefix = Math.floor(lo / prefixDivisor);
        const hiPrefix = Math.floor(hi / prefixDivisor);

        if (hiPrefix - loPrefix > 1) {
            encoded = emit(encoded, loPrefix + 1, length++);
            break;
        }

        encoded = emit(encoded, hiPrefix, length++);
        if (loPrefix < hiPrefix) {
            lo = 0;
        } else {
            lo = (lo % prefixDivisor) * base;
        }
        hi = (hi % prefixDivisor) * base + (base - 1);
    }

    for (let i = 0; i < length; ++i) {
        encoded[i] = cachedCharsetDigitToChar[encoded[i]];
    }
    return textDecoder.decode(new Uint8Array(encoded.buffer, 0, length));
}

export function decode(data: string, charset: string): Uint8Array {
    if (typeof data !== "string") {
        throw new TypeError("data is not a string");
    }

    cacheCharset(charset);
    const base = charset.length;

    let decoded = new Uint8Array(16);
    let length = 0;

    const placeValues = placeValueCache[base];
    const prefixDivisor = placeValues[1];
    const secondPrefixDivisor = placeValues[2];

    let lo = 0;
    let hi = placeValues[0] - 1;

    let encodedDigits = 0;
    let multIndex = 0;

    let emitMultiple = true;
    for (let i = 0; i < data.length; ) {
        const value = cachedCharsetCharToDigit[data.charCodeAt(i++)];
        if (value === 255) {
            throw new Error(`charset does not contain character '${data[i - 1]}'`);
        }

        encodedDigits += placeValues[++multIndex] * value;

        if (i === data.length) {
            if (value === 0) {
                break;
            }

            emitMultiple = false;
        }

        while (true) {
            const encodedHi = encodedDigits + (placeValues[multIndex] - 1);

            const diff = hi + 1 - lo;
            const byte = Math.floor(((encodedDigits - lo) * 256) / diff);
            const maxByte = Math.floor(((encodedHi - lo) * 256) / diff);
            if (maxByte !== byte) {
                break;
            }

            decoded = emit(decoded, byte, length++);
            if (!emitMultiple) {
                break;
            }

            const delta = byte * diff;
            hi = lo + (Math.ceil((delta + diff) / 256) - 1);
            lo += Math.ceil(delta / 256);

            while (true) {
                const loPrefix = Math.floor(lo / prefixDivisor);
                const hiPrefix = Math.floor(hi / prefixDivisor);

                if (loPrefix !== hiPrefix) {
                    if (hiPrefix - loPrefix !== 1) {
                        break;
                    }

                    const loSecondPrefix = Math.floor(lo / secondPrefixDivisor);
                    const hiSecondPrefix = Math.floor(hi / secondPrefixDivisor);

                    if (hiSecondPrefix - loSecondPrefix !== 1) {
                        break;
                    }

                    lo = loPrefix * prefixDivisor + (lo % secondPrefixDivisor) * base;
                    hi =
                        hiPrefix * prefixDivisor +
                        (hi % secondPrefixDivisor) * base +
                        (base - 1);

                    encodedDigits =
                        encodedDigits -
                        (encodedDigits % prefixDivisor) +
                        (encodedDigits % secondPrefixDivisor) * base;
                    --multIndex;
                    break;
                }

                lo = (lo % prefixDivisor) * base;
                hi = (hi % prefixDivisor) * base + (base - 1);

                encodedDigits = (encodedDigits % prefixDivisor) * base;
                --multIndex;
            }
        }
    }

    const result = new Uint8Array(length);
    result.set(new Uint8Array(decoded.buffer, 0, length));
    return result;
}

export function encodeText(text: string, charset: string): string {
    if (typeof text !== "string") {
        throw new TypeError("text is not a string");
    }

    return encode(textEncoder.encode(text), charset);
}

export function decodeText(data: string, charset: string): string {
    return textDecoder.decode(decode(data.replaceAll(/\s/gu, ""), charset));
}

function emit(data: Uint8Array, value: number, index: number): Uint8Array {
    if (index === data.length) {
        const newLength = index + (index >> 1);
        const newData = new Uint8Array(newLength);
        newData.set(data);
        data = newData;
    }

    data[index] = value;
    return data;
}
