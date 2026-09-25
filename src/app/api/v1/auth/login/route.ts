import { NextResponse } from "next/server";
import { db, createSessionToken } from "@/lib/server-db";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const user = db.users.find(
      (u) => u.email.toLowerCase() === (email || "").toLowerCase()
    );

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password", error: "bad_credentials" },
        { status: 401 }
      );
    }

    if (user.password && user.password !== password) {
      return NextResponse.json(
        { message: "Invalid email or password", error: "bad_credentials" },
        { status: 401 }
      );
    }

    const token = createSessionToken(user.id);
    const response = NextResponse.json({
      accessToken: token,
      tokenType: "Bearer",
      expiresIn: 3600,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });

    response.cookies.set("anifire_csrf", "csrf_" + Math.random().toString(36).slice(2), {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch {
    return NextResponse.json({ message: "Login failed" }, { status: 400 });
  }
}
