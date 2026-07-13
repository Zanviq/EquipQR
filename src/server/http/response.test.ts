import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { domainErrorResponse } from "./response";

describe("domainErrorResponse", () => {
  it("maps malformed JSON and Zod validation errors to 400", async () => {
    const malformed = domainErrorResponse(new SyntaxError("Unexpected token"));
    const invalid = domainErrorResponse(z.object({ name: z.string() }).safeParse({}).error);

    expect(malformed.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(await malformed.json()).toMatchObject({ code: "INVALID_REQUEST" });
    expect(await invalid.json()).toMatchObject({ code: "INVALID_REQUEST" });
  });

  it.each([
    ["P2002", 409, "DUPLICATE_RESOURCE"],
    ["P2003", 409, "STATE_CONFLICT"],
    ["P2025", 404, "NOT_FOUND"],
    ["P2034", 409, "STATE_CONFLICT"]
  ])("maps Prisma %s to a client-safe %s response", async (prismaCode, status, code) => {
    const response = domainErrorResponse({ code: prismaCode, message: "database details" });

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ code });
  });

  it("keeps unexpected errors private and reports a tracking id", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = domainErrorResponse(new Error("secret detail"));

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: "INTERNAL_ERROR", trackingId: expect.any(String) });
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
