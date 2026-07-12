import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VehicleNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-3xl font-black">Not found</h1>
      <Link href="/vehicles">
        <Button className="mt-6">Back to vehicles</Button>
      </Link>
    </div>
  );
}
