'use client';

import { Firestore, collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase';
import { generateTitleForDocument } from '@/app/admin/documents/actions';
import * as pdfjsLib from 'pdfjs-dist';

let workerInitialized = false;

export function initPdfWorker() {
    if (!workerInitialized) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
        workerInitialized = true;
    }
}

/**
 * Extract text content from a PDF file.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
    initPdfWorker();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                if (!event.target?.result) {
                    reject(new Error('Failed to read file'));
                    return;
                }
                const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let textContent = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent += text.items.map((s: any) => s.str).join(' ');
                }
                resolve(textContent);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Could not read the selected file.'));
        reader.readAsArrayBuffer(file);
    });
}

export interface SaveDocumentResult {
    success: boolean;
    title?: string;
    error?: string;
}

/**
 * Generate a title via AI, then save the document to Firestore.
 */
export async function saveDocumentToFirestore(
    firestore: Firestore,
    content: string,
    fileType: 'manual' | 'pdf' | 'url',
    fileName?: string
): Promise<SaveDocumentResult> {
    try {
        if (!content.trim() || content.trim().length < 10) {
            return { success: false, error: 'Content must be at least 10 characters.' };
        }

        const titleResult = await generateTitleForDocument(content);

        if ('error' in titleResult) {
            return { success: false, error: titleResult.error };
        }

        const documentsCollection = collection(firestore, 'documents');
        const docData: Record<string, any> = {
            title: titleResult.title,
            content: content,
            fileType,
            sourceSystemId: 'manual-ingestion',
            ingestedAt: serverTimestamp(),
            lastModifiedAt: serverTimestamp(),
        };
        if (fileName) {
            docData.originalFilename = fileName;
        }
        await addDocumentNonBlocking(documentsCollection, docData);

        return { success: true, title: titleResult.title };
    } catch (error) {
        console.error('Error saving document:', error);
        return { success: false, error: (error as Error).message || 'Failed to save document.' };
    }
}
