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
/**
 * An alphabet that may be convenient to use.
 * This value should never change between versions of this library.
 * @example
 * ```
 * const base85Encoding = new BasekEncoding(ALPHABET_94.slice(0, 85));
 * ```
 */
export const ALPHABET_94 =
    `0123456789` +
    `ABCDEFGHIJKLMNOPQRSTUVWXYZ` +
    `abcdefghijklmnopqrstuvwxyz` +
    `-_|~^>.!()*+,;=@:[]{}'$#?/%<&"\\\``;

/**
 * An encoding consisting of an alphabet
 * that can be used with Basek encode and decode functions.
 */
export class BasekEncoding {
    /**
     * A mapping from the ASCII value of a character in the alphabet
     * to a digit in the base.
     * Values of 255 indicate a character is not in the alphabet.
     */
    private readonly _charToDigit: Uint8Array;
    /**
     * A mapping from a digit in the base
     * to the ASCII value of a character in the alphabet.
     */
    private readonly _digitToChar: Uint8Array;
    /**
     * The alphabet used by this encoding.
     */
    private readonly _alphabet: string;

    /**
     * Constructs a new BasekEncoding object.
     * @param alphabet The alphabet for this encoding to use.
     * ```
     * const base85Encoding = new BasekEncoding(ALPHABET_94.slice(0, 85));
     * ```
     */
    constructor(alphabet: string) {
        if (typeof alphabet !== "string") {
            throw new TypeError("parameter `alphabet` is not a string");
        }

        const charIndexes = new Map<number, number>();
        for (let i = 0; i < alphabet.length; ++i) {
            if (/\s/u.test(alphabet[i])) {
                throw new Error("the alphabet has a whitespace character");
            }

            const charCode = alphabet.charCodeAt(i);
            if (charCode > 127) {
                throw new Error(
                    `the alphabet has the non-ASCII character '${alphabet[i]}'`,
                );
            }

            if (charIndexes.has(charCode)) {
                throw new Error(
                    `the alphabet has the repeated character '${alphabet[i]}'`,
                );
            }

            charIndexes.set(charCode, i);
        }

        if (alphabet.length < 2) {
            throw new Error("the alphabet has fewer than 2 characters");
        }

        const charToDigit = new Uint8Array(256);
        const digitToChar = new Uint8Array(alphabet.length);

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

    /**
     * A mapping from the ASCII value of a character in the alphabet
     * to a digit in the base.
     * Values of 255 indicate a character is not in the alphabet.
     */
    get charToDigitMap(): Uint8Array {
        return this._charToDigit;
    }

    /**
     * A mapping from a digit in the base
     * to the ASCII value of a character in the alphabet.
     */
    get digitToCharMap(): Uint8Array {
        return this._digitToChar;
    }

    /**
     * The alphabet used by this encoding.
     */
    get alphabet(): string {
        return this._alphabet;
    }

    /**
     * The base (radix) used by this encoding,
     * which is equal to the length of the alphabet.
     */
    get base(): number {
        return this._alphabet.length;
    }
}

/**
 * Encodes UTF-8 text.
 * @param text The text to encode.
 * @param encoding The encoding or alphabet to use.
 * The encoding object created from the previously used alphabet is cached,
 * so repeated uses of the same alphabet should be fast.
 * @returns The encoded string.
 */
export function encodeText(text: string, encoding: BasekEncoding | string): string {
    if (typeof text !== "string") {
        throw new TypeError("parameter `text` is not a string");
    }

    return encode(textEncoder.encode(text), encoding);
}

/**
 * Decodes an encoded string to UTF-8 text.
 * @param encodedString The encoded string to decode.
 * @param encoding The encoding or alphabet to use.
 * The encoding object created from the previously used alphabet is cached,
 * so repeated uses of the same alphabet should be fast.
 * @returns The decoded UTF-8 text.
 */
export function decodeText(
    encodedString: string,
    encoding: BasekEncoding | string,
): string {
    return textDecoder.decode(decode(encodedString.replaceAll(/\s/gu, ""), encoding));
}

/**
 * Encodes binary data.
 * @param binaryData The binary data to encode.
 * @param encoding The encoding or alphabet to use.
 * The encoding object created from the previously used alphabet is cached,
 * so repeated uses of the same alphabet should be fast.
 * @returns The encoded string.
 */
export function encode(
    binaryData: Uint8Array | Uint8ClampedArray,
    encoding: BasekEncoding | string,
): string {
    if (!(binaryData instanceof Uint8Array || binaryData instanceof Uint8ClampedArray)) {
        throw new TypeError(
            "parameter `binaryData` is not a Uint8Array or Uint8ClampedArray",
        );
    }

    encoding = getEncoding(encoding);
    const base = encoding.base;
    const digitToChar = encoding.digitToCharMap;

    const placeValues = placeValueCache[base];
    const prefixDivisor = placeValues[1];
    const secondPrefixDivisor = placeValues[2];

    let encoded = new Uint8Array(Math.ceil(binaryData.length * sizeFactor[base]) + 16);
    let encodedLength = 0;

    // Range coding
    let lo = 0;
    let hi = placeValues[0] - 1;
    let deferredCount = 0;
    let deferredLoPrefix = 0;
    for (const byte of binaryData) {
        const rangeDiff = hi + 1 - lo;
        const delta = byte * rangeDiff;
        hi = lo + (Math.ceil((delta + rangeDiff) / 256) - 1);
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

            encoded = emit(encoded, loPrefix, encodedLength++);
            if (deferredCount > 0) {
                const deferredValue = loPrefix === deferredLoPrefix ? base - 1 : 0;
                for (; deferredCount > 0; --deferredCount) {
                    encoded = emit(encoded, deferredValue, encodedLength++);
                }
            }

            lo = (lo % prefixDivisor) * base;
            hi = (hi % prefixDivisor) * base + (base - 1);
        }
    }

