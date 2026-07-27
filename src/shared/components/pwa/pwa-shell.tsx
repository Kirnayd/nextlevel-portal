import { IosInstallPrompt } from "@/shared/components/pwa/ios-install-prompt";
import { ServiceWorkerRegister } from "@/shared/components/pwa/service-worker-register";

export function PwaShell() {
  return (
    <>
      <ServiceWorkerRegister />
      <IosInstallPrompt />
    </>
  );
}
