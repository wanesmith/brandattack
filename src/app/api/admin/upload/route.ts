import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ADMIN_COOKIE_NAME, isValidSessionCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Client-upload token endpoint for Vercel Blob. The browser uploads the file
// straight to Blob (bypassing the 4.5 MB serverless body limit) after this
// route mints a scoped token. Admin auth is enforced in onBeforeGenerateToken
// (phase 1, which carries the admin cookie); the onUploadCompleted callback is
// a signed server-to-server request from Blob and must not be cookie-gated.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const store = await cookies();
        if (!isValidSessionCookie(store.get(ADMIN_COOKIE_NAME)?.value)) {
          throw new Error("Unauthorized");
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
            "image/gif",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        // Runs on Vercel (won't fire on localhost — the client still gets the URL).
        console.log("[blob] upload completed:", blob.url);
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 }
    );
  }
}