    if (deferredCount > 0) {
        const hiPrefix = Math.floor(hi / prefixDivisor);
        encoded = emit(encoded, hiPrefix, encodedLength++);
        while (deferredCount-- > 0) {
            encoded = emit(encoded, 0, encodedLength++);
        }

        lo = (lo % prefixDivisor) * base;
        hi = (hi % prefixDivisor) * base + (base - 1);
    }

    // Ensure that all necessary information is in the encoded string
    // and that the decoder stops at the correct place.
    while (true) {
        if (lo === 0 && hi === placeValues[0] - 1) {
            // The range spans all possible values, so the last byte can be
            // determined unambiguously from the previously emitted bytes.
            // Emit a 0 to indicate that no more bytes should be decoded.
            encoded = emit(encoded, 0, encodedLength++);
            break;
        }

        // Otherwise, keep emitting digits until it is unambiguous
        // what the final byte is.
        // The decoder will emit only one byte after reading the final digit,
        // so the no extraneous bytes will be inferred by the decoder.

        const loPrefix = Math.floor(lo / prefixDivisor);
        const hiPrefix = Math.floor(hi / prefixDivisor);

        if (hiPrefix - loPrefix > 1) {
            // The range
            // from (loPrefix + 1) * prefixDivisor
            // to   (loPrefix + 2) * prefixDivisor
            // is a subset of the current range,
            // so emitting loPrefix + 1 unambiguously
            // indicates what the final byte is.
            encoded = emit(encoded, loPrefix + 1, encodedLength++);
            break;
        }

        encoded = emit(encoded, hiPrefix, encodedLength++);
        if (loPrefix < hiPrefix) {
            lo = 0;
        } else {
            lo = (lo % prefixDivisor) * base;
        }
        hi = (hi % prefixDivisor) * base + (base - 1);
    }

    for (let i = 0; i < encodedLength; ++i) {
        encoded[i] = digitToChar[encoded[i]];
    }
    return textDecoder.decode(new Uint8Array(encoded.buffer, 0, encodedLength));
}

/**
 * Decodes an encoded string to binary data.
 * @param encodedString The encoded string to decode.
 * @param encoding The encoding or alphabet to use.
 * The encoding object created from the previously used alphabet is cached,
 * so repeated uses of the same alphabet should be fast.
 * @returns The decoded binary data.
 */
