'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/use-admin';
import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

interface Document {
  id: string;
  title: string;
  fileType: string;
  originalFilename?: string;
  originalUrl?: string;
  ingestedAt: Timestamp | null;
}

export function DocumentsTable() {
  const [isClient, setIsClient] = useState(false);
  const { isAdmin, isAdminLoading } = useAdmin();
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const firestore = useFirestore();
  const documentsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'documents') : null),
    [firestore]
  );
  const documentsQuery = useMemoFirebase(
    () =>
      documentsCollection
        ? query(documentsCollection, orderBy('ingestedAt', 'desc'))
        : null,
    [documentsCollection]
  );

  const {
    data: documents,
    isLoading,
    error,
  } = useCollection<Document>(documentsQuery);

  const handleDelete = (docId: string, docTitle: string) => {
    if (!firestore) return;
    const docRef = doc(firestore, 'documents', docId);
    deleteDocumentNonBlocking(docRef);
    toast({
      title: 'Document deleted',
      description: `"${docTitle}" has been deleted.`,
    });
  };

  const isValidUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
  }

  if (!isClient || isLoading || isAdminLoading) {
    return (
      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Ingested At</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-[250px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[100px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[150px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load documents: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mt-4 rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Ingested At</TableHead>
            {isAdmin && <TableHead className="w-[60px] text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents && documents.length > 0 ? (
            documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.title}</TableCell>
                <TableCell>
                  {doc.fileType === 'url' && isValidUrl(doc.originalUrl) ? (
                    <a href={doc.originalUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-primary transition-colors">
                      {new URL(doc.originalUrl!).hostname}
                    </a>
                  ) : (
                    doc.originalFilename || doc.fileType
                  )}
                </TableCell>
                <TableCell>
                  {doc.ingestedAt?.toDate
                    ? format(doc.ingestedAt.toDate(), 'PPp')
                    : 'Pending...'}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className='h-8 w-8'>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            document "{doc.title}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className='bg-destructive hover:bg-destructive/90'
                            onClick={() => handleDelete(doc.id, doc.title)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={isAdmin ? 4 : 3} className="h-24 text-center">
                No documents found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
