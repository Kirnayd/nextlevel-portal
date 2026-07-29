"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { deleteQuestion } from "@/features/questions/actions";
import { DeleteQuestionDialog } from "@/features/questions/components/delete-question-dialog";
import { Button } from "@/shared/components/ui/button";

type AdminQuestionDeleteProps = {
  questionId: string;
  onDeleted: (questionId: string) => void;
};

export function AdminQuestionDelete({ questionId, onDeleted }: AdminQuestionDeleteProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleConfirmDelete() {
    setErrorMessage("");
    setIsDeleting(true);

    try {
      const result = await deleteQuestion(questionId);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setIsDialogOpen(false);
      onDeleted(questionId);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Невідома помилка під час видалення.";

      setErrorMessage(message);
      console.error("Delete question error:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => {
          setErrorMessage("");
          setIsDialogOpen(true);
        }}
      >
        Видалити
      </Button>

      <DeleteQuestionDialog
        open={isDialogOpen}
        isDeleting={isDeleting}
        errorMessage={errorMessage}
        onCancel={() => {
          if (!isDeleting) {
            setIsDialogOpen(false);
            setErrorMessage("");
          }
        }}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  );
}
