// src/workers/parseWorker.ts
/// <reference lib="webworker" />

import { parseChatFile } from '../logic/parseChatFile';

self.addEventListener('message', async (event) => {
  const { content, fileName } = event.data;
  try {
    const result = await parseChatFile(content, fileName);
    // Sende das Ergebnis zurück an den Main-Thread
    self.postMessage({ result });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    self.postMessage({ error: error.message });
  }
});
