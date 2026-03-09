"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createMenuNode, updateMenuNode, deleteMenuNode, reorderMenuNode } from "@/actions/menu-actions";
import { titleToSlug, titleToModuleKey, titleToRoute } from "@/lib/korean-to-slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface MenuNodeFlat {
  id: string;
  title: string;
  slug: string;
  domain: string;
  type: string;
  route: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  parentId: string | null;
  isActive: boolean;
  moduleKey: string | null;
  scopeType: string;
  pageType: string;
  _count: { children: number };
}

const PAGE_TYPES = [
  { value: "NONE", label: "기본" },
  { value: "DOCUMENT_ARCHIVE", label: "문서보관형" },
  { value: "DOCUMENT_APPROVAL", label: "문서결재형" },
  { value: "EQUIPMENT_MASTER", label: "설비 마스터" },
];

const SCOPE_TYPES = [
  { value: "SITE_ONLY", label: "사업장 전용" },
  { value: "GLOBAL_ONLY", label: "통합 전용" },
  { value: "BOTH", label: "통합+사업장" },
];

const DOMAINS = [
  { value: "COMMON", label: "공통" },
  { value: "PRODUCTION", label: "생산기술" },
  { value: "ENV", label: "환경" },
  { value: "SAFETY", label: "안전" },
];

const TYPES = [
  { value: "FOLDER", label: "폴더" },
  { value: "PAGE", label: "페이지" },
];

const COLOR_OPTIONS = [
  { value: "", label: "없음", bg: "bg-gray-200" },
  { value: "blue", label: "Blue", bg: "bg-blue-500" },
  { value: "emerald", label: "Emerald", bg: "bg-emerald-500" },
  { value: "orange", label: "Orange", bg: "bg-orange-500" },
  { value: "violet", label: "Violet", bg: "bg-violet-500" },
  { value: "rose", label: "Rose", bg: "bg-rose-500" },
  { value: "cyan", label: "Cyan", bg: "bg-cyan-500" },
  { value: "amber", label: "Amber", bg: "bg-amber-500" },
  { value: "indigo", label: "Indigo", bg: "bg-indigo-500" },
  { value: "red", label: "Red", bg: "bg-red-500" },
  { value: "green", label: "Green", bg: "bg-green-500" },
  { value: "purple", label: "Purple", bg: "bg-purple-500" },
  { value: "pink", label: "Pink", bg: "bg-pink-500" },
  { value: "teal", label: "Teal", bg: "bg-teal-500" },
  { value: "gray", label: "Gray", bg: "bg-gray-500" },
];

const ICONS = [
  { value: "", label: "없음" },
  { value: "Globe", label: "Globe" },
  { value: "Wrench", label: "Wrench" },
  { value: "Leaf", label: "Leaf" },
  { value: "ShieldCheck", label: "ShieldCheck" },
  { value: "Shield", label: "Shield" },
  { value: "Folder", label: "Folder" },
];

