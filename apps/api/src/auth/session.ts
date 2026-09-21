import { authAdminRevokeUserSessions, authAuthenticateCreateSession, authPasswordChallenge, authRevokeAllSelfSessions, authRevokeSelfSession, authRotateSession, authSessionProjection, derivePasswordHash, prisma, type Prisma } from "@vanstro/db";
import { getConnInfo } from "@hono/node-server/conninfo";
import { createHash, randomBytes } from "node:crypto";
import type { Context } from "hono";
import { trustProxyHeaders } from "../config.js";
import { resolveEffectiveAuthPolicy } from "./policy.js";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const DEPLOYMENT_SESSION_COOKIE_NAME = "__Host-vanstro-session";
export const DEVELOPMENT_SESSION_COOKIE_NAME = "vanstro-session";

export function sessionCookieName() {
  return process.env.VANSTRO_RUNTIME_MODE === "deployment"
    ? DEPLOYMENT_SESSION_COOKIE_NAME
    : DEVELOPMENT_SESSION_COOKIE_NAME;
}

export type SessionUser = {
  id: string;
  email: string;
  kind: string;
  status: string;
  roles: string[];
  permissions: string[];
};

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function extractBearerToken(context: Context) {
  const authorization = context.req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.slice("Bearer ".length).trim();
}

function extractCookieToken(context: Context) {
  const cookie = context.req.header("cookie");
  if (!cookie) return undefined;
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === sessionCookieName()) {
      try {
        return decodeURIComponent(value.join("="));
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function extractSessionToken(context: Context) {
  return extractBearerToken(context) ?? extractCookieToken(context);
}

export function getRequestIp(context: Context) {
  if (trustProxyHeaders()) {
    const cloudflareAddress = context.req.header("cf-connecting-ip")?.trim();
    if (cloudflareAddress) return cloudflareAddress;

    const forwardedFor = context.req.header("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0]?.trim();

    const realIp = context.req.header("x-real-ip")?.trim();
    if (realIp) return realIp;
  }

  try {
    return getConnInfo(context).remote.address;
  } catch {
    return undefined;
  }
}

function formatUser(user: {
  id: string;
  email: string;
  kind: string;
  status: string;
  userRoles: Array<{
    role: {
      key: string;
      rolePermissions: Array<{ permission: { key: string } }>;
    };
  }>;
}): SessionUser {
  const permissions = new Set<string>();

  for (const userRole of user.userRoles) {
    for (const rolePermission of userRole.role.rolePermissions) {
      permissions.add(rolePermission.permission.key);
    }
  }

  return {
    id: user.id,
    email: user.email,
    kind: user.kind,
    status: user.status,
    roles: user.userRoles.map((userRole) => userRole.role.key),
    permissions: [...permissions].sort()
  };
}

export async function getSessionUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true }
              }
            }
          }
        }
      }
    }
  });

  if (!user || user.status !== "active") return undefined;

  return formatUser(user);
}

export async function authenticateAndCreateSession(email:string,password:string,options:{userAgent?:string;ipAddress?:string}={}){
 const challenge=await authPasswordChallenge(prisma,email);if(!challenge)return{authenticated:false as const};const candidateHash=derivePasswordHash(password,{algorithm:challenge.algorithm,passwordSalt:challenge.password_salt,iterations:challenge.iterations}),token=randomBytes(32).toString("base64url"),policy=await resolveEffectiveAuthPolicy(),expiresAt=new Date(Date.now()+policy.sessionPolicy.sessionLifetimeMinutes*60_000),userId=await authAuthenticateCreateSession(prisma,{email,candidateHash,tokenHash:hashSessionToken(token),userAgent:options.userAgent,ipAddress:options.ipAddress,expiresAt});if(!userId)return{authenticated:false as const,userId:challenge.user_id};const projected=await authSessionProjection(prisma,hashSessionToken(token));if(!projected)return{authenticated:false as const};return{authenticated:true as const,session:{accessToken:token,tokenType:"Bearer" as const,expiresAt},user:{id:projected.user_id,email:projected.email,kind:projected.kind,status:projected.status,roles:projected.roles,permissions:projected.permissions}}
}

export async function createSession(userId:string,options:{userAgent?:string;ipAddress?:string}={}){const setupUrl=process.env.VANSTRO_TEST_SETUP_DATABASE_URL;if(!setupUrl||!/(test|smoke|disposable|fixture)/i.test(new URL(setupUrl).pathname))throw new Error("AUTH_TEST_SESSION_FORBIDDEN");const {PrismaClient}=await import("@vanstro/db");const setup=new PrismaClient({datasources:{db:{url:setupUrl}}});try{const token=randomBytes(32).toString("base64url"),expiresAt=new Date(Date.now()+SESSION_TTL_MS);await setup.refreshSession.create({data:{userId,tokenHash:hashSessionToken(token),userAgent:options.userAgent,ipAddress:options.ipAddress,expiresAt}});return{accessToken:token,tokenType:"Bearer" as const,expiresAt}}finally{await setup.$disconnect()}}

export async function rotateSession(token:string,options:{userAgent?:string;ipAddress?:string}={}){const nextToken=randomBytes(32).toString("base64url"),nextTokenHash=hashSessionToken(nextToken),policy=await resolveEffectiveAuthPolicy(),expiresAt=new Date(Date.now()+policy.sessionPolicy.sessionLifetimeMinutes*60_000),userId=await authRotateSession(prisma,{oldTokenHash:hashSessionToken(token),newTokenHash:nextTokenHash,userAgent:options.userAgent,ipAddress:options.ipAddress,expiresAt});if(!userId)return undefined;const projected=await authSessionProjection(prisma,nextTokenHash);if(!projected)return undefined;return{accessToken:nextToken,tokenType:"Bearer" as const,expiresAt,user:{id:projected.user_id,email:projected.email,kind:projected.kind,status:projected.status,roles:projected.roles,permissions:projected.permissions}}}

export async function revokeUserSessions(transaction:Prisma.TransactionClient,userId:string,authorization:{sessionTokenHash:string;actorId:string}){await authAdminRevokeUserSessions(transaction,{...authorization,targetUserId:userId})}
export async function revokeAllSelfSessions(token:string){await authRevokeAllSelfSessions(prisma,hashSessionToken(token))}

export async function getSessionFromRequest(context: Context) {
  const token = extractSessionToken(context);

  if (!token) return undefined;

  const projected=await authSessionProjection(prisma,hashSessionToken(token));if(!projected)return undefined;return{sessionId:projected.session_id,sessionTokenHash:projected.session_token_hash,user:{id:projected.user_id,email:projected.email,kind:projected.kind,status:projected.status,roles:projected.roles,permissions:projected.permissions}};
}

export async function revokeToken(token: string) {
  await authRevokeSelfSession(prisma,hashSessionToken(token));
}
