import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = path.startsWith("/login") || path.startsWith("/_next") || path.startsWith("/api");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = destinoPorPapel(profile?.role);
    return NextResponse.redirect(url);
  }

  // bloqueia acesso cruzado entre áreas (ex: técnico tentando abrir /admin)
  if (user && (path.startsWith("/admin") || path.startsWith("/suprimentos") || path.startsWith("/tecnico"))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const areaPermitida = destinoPorPapel(profile?.role);
    if (!path.startsWith(areaPermitida)) {
      const url = request.nextUrl.clone();
      url.pathname = areaPermitida;
      return NextResponse.redirect(url);
    }
  }

  return response;
}

function destinoPorPapel(role) {
  if (role === "admin") return "/admin";
  if (role === "suprimentos") return "/suprimentos";
  return "/tecnico";
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
