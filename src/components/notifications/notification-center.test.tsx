// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationCenter } from "./notification-center";

describe("NotificationCenter", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows transfer alerts and marks only returned ids as read", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ notifications: [{
          id: "11111111-1111-4111-8111-111111111111",
          title: "전달이 완료되었습니다.",
          message: "카메라 장비가 이수신님에게 전달되었습니다.",
          createdAt: "2026-07-13T10:00:00.000Z"
        }] })
      })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<NotificationCenter />);

    expect(await screen.findByText("전달이 완료되었습니다.")).toBeVisible();
    expect(screen.getByText("카메라 장비가 이수신님에게 전달되었습니다.")).toBeVisible();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/notifications", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ auditEventIds: ["11111111-1111-4111-8111-111111111111"] })
    })));
  });

  it("keeps every returned notification visible before marking it read", async () => {
    const notifications = [1, 2, 3].map((index) => ({
      id: `${index}1111111-1111-4111-8111-111111111111`,
      title: "전달이 완료되었습니다.",
      message: `${index}번째 장비 전달 알림`,
      createdAt: `2026-07-13T10:0${index}:00.000Z`
    }));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ notifications }) })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);

    render(<NotificationCenter />);

    for (const notification of notifications) expect(await screen.findByText(notification.message)).toBeVisible();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/notifications", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ auditEventIds: notifications.map((item) => item.id) })
    })));
  });
});
