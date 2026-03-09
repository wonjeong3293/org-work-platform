import { getUserById } from "@/actions/user-actions";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Building2, Hash, Calendar } from "lucide-react";
import { format } from "date-fns";

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  const user = await getUserById(memberId);
  if (!user) notFound();

  const info = [
    { icon: Mail, label: "이메일", value: user.email },
    { icon: Phone, label: "전화", value: user.phone || "-" },
    { icon: Building2, label: "부서", value: user.department?.name || "미배정" },
    { icon: Hash, label: "사번", value: user.employeeNumber || "-" },
    { icon: Calendar, label: "입사일", value: format(user.createdAt, "yyyy-MM-dd") },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardContent className="flex items-center gap-6 p-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.profileImage || undefined} />
            <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{user.name}</h1>
              {user.isAdmin && <Badge variant="destructive">관리자</Badge>}
            </div>
            <p className="text-lg text-muted-foreground">
              {user.position || "직위 미설정"} · {user.rank || ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {user.role?.displayName}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {info.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="font-medium">{item.value}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
