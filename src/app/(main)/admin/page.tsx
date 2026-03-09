import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Menu, UserCog, GitBranch, MapPin, FileText, ClipboardCheck } from "lucide-react";
import Link from "next/link";

export default async function AdminPage() {
  const session = await auth();
  if (!(session?.user as Record<string, unknown>)?.isAdmin) {
    redirect("/dashboard");
  }

  const adminLinks = [
    { title: "메뉴 관리", description: "좌측 네비게이션 메뉴 추가/수정/삭제/순서변경", href: "/admin/menus", icon: Menu },
    { title: "사용자 관리", description: "사용자 목록, 역할 변경, 활성/비활성", href: "/admin/users", icon: UserCog },
    { title: "부서 관리", description: "부서 추가/수정/비활성화, 계층 구조 관리", href: "/admin/departments", icon: GitBranch },
    { title: "사업장 관리", description: "사업장(사이트) 등록/비활성화 관리", href: "/admin/sites", icon: MapPin },
    { title: "양식 관리", description: "문서결재형 페이지의 양식 템플릿 등록/수정/삭제", href: "/admin/forms", icon: FileText },
    { title: "결재 관리", description: "결재 문서 조회/삭제, 테스트 데이터 정리", href: "/admin/approvals", icon: ClipboardCheck },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">관리자</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {adminLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="transition-all hover:shadow-md cursor-pointer h-full">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-xl bg-primary/10 p-3">
                  <link.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{link.title}</p>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
