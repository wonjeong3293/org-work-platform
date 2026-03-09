"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

const registerSchema = z.object({
  name: z.string().min(2, "이름은 2자 이상이어야 합니다"),
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
  employeeNumber: z.string().optional(),
});

export async function loginAction(
  _prevState: { error: string } | undefined,
  formData: FormData
) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };
  }

  redirect("/dashboard");
}

export async function registerAction(
  _prevState: { error: string } | undefined,
  formData: FormData
) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    employeeNumber: formData.get("employeeNumber") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (existing) {
    return { error: "이미 등록된 이메일입니다" };
  }

  if (parsed.data.employeeNumber) {
    const existingEmp = await prisma.user.findUnique({
      where: { employeeNumber: parsed.data.employeeNumber },
    });
    if (existingEmp) {
      return { error: "이미 등록된 사번입니다" };
    }
  }

  const hashedPassword = await hash(parsed.data.password, 12);
  const memberRole = await prisma.role.findUnique({
    where: { name: "MEMBER" },
  });

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
      employeeNumber: parsed.data.employeeNumber || null,
      roleId: memberRole?.id,
    },
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
    return { error: "계정 생성 후 로그인에 실패했습니다. 다시 로그인해주세요." };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
