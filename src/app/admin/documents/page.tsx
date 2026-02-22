'use client';
import { AddDocumentDialog } from '@/components/admin/add-document-dialog';
import { DocumentsTable } from '@/components/admin/documents-table';
import { Button } from '@/components/ui/button';
import { useAdmin } from '@/hooks/use-admin';
import { useState } from 'react';

export default function DocumentsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { isAdmin } = useAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Documents</h1>
        {isAdmin && (
          <Button onClick={() => setIsAddDialogOpen(true)}>Add Document</Button>
        )}
      </div>
      <DocumentsTable />
      {isAdmin && (
        <AddDocumentDialog
          isOpen={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
        />
      )}
    </div>
  );
}

    