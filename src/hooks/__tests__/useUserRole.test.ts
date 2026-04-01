import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock useAuth
const mockUser = { id: "test-user-id" };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: mockUser, session: {}, loading: false, signOut: vi.fn() })),
}));

// Mock supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ order: mockOrder });
  mockOrder.mockReturnValue({ limit: mockLimit });
});

describe("useUserRole", () => {
  it("returns admin role when user has admin role in DB", async () => {
    mockLimit.mockResolvedValue({
      data: [{ role: "admin", created_at: "2024-01-01" }],
      error: null,
    });

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBe("admin");
    expect(result.current.isAdmin).toBe(true);
  });

  it("returns employee role when user has employee role in DB", async () => {
    mockLimit.mockResolvedValue({
      data: [{ role: "employee", created_at: "2024-01-01" }],
      error: null,
    });

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBe("employee");
    expect(result.current.isAdmin).toBe(false);
  });

  it("defaults to employee when no role found", async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.role).toBe("employee");
    expect(result.current.isAdmin).toBe(false);
  });

  it("does not fetch when user is null", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, session: null, loading: false, signOut: vi.fn() });

    const { result } = renderHook(() => useUserRole(), { wrapper: createWrapper() });

    expect(result.current.role).toBe("employee");
    expect(result.current.isAdmin).toBe(false);
  });
});
