"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import type { AnnouncementWithImages } from "@/features/announcements/actions";
import { AnnouncementForm } from "@/features/announcements/components/announcement-form";
import { AnnouncementList } from "@/features/announcements/components/announcement-list";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

type AnnouncementsViewProps = {
  announcements: AnnouncementWithImages[];
  isAdmin: boolean;
};

export function AnnouncementsView({ announcements, isAdmin }: AnnouncementsViewProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  function handleOpenCreateForm() {
    setShowCreateForm(true);
  }

  function handleCloseCreateForm() {
    setShowCreateForm(false);
  }

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <div className="space-y-4">
          <Button
            type="button"
            aria-expanded={showCreateForm}
            onClick={handleOpenCreateForm}
          >
            <Plus />
            Створити оголошення
          </Button>

          {showCreateForm ? (
            <Card>
              <CardHeader>
                <CardTitle>Нове оголошення</CardTitle>
                <CardDescription>
                  Заповніть заголовок і текст. Можна одразу закріпити або опублікувати.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnnouncementForm
                  key={showCreateForm ? "create-announcement-open" : "create-announcement-closed"}
                  mode="create"
                  onSuccess={handleCloseCreateForm}
                  onCancel={handleCloseCreateForm}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <AnnouncementList announcements={announcements} isAdmin={isAdmin} />
    </div>
  );
}