export function MenuCreateButton({ allNodes }: { allNodes: MenuNodeFlat[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await createMenuNode({
        title: fd.get("title") as string,
        slug: fd.get("slug") as string,
        domain: fd.get("domain") as string,
        type: fd.get("type") as string,
        route: (fd.get("route") as string) || undefined,
        icon: (fd.get("icon") as string) || undefined,
        color: (fd.get("color") as string) || undefined,
        sortOrder: Number(fd.get("sortOrder")) || 0,
        parentId: (fd.get("parentId") as string) || undefined,
        moduleKey: (fd.get("moduleKey") as string) || undefined,
        scopeType: (fd.get("scopeType") as string) || "SITE_ONLY",
        pageType: (fd.get("pageType") as string) || "NONE",
      });
      toast.success("메뉴가 추가되었습니다.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "추가에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          메뉴 추가
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>메뉴 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <MenuFormFields allNodes={allNodes} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "추가 중..." : "추가"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MenuEditButton({
  node,
  allNodes,
}: {
  node: MenuNodeFlat;
  allNodes: MenuNodeFlat[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateMenuNode(node.id, {
        title: fd.get("title") as string,
        slug: fd.get("slug") as string,
        domain: fd.get("domain") as string,
        type: fd.get("type") as string,
        route: (fd.get("route") as string) || null,
        icon: (fd.get("icon") as string) || null,
        color: (fd.get("color") as string) || null,
        sortOrder: Number(fd.get("sortOrder")) || 0,
        parentId: (fd.get("parentId") as string) || null,
        isActive: fd.get("isActive") === "true",
        moduleKey: (fd.get("moduleKey") as string) || null,
        scopeType: (fd.get("scopeType") as string) || "SITE_ONLY",
        pageType: (fd.get("pageType") as string) || "NONE",
      });
      toast.success("메뉴가 수정되었습니다.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "수정에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>메뉴 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <MenuFormFields allNodes={allNodes.filter((n) => n.id !== node.id)} defaultValues={node} />
          <div className="flex items-center gap-2">
            <Label htmlFor="isActive">활성 상태</Label>
            <select name="isActive" defaultValue={String(node.isActive)} className="rounded border px-2 py-1 text-sm">
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "수정 중..." : "수정"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MenuDeleteButton({ node }: { node: MenuNodeFlat }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${node.title}" 메뉴를 삭제하시겠습니까?`)) return;
    setLoading(true);
    try {
      await deleteMenuNode(node.id);
      toast.success("메뉴가 삭제되었습니다.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-red-500 hover:text-red-700"
      onClick={handleDelete}
      disabled={loading || node._count.children > 0}
      title={node._count.children > 0 ? "하위 메뉴가 있어 삭제할 수 없습니다" : "삭제"}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function MenuReorderButtons({ nodeId }: { nodeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleReorder = async (direction: "up" | "down") => {
    setLoading(true);
    try {
      await reorderMenuNode(nodeId, direction);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "순서 변경 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleReorder("up")}
        disabled={loading}
        title="위로"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => handleReorder("down")}
        disabled={loading}
        title="아래로"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}

function MenuFormFields({
  allNodes,
  defaultValues,
}: {
  allNodes: MenuNodeFlat[];
  defaultValues?: Partial<MenuNodeFlat>;
}) {
  const isNew = !defaultValues;
  const [slug, setSlug] = useState(defaultValues?.slug || "");
  const [moduleKey, setModuleKey] = useState(defaultValues?.moduleKey || "");
  const [route, setRoute] = useState(defaultValues?.route || "");
  const [selectedColor, setSelectedColor] = useState(defaultValues?.color || "");
  const [autoSync, setAutoSync] = useState(isNew);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!autoSync) return;
      const title = e.target.value;
      if (!title.trim()) return;
      setSlug(titleToSlug(title));
      setModuleKey(titleToModuleKey(title));
      setRoute(titleToRoute(title));
    },
    [autoSync]
  );

  const handleManualEdit = useCallback(
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      setAutoSync(false);
    },
    []
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">제목</Label>
          <Input name="title" required defaultValue={defaultValues?.title} onChange={handleTitleChange} />
          {isNew && (
            <p className="text-xs text-muted-foreground">한글 입력 시 slug·모듈키·경로가 자동 생성됩니다</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input name="slug" required value={slug} onChange={handleManualEdit(setSlug)} placeholder="unique-slug" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>도메인</Label>
          <select name="domain" defaultValue={defaultValues?.domain || "COMMON"} className="w-full rounded border px-3 py-2 text-sm">
            {DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>타입</Label>
          <select name="type" defaultValue={defaultValues?.type || "FOLDER"} className="w-full rounded border px-3 py-2 text-sm">
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="moduleKey">모듈 키</Label>
          <Input name="moduleKey" value={moduleKey} onChange={handleManualEdit(setModuleKey)} placeholder="air_management" />
          <p className="text-xs text-muted-foreground">제목 입력 시 자동 생성 (직접 수정 가능)</p>
        </div>
        <div className="space-y-2">
          <Label>아이콘</Label>
          <select name="icon" defaultValue={defaultValues?.icon || ""} className="w-full rounded border px-3 py-2 text-sm">
            {ICONS.map((i) => (
              <option key={i.value} value={i.value}>{i.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="route">경로</Label>
          <Input name="route" value={route} onChange={handleManualEdit(setRoute)} placeholder="/safety/policy" />
          <p className="text-xs text-muted-foreground">제목 입력 시 자동 생성 (직접 수정 가능)</p>
        </div>
        <div className="space-y-2">
          <Label>스코프 타입</Label>
          <select name="scopeType" defaultValue={defaultValues?.scopeType || "SITE_ONLY"} className="w-full rounded border px-3 py-2 text-sm">
            {SCOPE_TYPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">데이터 입력 가능 범위 설정</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label>페이지 타입</Label>
        <select name="pageType" defaultValue={defaultValues?.pageType || "NONE"} className="w-full rounded border px-3 py-2 text-sm">
          {PAGE_TYPES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">문서보관형: 파일 관리 / 문서결재형: 양식+결재</p>
      </div>
      <div className="space-y-2">
        <Label>카드 색상</Label>
        <input type="hidden" name="color" value={selectedColor} />
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => setSelectedColor(c.value)}
              className={`h-7 w-7 rounded-full ${c.bg} border-2 transition-all ${
                selectedColor === c.value
                  ? "border-black ring-2 ring-black/20 scale-110"
                  : "border-transparent hover:scale-110"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">섹션 카드에 표시될 색상 (미선택 시 자동 배정)</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sortOrder">정렬 순서</Label>
          <Input name="sortOrder" type="number" defaultValue={defaultValues?.sortOrder ?? 0} />
        </div>
        <div className="space-y-2">
          <Label>상위 메뉴</Label>
          <select name="parentId" defaultValue={defaultValues?.parentId || ""} className="w-full rounded border px-3 py-2 text-sm">
            <option value="">없음 (최상위)</option>
            {allNodes
              .filter((n) => n.type === "FOLDER")
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title} ({n.domain})
                </option>
              ))}
          </select>
        </div>
      </div>
    </>
  );
}
