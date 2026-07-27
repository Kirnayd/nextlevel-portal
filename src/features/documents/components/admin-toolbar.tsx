"use client";

import { useState } from "react";
import { FolderPlus, Upload } from "lucide-react";

import type { DocumentCategoryWithDocuments } from "@/features/documents/actions";
import { CreateCategoryForm } from "@/features/documents/components/create-category-form";
import { UploadDocumentForm } from "@/features/documents/components/upload-document-form";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

type AdminToolbarProps = {
  categories: DocumentCategoryWithDocuments[];
};

export function AdminToolbar({ categories }: AdminToolbarProps) {
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showUploadDocument, setShowUploadDocument] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={() => {
            setShowCreateCategory((current) => !current);
            setShowUploadDocument(false);
          }}
        >
          <FolderPlus />
          Нова категорія
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShowUploadDocument((current) => !current);
            setShowCreateCategory(false);
          }}
        >
          <Upload />
          Завантажити документ
        </Button>
      </div>

      {showCreateCategory ? (
        <Card>
          <CardHeader>
            <CardTitle>Нова категорія</CardTitle>
            <CardDescription>Створіть категорію для групування документів.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateCategoryForm onSuccess={() => setShowCreateCategory(false)} />
          </CardContent>
        </Card>
      ) : null}

      {showUploadDocument ? (
        <Card>
          <CardHeader>
            <CardTitle>Завантажити документ</CardTitle>
            <CardDescription>
              Оберіть категорію та файл. Назву можна залишити порожньою.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadDocumentForm
              categories={categories}
              onSuccess={() => setShowUploadDocument(false)}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
