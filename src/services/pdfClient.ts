// This file manages the communication with the PDF Web Worker.
// It abstracts away the complexity of creating, messaging, and terminating the worker.
import pdfWorkerSource from './pdf.worker';

// This is a type guard to ensure the payload is what we expect.
// The actual data types (Invoice, Settings, etc.) are handled inside the worker.
export type PdfPayload = {
    type: 'single' | 'bulk';
    payload: unknown;
};

/**
 * Generates a PDF using a Web Worker to prevent blocking the main thread.
 * @param data - The payload to send to the worker, containing the type of operation ('single' or 'bulk') and the necessary data.
 * @returns A promise that resolves with the generated PDF Blob or rejects with an error.
 */
export const generatePdf = (data: PdfPayload): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        // Create the worker from a Blob URL. This is the most reliable way to instantiate
        // a worker in various environments and avoids cross-origin issues.
        const workerBlob = new Blob([pdfWorkerSource], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(workerBlob);
        
        // The `{ type: 'module' }` option is critical. It tells the browser to load
        // the worker as an ES module, which allows it to use import/export syntax.
        const worker = new Worker(workerUrl, { type: 'module' });

        const cleanup = () => {
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };

        // Listener for successful messages from the worker
        worker.onmessage = async (event) => {
            const { status, blob, error } = event.data;
            if (status === 'success' && blob instanceof Blob) {
                try {
                    // "Sanitize" the blob: read its contents and create a new, clean blob
                    // on the main thread. This breaks the link to the worker's context
                    // and prevents a rare but critical bug where the app state gets corrupted.
                    const buffer = await blob.arrayBuffer();
                    const cleanBlob = new Blob([buffer], { type: blob.type });
                    resolve(cleanBlob);
                } catch (e) {
                    reject(e);
                }
            } else {
                reject(new Error(error || 'An unknown error occurred in the PDF worker.'));
            }
            cleanup();
        };

        // Listener for errors that occur within the worker
        worker.onerror = (event) => {
            console.error('Worker error:', event);
            reject(new Error(`PDF Worker failed: ${event.message}`));
            cleanup();
        };

        // Send the data to the worker to start the PDF generation process
        worker.postMessage(data);
    });
};
