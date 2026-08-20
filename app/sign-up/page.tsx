import { SignUp } from "@clerk/nextjs";
import { clerkEnabled } from "@/lib/clerk";
import SetupRequired from "@/components/SetupRequired";

export default function SignUpPage() {
  if (!clerkEnabled) return <SetupRequired />;
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <SignUp />
    </main>
  );
}