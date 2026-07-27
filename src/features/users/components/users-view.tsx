"use client";

import { useState } from "react";

import type { ManagedUser } from "@/features/users/actions";
import { CreateUserForm } from "@/features/users/components/create-user-form";
import { UserRow } from "@/features/users/components/user-row";
import { UserSearchForm } from "@/features/users/components/user-search-form";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

type UsersViewProps = {
  users: ManagedUser[];
  currentUserId: string;
  searchQuery: string;
};

export function UsersView({ users, currentUserId, searchQuery }: UsersViewProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);

  function handleCloseCreateForm() {
    setShowCreateForm(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <UserSearchForm defaultQuery={searchQuery} />

        <Button
          type="button"
          className="shrink-0"
          onClick={() => setShowCreateForm((value) => !value)}
        >
          {showCreateForm ? "Закрити форму" : "Створити користувача"}
        </Button>
      </div>

      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Створити користувача</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUserForm
              key={showCreateForm ? "create-user-open" : "create-user-closed"}
              onSuccess={handleCloseCreateForm}
              onCancel={handleCloseCreateForm}
            />
          </CardContent>
        </Card>
      ) : null}

      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
          {searchQuery.trim()
            ? "За вашим запитом користувачів не знайдено."
            : "Користувачів поки немає."}
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <UserRow key={user.id} user={user} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}
