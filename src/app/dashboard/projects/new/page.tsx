import { ServiceBuilder } from "@/components/ServiceBuilder";
import { requireUser } from "@/lib/auth";

export default async function NewProjectPage() {
  const me = await requireUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <p className="text-sm text-muted-foreground">
          Build the order step-by-step. Pricing updates live and is frozen on confirmation.
        </p>
      </div>
      <ServiceBuilder defaultMode={me.role === "CLIENT_MANAGER" ? "COLLAB" : "SOLO"} myRole={me.role} myEmail={me.email} />
    </div>
  );
}
