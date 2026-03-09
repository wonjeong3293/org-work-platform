import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;
  const userExt = user as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>프로필</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.image || undefined} />
            <AvatarFallback className="text-2xl">{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <p className="text-lg font-medium">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-sm text-muted-foreground">
              {(userExt?.position as string) || "직위 미설정"} ·{" "}
              {(userExt?.department as { name: string })?.name || "부서 미배정"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
