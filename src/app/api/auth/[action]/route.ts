import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  clearSession,
  createSession,
  getSession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { ORCID_REGEX } from "@/lib/research-data";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const { action } = await context.params;
  if (action !== "me") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const profile = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      institution: true,
      role: true,
      country: true,
      department: true,
      orcid: true,
    },
  });

  return NextResponse.json({ user: profile ?? session });
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

  let body: {
    email?: string;
    password?: string;
    name?: string;
    institution?: string;
    role?: string;
    country?: string;
    department?: string;
    orcid?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (action === "register") {
    const name = (body.name ?? "").trim();
    const institution = (body.institution ?? "").trim();
    const role = (body.role ?? "").trim();
    const country = (body.country ?? "").trim();
    const department = (body.department ?? "").trim() || null;
    const orcidRaw = (body.orcid ?? "").trim().toUpperCase();
    const orcid = orcidRaw || null;

    if (!name || !email || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Official full name, a valid email, and a password of at least 6 characters are required.",
        },
        { status: 400 }
      );
    }

    if (!institution || !role || !country) {
      return NextResponse.json(
        {
          error:
            "Affiliated institution, academic/research role, and country are required.",
        },
        { status: 400 }
      );
    }

    if (orcid && !ORCID_REGEX.test(orcid)) {
      return NextResponse.json(
        {
          error:
            "Invalid ORCID iD format. Use 0000-0000-0000-0000 (or leave blank).",
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
      data: {
        email,
        name,
        passwordHash,
        institution,
        role,
        country,
        department,
        orcid,
      },
    });

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          institution: user.institution,
          role: user.role,
          country: user.country,
          department: user.department,
          orcid: user.orcid,
        },
      },
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
      isAdmin: user.isAdmin,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        institution: user.institution,
        role: user.role,
        country: user.country,
      },
    });
  }

  return NextResponse.json({ error: "Unknown auth action" }, { status: 404 });
}
