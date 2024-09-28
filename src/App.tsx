import { encodeText, decodeText } from "@root/lib/main";
import { createSignal } from "solid-js";

function App() {
    const [decodedText, setDecodedText] = createSignal("");
    const [encodedText, setEncodedText] = createSignal("");
    const [charset, setCharset] = createSignal(
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~",
    );

    const [decodeRate, setDecodeRate] = createSignal(0);
    const [encodeRate, setEncodeRate] = createSignal(0);

    let decodedTextArea!: HTMLTextAreaElement;
    let encodedTextArea!: HTMLTextAreaElement;
    let charsetTextArea!: HTMLTextAreaElement;

    const textEncoder = new TextEncoder();

    return (
        <div class="m-auto flex flex-col gap-4">
            <div>
                <h2>Decoded Text</h2>
                <textarea
                    class="w-1/2 h-48"
                    ref={decodedTextArea}
                    oninput={(e) => setDecodedText(e.target.value)}
                >
                    {decodedText()}
                </textarea>
                <p class="text-sm text-gray-600">
                    {textEncoder.encode(decodedText()).length.toLocaleString()} bytes •{" "}
                    {decodeRate().toLocaleString()} bytes/second decoded
                </p>
            </div>
            <div class="flex flex-row gap-2">
                <button
                    onclick={() => {
                        try {
                            const text = decodedText();
                            const charsetValue = charset();
                            const timeBegin = performance.now();
                            const encoded = encodeText(text, charsetValue);
                            const timeEnd = performance.now();
                            const textLength = textEncoder.encode(text).length;
                            const elapsedTime = Math.max(
                                1e-4,
                                Math.round(1000 * (timeEnd - timeBegin)) / 1e6,
                            );
                            setEncodeRate(Math.round(textLength / elapsedTime));
                            encodedTextArea.value = encoded;
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
                            const text = encodedText();
                            const charsetValue = charset();
                            const timeBegin = performance.now();
                            const decoded = decodeText(text, charsetValue);
                            const timeEnd = performance.now();
                            const textLength = textEncoder.encode(decoded).length;
                            const elapsedTime = Math.max(
                                1e-4,
                                Math.round(1000 * (timeEnd - timeBegin)) / 1e6,
                            );
                            setDecodeRate(Math.round(textLength / elapsedTime));
                            decodedTextArea.value = decoded;
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
                    class="break-all w-1/2 h-48"
                    ref={encodedTextArea}
                    oninput={(e) => setEncodedText(e.target.value)}
                >
                    {encodedText()}
                </textarea>
                <p class="text-sm text-gray-600">
                    {textEncoder.encode(encodedText()).length.toLocaleString()} bytes •{" "}
                    {encodeRate().toLocaleString()} bytes/second encoded
                </p>
            </div>
            <div>
                <h2>Character Set</h2>
                <textarea
                    class="break-all w-1/2 h-12"
                    ref={charsetTextArea}
                    oninput={(e) => setCharset(e.target.value)}
                >
                    {charset()}
                </textarea>
                <p class="text-sm text-gray-600">
                    {charset().length.toLocaleString()} characters
                </p>
            </div>
        </div>
    );
}

export default App;
