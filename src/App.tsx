import { encodeText, decodeText } from "@root/lib/main";
import { onMount } from "solid-js";

function App() {
    let decodedTextArea!: HTMLTextAreaElement;
    let encodedTextArea!: HTMLTextAreaElement;
    let charsetTextArea!: HTMLTextAreaElement;

    onMount(() => {
        charsetTextArea.value =
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";
    });

    return (
        <div class="m-5">
            <h2>Decoded Text</h2>
            <textarea
                class="font-mono text-sm w-1/2 h-48 border border-gray-500"
                ref={decodedTextArea}
            ></textarea>
            <div>
                <button
                    class="mx-auto border border-gray-500 bg-gray-200"
                    onclick={() => {
                        encodedTextArea.value = encodeText(
                            decodedTextArea.value,
                            charsetTextArea.value,
                        );
                    }}
                >
                    Encode
                </button>
                <button
                    class="mx-auto border border-gray-500 bg-gray-200"
                    onclick={() => {
                        decodedTextArea.value = decodeText(
                            encodedTextArea.value,
                            charsetTextArea.value,
                        );
                    }}
                >
                    Decode
                </button>
            </div>
            <h2>Encoded Text</h2>
            <textarea
                class="font-mono text-sm break-all w-1/2 h-48 border border-gray-500"
                ref={encodedTextArea}
            ></textarea>
            <h2>Charset</h2>
            <textarea
                class="font-mono text-sm break-all w-1/2 h-16 border border-gray-500"
                ref={charsetTextArea}
            ></textarea>
        </div>
    );
}

export default App;
