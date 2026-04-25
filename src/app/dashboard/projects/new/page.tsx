import { ServiceBuilder } from "@/components/ServiceBuilder";

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <p className="text-sm text-muted-foreground">
          Build the order step-by-step. Pricing updates live and is frozen on confirmation.
        </p>
      </div>
      <ServiceBuilder defaultMode="SOLO" />
    </div>
  );
}