export function decode(
    encodedString: string,
    encoding: BasekEncoding | string,
): Uint8Array {
    if (typeof encodedString !== "string") {
        throw new TypeError("parameter `encodedString` is not a string");
    }

    encoding = getEncoding(encoding);
    const base = encoding.base;
    const charToDigit = encoding.charToDigitMap;

    const placeValues = placeValueCache[base];
    const prefixDivisor = placeValues[1];
    const secondPrefixDivisor = placeValues[2];

    let decoded = new Uint8Array(Math.ceil(encodedString.length / sizeFactor[base]) + 16);
    let length = 0;

    // Range coding
    let lo = 0;
    let hi = placeValues[0] - 1;
    let encodedDigits = 0;
    let multIndex = 0;
    let emitMultiple = true;
    for (let i = 0; i < encodedString.length; ) {
        const digit = charToDigit[encodedString.charCodeAt(i++)];
        if (digit === 255) {
            throw new Error(
                `the encoding does not contain the character '${encodedString[i - 1]}'`,
            );
        }

        encodedDigits += placeValues[++multIndex] * digit;

        if (i === encodedString.length) {
            // Final digit

            if (digit === 0) {
                // 0 indicates that the final byte could already be inferred from the
                // current range, so no more bytes should be emitted.
                break;
            }

            // Otherwise, emit only one byte and stop.
            emitMultiple = false;
        }

        while (true) {
            const encodedHi = encodedDigits + (placeValues[multIndex] - 1);
            // The largest possible range the encoder could have had
            // is from encoded to encodedHi.

            // Check which byte values could possibly be next.
            const rangeDiff = hi + 1 - lo;
            const byte = Math.floor(((encodedDigits - lo) * 256) / rangeDiff);
            const maxByte = Math.floor(((encodedHi - lo) * 256) / rangeDiff);
            if (maxByte !== byte) {
                // More than one byte value could have resulted
                // in the previously read digit being emitted.
                break;
            }

            decoded = emit(decoded, byte, length++);
            if (!emitMultiple) {
                // Final byte, stop
                break;
            }

            // Now do what the encoder did.

            const delta = byte * rangeDiff;
            hi = lo + (Math.ceil((delta + rangeDiff) / 256) - 1);
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
                    // multIndex will never go below 1, since the encoder's range
                    // after emitting the previous byte must be
                    // a superset of the range from encoded to encodedHi.
                    break;
                }

                lo = (lo % prefixDivisor) * base;
                hi = (hi % prefixDivisor) * base + (base - 1);

                encodedDigits = (encodedDigits % prefixDivisor) * base;
                --multIndex;
                // multIndex will never go below 0, since the encoder's range
                // after emitting the previous byte must be
                // a superset of the range from encoded to encodedHi.
            }
        }
    }

    const result = new Uint8Array(length);
    result.set(new Uint8Array(decoded.buffer, 0, length));
    return result;
}

/**
 * Emits a byte to a Uint8Array.
 * @param array The array to emit to.
 * @param byte The byte to emit.
 * @param index The index of the array to modify.
 * The index must be between 0 and `data.length` (inclusive).
 * If the index equals `data.length`, a bigger array is created, and the contents
 * of the original array are copied to the new array.
 * @returns The array, which will be a different object if a resize was required.
 */
function emit(array: Uint8Array, byte: number, index: number): Uint8Array {
    if (index === array.length) {
        const newLength = index + (index >> 1);
        const newData = new Uint8Array(newLength);
        newData.set(array);
        array = newData;
    }

    array[index] = byte;
    return array;
}

/**
 * Returns the given encoding or an encoding using the alphabet given.
 * @param encoding An encoding or alphabet.
 * @returns `encoding` if it is a BasekEncoding object, or an encoding with
 * the given alphabet.
 * The encoding object created from the previously used alphabet is cached.
 */
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
const sizeFactor: number[] = [0, 0];
for (let base = 2; base <= 255; ++base) {
    let placeValue = 1;
    const placeValues = [placeValue];
    while (base * placeValue <= (Number.MAX_SAFE_INTEGER + 1) / 256) {
        placeValue *= base;
        placeValues.push(placeValue);
    }
    placeValues.reverse();
    placeValueCache.push(placeValues);

    sizeFactor.push(8 / Math.log2(base));
}

let cachedEncoding = new BasekEncoding(ALPHABET_94.slice(0, 85));
