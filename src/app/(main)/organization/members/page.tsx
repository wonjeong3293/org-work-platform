import { getUsers } from "@/actions/user-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; department?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { users } = await getUsers({
    search: params.search,
    departmentId: params.department,
    page: params.page ? parseInt(params.page) : 1,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">구성원</h1>
        <p className="text-sm text-muted-foreground">조직 구성원 목록입니다.</p>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Link key={user.id} href={`/organization/members/${user.id}`}>
            <Card className="transition-colors hover:bg-gray-50">
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.profileImage || undefined} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.name}</p>
                    {user.isAdmin && <Badge variant="destructive" className="text-xs">관리자</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {user.position || "직위 미설정"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user.department?.name || "부서 미배정"} · {user.email}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {users.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          구성원이 없습니다.
        </p>
      )}
    </div>
  );
}
