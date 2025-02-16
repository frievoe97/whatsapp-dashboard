/// <reference lib="webworker" />

////////////////////// Imports ///////////////////////
import { parseChatFile } from '../logic/parseChatFile';

////////////////////// Worker Message Handler ///////////////////////

/**
 * This web worker listens for messages from the main thread containing the chat file content
 * and file name. It parses the chat file using the parseChatFile function and sends the result
 * back to the main thread.
 */
self.addEventListener('message', async (event) => {
  const { content, fileName } = event.data;
  try {
    const result = await parseChatFile(content, fileName);
    // Post the result back to the main thread.
    self.postMessage({ result });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Post any error message back to the main thread.
    self.postMessage({ error: error.message });
  }
});
