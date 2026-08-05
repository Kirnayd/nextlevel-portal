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

type EmployeeQuestionPanelProps = {
  onCreated?: (questionId: string) => void;
};

export function EmployeeQuestionPanel({ onCreated }: EmployeeQuestionPanelProps) {
  const [isFormVisible, setIsFormVisible] = useState(false);

  if (!isFormVisible) {
    return (
      <Button type="button" onClick={() => setIsFormVisible(true)}>
        Нове звернення
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Нове звернення</CardTitle>
        <CardDescription>
          Вкажіть тему та перше повідомлення. Далі ви зможете продовжити листування в чаті.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QuestionForm
          onCancel={() => setIsFormVisible(false)}
          onCreated={(questionId) => {
            setIsFormVisible(false);
            onCreated?.(questionId);
          }}
        />
      </CardContent>
    </Card>
  );
}
