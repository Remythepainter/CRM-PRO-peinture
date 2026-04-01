import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseAuth = vi.fn();
const mockUseUserRole = vi.fn();

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => mockUseUserRole() }));

import { useCanModify } from "@/hooks/useCanModify";

describe("useCanModify", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin can modify any record", () => {
    mockUseAuth.mockReturnValue({ user: { id: "admin-id" } });
    mockUseUserRole.mockReturnValue({ role: "admin", isAdmin: true, isLoading: false });

    const { result } = renderHook(() => useCanModify());
    expect(result.current.canModify("other-user-id")).toBe(true);
    expect(result.current.canModify(null)).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });

  it("employee can only modify own records", () => {
    mockUseAuth.mockReturnValue({ user: { id: "emp-id" } });
    mockUseUserRole.mockReturnValue({ role: "employee", isAdmin: false, isLoading: false });

    const { result } = renderHook(() => useCanModify());
    expect(result.current.canModify("emp-id")).toBe(true);
    expect(result.current.canModify("other-id")).toBe(false);
    expect(result.current.canModify(null)).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it("unauthenticated user cannot modify anything", () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockUseUserRole.mockReturnValue({ role: "employee", isAdmin: false, isLoading: false });

    const { result } = renderHook(() => useCanModify());
    expect(result.current.canModify("any-id")).toBe(false);
  });
});
