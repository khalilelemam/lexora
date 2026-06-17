'use client';

import { Loader2, Trash2 } from 'lucide-react';

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
import { Button } from '@/components/ui/button';
import { useDeleteMyAttempt } from '@/features/attempts/hooks/use-attempts';

interface DeleteTestActionProps {
  attemptId: string;
  label: string;
}

export function DeleteTestAction({ attemptId, label }: DeleteTestActionProps) {
  const deleteMutation = useDeleteMyAttempt();

  return (
    <div className="grid gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this test?</AlertDialogTitle>
            <AlertDialogDescription>
              {label} will be removed from your history. The underlying record stays preserved for
              audit and research integrity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(attemptId)}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {deleteMutation.isError && (
        <p className="text-destructive text-sm">Could not delete this test. Please try again.</p>
      )}
    </div>
  );
}
