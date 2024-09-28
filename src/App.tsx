import { encodeText, decodeText, ALPHABET_94, BasekEncoding } from "@root/lib/main";
import { createSignal } from "solid-js";

import "./App.pcss";
import { createStore, SetStoreFunction } from "solid-js/store";

type BenchmarkResults = {
    base2Encode: number;
    base2Decode: number;
    base10Encode: number;
    base10Decode: number;
    base36Encode: number;
    base36Decode: number;
    base64Encode: number;
    base64Decode: number;
    base85Encode: number;
    base85Decode: number;
    btoaEncode: number;
    atobDecode: number;
};

function App() {
    const [decodedText, setDecodedText] = createSignal("");
    const [encodedText, setEncodedText] = createSignal("");
    const [alphabet, setAlphabet] = createSignal(ALPHABET_94.slice(0, 85));
    const [benchResults, setBenchResults] = createStore({
        base2Encode: 0,
        base2Decode: 0,
        base10Encode: 0,
        base10Decode: 0,
        base36Encode: 0,
        base36Decode: 0,
        base64Encode: 0,
        base64Decode: 0,
        base85Encode: 0,
        base85Decode: 0,
        btoaEncode: 0,
        atobDecode: 0,
    });

    let decodedTextArea!: HTMLTextAreaElement;
    let encodedTextArea!: HTMLTextAreaElement;
    let alphabetTextArea!: HTMLTextAreaElement;

    const textEncoder = new TextEncoder();

    return (
        <div class="m-auto flex flex-col gap-4">
            <div>
                <h1>Basek</h1>
                <p>A family of efficient base-k binary-to-text encodings.</p>
            </div>
            <div>
                <h2>Decoded Text</h2>
                <textarea
                    class="w-full h-56"
                    ref={decodedTextArea}
                    oninput={(e) => setDecodedText(e.target.value)}
                >
                    {decodedText()}
                </textarea>
                <p class="text-sm text-gray-500">
                    {textEncoder.encode(decodedText()).length.toLocaleString()} bytes
                </p>
            </div>
            <div class="flex flex-row gap-2">
                <button
                    onclick={() => {
                        try {
                            encodedTextArea.value = encodeText(decodedText(), alphabet());
                            setEncodedText(encodedTextArea.value);
                        } catch (ex) {
                            alert(ex);
                        }
                    }}
                >
                    Encode
                </button>
                <button
                    onclick={() => {
                        try {
                            decodedTextArea.value = decodeText(encodedText(), alphabet());
                            setDecodedText(decodedTextArea.value);
                        } catch (ex) {
                            alert(ex);
                        }
                    }}
                >
                    Decode
                </button>
            </div>
            <div>
                <h2>Encoded Text</h2>
                <textarea
                    class="break-all w-full h-20"
                    ref={encodedTextArea}
                    oninput={(e) => setEncodedText(e.target.value)}
                >
                    {encodedText()}
                </textarea>
                <p class="text-sm text-gray-500">
                    {textEncoder.encode(encodedText()).length.toLocaleString()} bytes
                </p>
            </div>
            <div>
                <h2>Alphabet</h2>
                <textarea
                    class="break-all w-full h-12"
                    ref={alphabetTextArea}
                    oninput={(e) => setAlphabet(e.target.value)}
                >
                    {alphabet()}
                </textarea>
                <p class="text-sm text-gray-500">
                    {alphabet().length.toLocaleString()} characters
                </p>
            </div>
            <div>
                <h2>Benchmarks</h2>
                <p>
                    This benchmark generates 5 MB of random ASCII text and then measures
                    the encode and decode times.
                </p>
            </div>
            <div class="flex flex-row gap-2">
                <button
                    onclick={() => {
                        try {
                            runBenchmark(setBenchResults);
                        } catch (ex) {
                            alert(ex);
                        }
                    }}
                >
                    Run Benchmarks
                </button>
            </div>
            <div>
                <p>
                    Base-2 Encode: {benchResults.base2Encode.toLocaleString()} bytes/sec
                </p>
                <p>
                    Base-2 Decode: {benchResults.base2Decode.toLocaleString()} bytes/sec
                </p>
            </div>
            <div>
                <p>
                    Base-10 Encode: {benchResults.base10Encode.toLocaleString()} bytes/sec
                </p>
                <p>
                    Base-10 Decode: {benchResults.base10Decode.toLocaleString()} bytes/sec
                </p>
            </div>
            <div>
                <p>
                    Base-36 Encode: {benchResults.base36Encode.toLocaleString()} bytes/sec
                </p>
                <p>
                    Base-36 Decode: {benchResults.base36Decode.toLocaleString()} bytes/sec
                </p>
            </div>
            <div>
                <p>
                    Base-64 Encode: {benchResults.base64Encode.toLocaleString()} bytes/sec
                </p>
                <p>
                    Base-64 Decode: {benchResults.base64Decode.toLocaleString()} bytes/sec
                </p>
            </div>
            <div>
                <p>
                    Base-85 Encode: {benchResults.base85Encode.toLocaleString()} bytes/sec
                </p>
                <p>
                    Base-85 Decode: {benchResults.base85Decode.toLocaleString()} bytes/sec
                </p>
            </div>
            <div>
                <p>btoa() Encode: {benchResults.btoaEncode.toLocaleString()} bytes/sec</p>
                <p>atob() Decode: {benchResults.atobDecode.toLocaleString()} bytes/sec</p>
            </div>
            <p class="m-auto justify-center text-gray-500">
                Created by Rex Berry • View{" "}
                <a href="https://github.com/RexBerry/basek">the source code</a> on GitHub
            </p>
        </div>
    );
}

