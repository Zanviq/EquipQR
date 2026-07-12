import type { UserRole } from "@/generated/prisma/enums";
import { DomainError } from "@/server/domain/errors";
import { getSessionUser, SESSION_COOKIE } from "./session";

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  const pair = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}

export async function getRequestUser(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  return token ? getSessionUser(token) : null;
}

export async function requireRequestUser(request: Request, role?: UserRole) {
  const user = await getRequestUser(request);
  if (!user) throw new DomainError("AUTH_REQUIRED", "로그인이 필요합니다.", 401);
  if (role && user.role !== role) throw new DomainError("FORBIDDEN", "권한이 없습니다.", 403);
  return user;
}
