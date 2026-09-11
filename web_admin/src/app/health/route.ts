import { createHealthPayload } from "@/lib/api/health";

export function GET() {
  return Response.json(createHealthPayload());
}
