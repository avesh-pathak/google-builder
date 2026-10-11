import { analyzeMenu } from "@/lib/ai/menu-analyzer";
import { AIError, errorResponse } from "@/lib/ai/errors";
import { jsonResponse, readBoundedBody } from "@/lib/ai/http";
import { MAX_IMAGE_BYTES } from "@/lib/ai/schemas";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data")) throw new AIError(415, "INVALID_CONTENT_TYPE", "Upload your image using multipart/form-data.");
    const bytes = await readBoundedBody(request, MAX_IMAGE_BYTES + 64 * 1024);
    let form: FormData;
    try { form = await new Response(bytes as BodyInit, { headers: { "Content-Type": contentType } }).formData(); }
    catch { throw new AIError(400, "INVALID_UPLOAD", "Unable to read this upload. Please choose the photo again."); }
    const image = form.get("image");
    if (!(image instanceof File)) throw new AIError(400, "MISSING_IMAGE", "Please select a menu photo first.");
    if (form.getAll("image").length !== 1) throw new AIError(400, "MULTIPLE_IMAGES", "Upload one menu photo at a time.");
    return jsonResponse(await analyzeMenu(image, request.signal));
  } catch (error) { return errorResponse(error); }
}
