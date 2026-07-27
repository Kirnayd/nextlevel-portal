"use client";

import { useState } from "react";

import { QuestionForm } from "@/features/questions/components/question-form";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export function EmployeeQuestionPanel() {
  const [isFormVisible, setIsFormVisible] = useState(false);

  if (!isFormVisible) {
    return (
      <Button type="button" onClick={() => setIsFormVisible(true)}>
        Поставити запитання
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Нове запитання</CardTitle>
        <CardDescription>
          Опишіть ваше запитання — адміністратор отримає його та відповість.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QuestionForm onCancel={() => setIsFormVisible(false)} />
      </CardContent>
    </Card>
  );
}
