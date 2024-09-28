# Basek

A family of efficient base-k binary-to-text encodings.

## What is Basek?

Basek is a family of binary-to-text encodings similar to Base64 and Ascii85. Unlike Base64 and Ascii85, Basek does not use a fixed alphabet. Instead, it can use any alphabet with between 2 and 94 non-whitespace, printable ASCII characters. Since the alphabet size, and therefore base/radix, is flexible, Basek is a base-k encoder and decoder, not just base-64 or base-85.

## Size Overhead

Basek uses range coding with up to 45 bits of precision, which in some cases reduces the size overhead of encoded strings. For example, using a Basek base-85 encoding, encoded strings are approximately 24.81686% larger than the original data, which is almost exactly the ideal overhead. In comparison, data encoded using Ascii85 becomes 25% larger<sup>1</sup>, since Ascii85 encodes groups of four bytes as five characters. The difference is not much, but it does exist.

<sup>1</sup> Ascii85 encodes series of four 0 bytes as one character, but in compressed data, the difference this makes is negligible.

## Performance

This implementation of Basek, written in TypeScript, is quite slow. On my machine, the encoding and decoding speeds are approximately 20 MB/sec, which is around 50x slower than JavaScript's built-in `btoa()` and `atob()`. I do not know how much faster this implementation could be, given that floating-point division is used.
