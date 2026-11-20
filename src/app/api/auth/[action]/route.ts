import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  clearSession,
  createSession,
  getSession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const { action } = await context.params;
  if (action !== "me") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await getSession();
  return NextResponse.json({ user: session });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const { action } = await context.params;

  if (action === "logout") {
    await clearSession();
    return NextResponse.json({ ok: true });
  }

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (action === "register") {
    const name = (body.name ?? "").trim();
    if (!name || !email || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Name, a valid email, and a password of at least 6 characters are required.",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
    });

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 }
    );
  }

  if (action === "login") {
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
    });
  }

  return NextResponse.json({ error: "Unknown auth action" }, { status: 404 });
}
