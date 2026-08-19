import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Issues client-upload tokens; the actual bytes go browser → Blob directly.
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "application/pdf",
          "image/png",
          "image/jpeg",
          "text/plain",
          "text/markdown",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        maximumSizeInBytes: 50 * 1024 * 1024,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        /* filing happens via /api/resources from the client */
      },
    });
    return Response.json(json);
  } catch (e) {
    return new Response((e as Error).message, { status: 400 });
  }
}
