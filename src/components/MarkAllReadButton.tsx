"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function MarkAllReadButton() {
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await fetch("/api/notifications", { method: "POST" });
        router.refresh();
      }}
    >
      Mark all read
    </Button>
  );
}
