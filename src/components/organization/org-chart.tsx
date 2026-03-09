"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Department = {
  id: string;
  name: string;
  code: string;
  _count: { members: number };
  members: { id: string; name: string; position: string | null; profileImage: string | null }[];
  children: Department[];
};

export function OrgChart({ departments }: { departments: Department[] }) {
  return (
    <div className="space-y-2">
      {departments.map((dept) => (
        <OrgNode key={dept.id} department={dept} level={0} />
      ))}
    </div>
  );
}

function OrgNode({ department, level }: { department: Department; level: number }) {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = department.children && department.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-lg border bg-white p-3 transition-colors hover:bg-gray-50",
          level > 0 && "ml-8"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )
        ) : (
          <div className="w-4" />
        )}
        <div className="flex flex-1 items-center justify-between">
          <div>
            <span className="font-medium">{department.name}</span>
            <span className="ml-2 text-sm text-muted-foreground">
              ({department.code})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {department._count.members}명
            </Badge>
          </div>
        </div>
      </div>

      {expanded && (
        <>
          {department.members.length > 0 && (
            <div className={cn("mt-1 space-y-1", level > 0 ? "ml-16" : "ml-8")}>
              {department.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 rounded px-3 py-1.5 text-sm"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {member.name.charAt(0)}
                  </div>
                  <span>{member.name}</span>
                  {member.position && (
                    <span className="text-muted-foreground">
                      · {member.position}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {hasChildren &&
            department.children.map((child) => (
              <OrgNode key={child.id} department={child as Department} level={level + 1} />
            ))}
        </>
      )}
    </div>
  );
}
