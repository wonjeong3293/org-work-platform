import { getProjects } from "@/actions/project-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, Users } from "lucide-react";
import Link from "next/link";
import { PROJECT_STATUS } from "@/lib/constants";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">프로젝트</h1>
          <p className="text-sm text-muted-foreground">프로젝트를 관리합니다.</p>
        </div>
        <Button size="sm" asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            새 프로젝트
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const status = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS];
          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="transition-colors hover:bg-gray-50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FolderKanban className="h-5 w-5 text-primary" />
                      {project.name}
                    </CardTitle>
                    <Badge variant={project.status === "ACTIVE" ? "default" : "secondary"}>
                      {status?.label || project.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {project._count.members}명
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {projects.length === 0 && (
        <div className="text-center py-12">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">아직 프로젝트가 없습니다.</p>
          <Button asChild className="mt-4">
            <Link href="/projects/new">첫 프로젝트 만들기</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
