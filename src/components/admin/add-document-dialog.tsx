'use client';

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
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { generateTitleForDocument, processUrlForIngestion } from '@/app/admin/documents/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { FileIcon, Upload, LinkIcon } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { Label } from '../ui/label';

interface AddDocumentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const formSchema = z.object({
  content: z
    .string()
    .min(10, { message: 'Content must be at least 10 characters.' }),
});

type FormValues = z.infer<typeof formSchema>;

export function AddDocumentDialog({
  isOpen,
  onOpenChange,
}: AddDocumentDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('text');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: '',
    },
  });

  useEffect(() => {
    // Set the workerSrc for pdf.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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

  const processAndSaveContent = async (content: string, fileName?: string) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }

    setIsSubmitting(true);

    let titleResult: { title: string } | { error: string };
    try {
      toast({
        title: 'Analyzing document...',
        description: 'Generating a title for your document.',
      });
      titleResult = await generateTitleForDocument(content);
      if ('error' in titleResult) {
        throw new Error(titleResult.error);
      }
    } catch (error) {
      console.error('Error generating title:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to generate title',
        description: (error as Error).message,
      });
      setIsSubmitting(false);
      return;
    }

    const documentsCollection = collection(firestore, 'documents');
    addDocumentNonBlocking(documentsCollection, {
      title: titleResult.title,
      content: content,
      fileType: fileName ? 'pdf' : 'manual',
      originalFilename: fileName,
      sourceSystemId: 'manual-ingestion',
      ingestedAt: serverTimestamp(),
      lastModifiedAt: serverTimestamp(),
    })
      .then((docRef) => {
        if (docRef) {
          toast({
            title: 'Document added',
            description: `"${titleResult.title}" has been added successfully.`,
          });
          onOpenChange(false);
          form.reset();
          setFile(null);
          setUrl('');
        }
      })
      .catch((error) => {
        console.error('Error adding document to Firestore:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to save document',
          description:
            (error as Error).message || 'Could not save document.',
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const onTextSubmit: SubmitHandler<FormValues> = async (data) => {
    await processAndSaveContent(data.content);
  };

  const handleFileSubmit = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select a file to upload.',
      });
      return;
    }
    setIsSubmitting(true);
    toast({
      title: 'Processing PDF...',
      description: 'Extracting text from your document.',
    });

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target?.result) return;
        const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        let textContent = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          textContent += text.items.map((s: any) => s.str).join(' ');
        }
        await processAndSaveContent(textContent, file.name);
      };
      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        toast({
          variant: 'destructive',
          title: 'Error reading file',
          description: 'Could not read the selected file.',
        });
        setIsSubmitting(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error parsing PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to parse PDF',
        description: (error as Error).message,
      });
      setIsSubmitting(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!url) {
      toast({
        variant: 'destructive',
        title: 'No URL provided',
        description: 'Please enter a URL to import.',
      });
      return;
    }

    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }
    
    setIsSubmitting(true);
    toast({
      title: 'Importing from URL...',
      description: 'Fetching and processing the web page.',
    });

    const result = await processUrlForIngestion(url);

    if ('error' in result) {
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: result.error,
        });
        setIsSubmitting(false);
        return;
    }

    const documentsCollection = collection(firestore, 'documents');
    addDocumentNonBlocking(documentsCollection, {
        title: result.title,
        content: result.content,
        fileType: 'url',
        originalUrl: result.originalUrl,
        sourceSystemId: 'url-ingestion',
        ingestedAt: serverTimestamp(),
        lastModifiedAt: serverTimestamp(),
    })
      .then((docRef) => {
        if (docRef) {
          toast({
            title: 'Document added',
            description: `"${result.title}" has been added successfully.`,
          });
          onOpenChange(false);
          form.reset();
          setFile(null);
          setUrl('');
        }
      })
      .catch((error) => {
        console.error('Error adding document to Firestore:', error);
        toast({
          variant: 'destructive',
          title: 'Failed to save document',
          description:
            (error as Error).message || 'Could not save document.',
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (activeTab === 'text') {
      await form.handleSubmit(onTextSubmit)(e);
    } else if (activeTab === 'file') {
      await handleFileSubmit();
    } else if (activeTab === 'url') {
        await handleUrlSubmit();
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      form.reset();
      setFile(null);
      setUrl('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>
              Paste content, upload a PDF, or import from a URL. We'll automatically
              process it and generate a title.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="mt-4 w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="text">Paste Text</TabsTrigger>
              <TabsTrigger value="file">Upload PDF</TabsTrigger>
              <TabsTrigger value="url">From URL</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="py-4">
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Document Content</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Paste your full document content here..."
                          className="min-h-[300px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>
            </TabsContent>
            <TabsContent value="file" className="py-4">
              <div className="flex w-full items-center justify-center">
                <label
                  htmlFor="dropzone-file"
                  className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card hover:bg-muted"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <>
                        <FileIcon className="mb-4 h-8 w-8 text-primary" />
                        <p className="mb-2 text-sm text-foreground">
                          <span className="font-semibold">{file.name}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(file.size / 1024)} KB
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="mb-4 h-8 w-8 text-muted-foreground" />
                        <p className="mb-2 text-sm text-muted-foreground">
                          <span className="font-semibold">Click to upload</span>{' '}
                          or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF (MAX. 10MB)
                        </p>
                      </>
                    )}
                  </div>
                  <Input
                    id="dropzone-file"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf"
                  />
                </label>
              </div>
            </TabsContent>
            <TabsContent value="url" className="py-4 min-h-[310px]">
              <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <Input 
                      id="url" 
                      placeholder="https://example.com/article" 
                      value={url} 
                      onChange={(e) => setUrl(e.target.value)}
                      type="url"
                  />
                  <p className="text-sm text-muted-foreground">
                      We'll fetch the main content from the page.
                  </p>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (activeTab === 'file' && !file) || (activeTab === 'url' && !url)}
            >
              {isSubmitting ? 'Processing...' : 'Add Document'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