function runBenchmark(setBenchResults: SetStoreFunction<BenchmarkResults>) {
    const data = new Uint8Array(5_000_000);
    for (let i = 0; i < data.length; ++i) {
        data[i] = Math.floor((127 - 32) * Math.random()) + 32;
    }

    const text = new TextDecoder().decode(data);
    let encoded: string = "";
    let decoded: string = "";

    function calculateByteRate(seconds: number): number {
        return Math.round(text.length / Math.max(1e-3, seconds));
    }

    const base2Encoding = new BasekEncoding(ALPHABET_94.slice(0, 2));
    const base10Encoding = new BasekEncoding(ALPHABET_94.slice(0, 10));
    const base36Encoding = new BasekEncoding(ALPHABET_94.slice(0, 36));
    const base64Encoding = new BasekEncoding(ALPHABET_94.slice(0, 64));
    const base85Encoding = new BasekEncoding(ALPHABET_94.slice(0, 85));

    const stopwatch = new Stopwatch();

    stopwatch.start();
    encoded = encodeText(text, base2Encoding);
    stopwatch.stop();
    setBenchResults("base2Encode", calculateByteRate(stopwatch.elapsedSeconds()));
    stopwatch.start();
    decoded = decodeText(encoded, base2Encoding);
    stopwatch.stop();
    setBenchResults("base2Decode", calculateByteRate(stopwatch.elapsedSeconds()));
    if (decoded !== text) {
        alert("Base-2 encode and decode gave an incorrect result");
    }

    stopwatch.start();
    encoded = encodeText(text, base10Encoding);
    stopwatch.stop();
    setBenchResults("base10Encode", calculateByteRate(stopwatch.elapsedSeconds()));
    stopwatch.start();
    decoded = decodeText(encoded, base10Encoding);
    stopwatch.stop();
    setBenchResults("base10Decode", calculateByteRate(stopwatch.elapsedSeconds()));
    if (decoded !== text) {
        alert("Base-10 encode and decode gave an incorrect result");
    }

    stopwatch.start();
    encoded = encodeText(text, base36Encoding);
    stopwatch.stop();
    setBenchResults("base36Encode", calculateByteRate(stopwatch.elapsedSeconds()));
    stopwatch.start();
    decoded = decodeText(encoded, base36Encoding);
    stopwatch.stop();
    setBenchResults("base36Decode", calculateByteRate(stopwatch.elapsedSeconds()));
    if (decoded !== text) {
        alert("Base-36 encode and decode gave an incorrect result");
    }

    stopwatch.start();
    encoded = encodeText(text, base64Encoding);
    stopwatch.stop();
    setBenchResults("base64Encode", calculateByteRate(stopwatch.elapsedSeconds()));
    stopwatch.start();
    decoded = decodeText(encoded, base64Encoding);
    stopwatch.stop();
    setBenchResults("base64Decode", calculateByteRate(stopwatch.elapsedSeconds()));
    if (decoded !== text) {
        alert("Base-64 encode and decode gave an incorrect result");
    }

    stopwatch.start();
    encoded = encodeText(text, base85Encoding);
    stopwatch.stop();
    setBenchResults("base85Encode", calculateByteRate(stopwatch.elapsedSeconds()));
    stopwatch.start();
    decoded = decodeText(encoded, base85Encoding);
    stopwatch.stop();
    setBenchResults("base85Decode", calculateByteRate(stopwatch.elapsedSeconds()));
    if (decoded !== text) {
        alert("Base-85 encode and decode gave an incorrect result");
    }

    stopwatch.start();
    encoded = btoa(text);
    stopwatch.stop();
    setBenchResults("btoaEncode", calculateByteRate(stopwatch.elapsedSeconds()));
    stopwatch.start();
    decoded = atob(encoded);
    stopwatch.stop();
    setBenchResults("atobDecode", calculateByteRate(stopwatch.elapsedSeconds()));
    if (decoded !== text) {
        alert("btoa() encode and atob() decode gave an incorrect result");
    }
}

class Stopwatch {
    private _startTime: number;
    private _stopTime: number;

    constructor() {
        this._startTime = 0;
        this._stopTime = 0;
    }

    start() {
        this._startTime = performance.now();
    }

    stop() {
        this._stopTime = performance.now();
    }

    elapsedSeconds(): number {
        return Math.round(1000 * (this._stopTime - this._startTime)) / 1e6;
    }
}

export default App;
