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
            className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive bg-[#e3dcc2]/62 font-bold"
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
        <AlertDialogContent className="border-[#51513d]/22 bg-[#f3edd7] text-[#1b2021] shadow-[14px_14px_0_rgba(81,81,61,.12)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Delete this test?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#1b2021]/62">
              {label} will be removed from your history. The underlying record stays preserved for
              audit and research integrity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#51513d]/28 bg-[#e3dcc2]/70 font-bold text-[#1b2021] hover:bg-[#e3dc95]/45">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(attemptId)}
              className="bg-destructive hover:bg-destructive/90 font-bold text-white"
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
