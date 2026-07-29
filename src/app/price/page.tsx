import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentPriceFile } from "@/features/price/actions";
import { PriceReadTracker } from "@/features/price/components/price-read-tracker";
import { PriceUploadForm } from "@/features/price/components/price-upload-form";
import { PriceView } from "@/features/price/components/price-view";
import { getSessionContext } from "@/shared/lib/auth";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";

export default async function PricePage() {
  const session = await getSessionContext();

  if (!session) {
    redirect("/login");
  }

  const priceFile = await getCurrentPriceFile();
  const userIsAdmin = session.isAdmin;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Прайс</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Перегляд та завантаження актуального прайсу компанії.
            </p>
          </div>

          <Button asChild variant="outline">
            <Link href="/dashboard" prefetch>
              На головну
            </Link>
          </Button>
        </div>

        <PriceView priceFile={priceFile} />

        {!userIsAdmin && priceFile ? <PriceReadTracker fileId={priceFile.id} /> : null}

        {userIsAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Завантаження прайсу</CardTitle>
              <CardDescription>
                Завантажте новий файл Excel або PDF. Поточний прайс буде замінено.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PriceUploadForm />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
