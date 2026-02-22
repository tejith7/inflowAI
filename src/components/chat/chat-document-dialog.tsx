'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileIcon, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import {
    extractTextFromPdf,
    saveDocumentToFirestore,
    initPdfWorker,
} from '@/lib/document-utils';

interface ChatDocumentDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onDocumentAdded: (title: string) => void;
}

export function ChatDocumentDialog({
    isOpen,
    onOpenChange,
    onDocumentAdded,
}: ChatDocumentDialogProps) {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('file');
    const [file, setFile] = useState<File | null>(null);
    const [textContent, setTextContent] = useState('');

    useEffect(() => {
        initPdfWorker();
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === 'application/pdf') {
                setFile(selectedFile);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Invalid file type',
                    description: 'Please select a PDF file.',
                });
                setFile(null);
            }
        }
    };

    const handleSubmit = async () => {
        if (!firestore) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Firestore is not available.',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            let content: string;
            let fileType: 'manual' | 'pdf' = 'manual';
            let fileName: string | undefined;

            if (activeTab === 'file') {
                if (!file) {
                    toast({ variant: 'destructive', title: 'No file selected', description: 'Please select a PDF file.' });
                    setIsSubmitting(false);
                    return;
                }
                toast({ title: 'Processing PDF...', description: 'Extracting text from your document.' });
                content = await extractTextFromPdf(file);
                fileType = 'pdf';
                fileName = file.name;
            } else {
                if (!textContent.trim() || textContent.trim().length < 10) {
                    toast({ variant: 'destructive', title: 'Content too short', description: 'Content must be at least 10 characters.' });
                    setIsSubmitting(false);
                    return;
                }
                content = textContent;
            }

            toast({ title: 'Analyzing document...', description: 'Generating a title for your document.' });
            const result = await saveDocumentToFirestore(firestore, content, fileType, fileName);

            if (result.success && result.title) {
                toast({ title: 'Document added!', description: `"${result.title}" is now in the knowledge base.` });
                onDocumentAdded(result.title);
                handleClose();
            } else {
                toast({ variant: 'destructive', title: 'Failed to add document', description: result.error || 'An unknown error occurred.' });
            }
        } catch (error) {
            console.error('Error adding document:', error);
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            onOpenChange(false);
            setFile(null);
            setTextContent('');
            setActiveTab('file');
        }
    };

    const isSubmitDisabled =
        isSubmitting ||
        (activeTab === 'file' && !file) ||
        (activeTab === 'text' && textContent.trim().length < 10);

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle>Add Document to Knowledge Base</DialogTitle>
                    <DialogDescription>
                        Upload a PDF or paste text. It will be processed and available for AI queries.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2 w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="file">Upload PDF</TabsTrigger>
                        <TabsTrigger value="text">Paste Text</TabsTrigger>
                    </TabsList>

                    <TabsContent value="file" className="py-4">
                        <div className="flex w-full items-center justify-center">
                            <label
                                htmlFor="chat-dropzone-file"
                                className="flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/60 bg-card/50 transition-colors hover:border-primary/40 hover:bg-muted/50"
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    {file ? (
                                        <>
                                            <FileIcon className="mb-3 h-8 w-8 text-primary" />
                                            <p className="mb-1 text-sm font-semibold text-foreground">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {Math.round(file.size / 1024)} KB
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                                            <p className="mb-1 text-sm text-muted-foreground">
                                                <span className="font-semibold">Click to upload</span> or drag and drop
                                            </p>
                                            <p className="text-xs text-muted-foreground">PDF (MAX. 10MB)</p>
                                        </>
                                    )}
                                </div>
                                <Input
                                    id="chat-dropzone-file"
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept=".pdf"
                                />
                            </label>
                        </div>
                    </TabsContent>

                    <TabsContent value="text" className="py-4">
                        <div className="space-y-2">
                            <Label htmlFor="chat-doc-content">Document Content</Label>
                            <Textarea
                                id="chat-doc-content"
                                placeholder="Paste your document content here..."
                                className="min-h-[180px] resize-none"
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Minimum 10 characters required.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitDisabled}>
                        {isSubmitting ? 'Processing...' : 'Add Document'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
