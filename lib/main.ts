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
export const ALPHABET_94 =
    `0123456789` +
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ` +
    `abcdefghijklmnopqrstuvwxyz` +
    `-_|~^>.!()*+,;=@:[]{}'$#?/%<&"\\\``;

export class BasekEncoding {
    private readonly _charToDigit: Uint8Array;
    private readonly _digitToChar: Uint8Array;
    private readonly _alphabet: string;

    constructor(alphabet: string) {
        if (typeof alphabet !== "string") {
            throw new TypeError("alphabet is not a string");
        }

        const charIndexes = new Map<number, number>();
        for (let i = 0; i < alphabet.length; ++i) {
            if (/\s/u.test(alphabet[i])) {
                throw new Error("alphabet contains whitespace");
            }

            const charCode = alphabet.charCodeAt(i);
            if (charCode > 127) {
                throw new Error(`alphabet has non-ASCII character '${alphabet[i]}'`);
            }

            if (charIndexes.has(charCode)) {
                throw new Error(`alphabet has repeated character '${alphabet[i]}'`);
            }

            charIndexes.set(charCode, i);
        }

        if (alphabet.length < 2) {
            throw new Error("alphabet has fewer than 2 characters");
        }

        const charToDigit = new Uint8Array(256);
        const digitToChar = new Uint8Array(256);

        for (let i = 0; i < charToDigit.length; ++i) {
            charToDigit[i] = 255;
        }

        for (const [char, index] of charIndexes.entries()) {
            digitToChar[index] = char;
            charToDigit[char] = index;
        }

        this._charToDigit = charToDigit;
        this._digitToChar = digitToChar;
        this._alphabet = alphabet;
    }

    get charToDigitMap(): Uint8Array {
        return this._charToDigit;
    }

    get digitToCharMap(): Uint8Array {
        return this._digitToChar;
    }

    get alphabet(): string {
        return this._alphabet;
    }

    get base(): number {
        return this._alphabet.length;
    }
}

export function encodeText(text: string, encoding: BasekEncoding | string): string {
    if (typeof text !== "string") {
        throw new TypeError("text is not a string");
    }

    return encode(textEncoder.encode(text), encoding);
}

export function decodeText(data: string, encoding: BasekEncoding | string): string {
    return textDecoder.decode(decode(data.replaceAll(/\s/gu, ""), encoding));
}

export function encode(
    data: Uint8Array | Uint8ClampedArray,
    encoding: BasekEncoding | string,
): string {
    if (!(data instanceof Uint8Array || data instanceof Uint8ClampedArray)) {
        throw new TypeError("data is not a Uint8Array or Uint8ClampedArray");
    }

    encoding = getEncoding(encoding);
    const base = encoding.base;
    const digitToChar = encoding.digitToCharMap;

    const placeValues = placeValueCache[base];
    const prefixDivisor = placeValues[1];
    const secondPrefixDivisor = placeValues[2];

    let encoded = new Uint8Array(Math.max(data.length, 2));
    let length = 0;

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
        encoded[i] = digitToChar[encoded[i]];
    }
    return textDecoder.decode(new Uint8Array(encoded.buffer, 0, length));
}

export function decode(data: string, encoding: BasekEncoding | string): Uint8Array {
    if (typeof data !== "string") {
        throw new TypeError("data is not a string");
    }

    encoding = getEncoding(encoding);
    const base = encoding.base;
    const charToDigit = encoding.charToDigitMap;

    const placeValues = placeValueCache[base];
    const prefixDivisor = placeValues[1];
    const secondPrefixDivisor = placeValues[2];

    let decoded = new Uint8Array(16);
    let length = 0;

    let lo = 0;
    let hi = placeValues[0] - 1;

    let encodedDigits = 0;
    let multIndex = 0;

    let emitMultiple = true;
    for (let i = 0; i < data.length; ) {
        const value = charToDigit[data.charCodeAt(i++)];
        if (value === 255) {
            throw new Error(`alphabet does not contain character '${data[i - 1]}'`);
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

function getEncoding(encoding: BasekEncoding | string): BasekEncoding {
    if (typeof encoding === "string") {
        if (encoding !== cachedEncoding.alphabet) {
            cachedEncoding = new BasekEncoding(encoding);
        }

        encoding = cachedEncoding;
    } else if (!(encoding instanceof BasekEncoding)) {
        throw new TypeError("encoding is not a BasekEncoding or string");
    }

    return encoding;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

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

let cachedEncoding = new BasekEncoding(ALPHABET_94.slice(0, 85));
