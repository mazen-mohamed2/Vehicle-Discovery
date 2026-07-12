import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DealerNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-3xl font-black">Not found</h1>
      <Link href="/dealers">
        <Button className="mt-6">Back</Button>
      </Link>
    </div>
  );
}
