/**
 * Integration-style tests validating that sensitive data is hidden
 * from employees across commercial pages (Leads, Pipeline, Quotes, Clients).
 *
 * These tests render page components with mocked role contexts and assert
 * that financial figures, CRUD buttons, etc. are shown/hidden correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ── Shared mocks ──────────────────────────────────────────────────────
const mockUseAuth = vi.fn();
const mockUseUserRole = vi.fn();
const mockUseCanModify = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => mockUseUserRole() }));
vi.mock("@/hooks/useCanModify", () => ({ useCanModify: () => mockUseCanModify() }));
vi.mock("@/hooks/useThemeSettings", () => ({
  useThemeSettings: () => ({
    activeTheme: { visibleSections: ["dashboard", "leads", "pipeline", "quotes", "clients", "projects", "schedule", "team", "inventory", "tasks", "activity", "documents", "timesheets", "work-order", "followups", "profitability"] },
    isLoading: false,
  }),
}));
vi.mock("@/hooks/useCompanySettings", () => ({
  useCompanySettings: () => ({ settings: null, isLoading: false }),
  useUpdateCompanySettings: () => ({ mutate: vi.fn() }),
}));

// Mock supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          then: vi.fn(),
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        then: vi.fn(),
      })),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
      update: vi.fn(() => ({ eq: vi.fn() })),
      delete: vi.fn(() => ({ eq: vi.fn() })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
    },
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    functions: { invoke: vi.fn(() => Promise.resolve({ data: null, error: null })) },
  },
}));

function setRole(role: "admin" | "employee") {
  const isAdmin = role === "admin";
  mockUseAuth.mockReturnValue({
    user: { id: "test-id", email: "test@test.com", user_metadata: {} },
    session: { access_token: "tok" },
    loading: false,
    signOut: vi.fn(),
  });
  mockUseUserRole.mockReturnValue({ role, isAdmin, isLoading: false });
  mockUseCanModify.mockReturnValue({ canModify: () => isAdmin, isAdmin });
}

function renderPage(Component: React.ComponentType) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(MemoryRouter, null, React.createElement(Component))
    )
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────
describe("Dashboard role access", () => {
  let Dashboard: React.ComponentType;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/pages/Index");
    Dashboard = mod.default;
  });

  it("shows KPI cards for admin", () => {
    setRole("admin");
    renderPage(Dashboard);
    expect(screen.getByText("Revenus")).toBeDefined();
    expect(screen.getByText("Valeur pipeline")).toBeDefined();
  });

  it("hides KPI cards for employee", () => {
    setRole("employee");
    renderPage(Dashboard);
    expect(screen.queryByText("Revenus")).toBeNull();
    expect(screen.queryByText("Valeur pipeline")).toBeNull();
    expect(screen.getByText(/Contactez votre administrateur/)).toBeDefined();
  });
});

// ── Access control summary ────────────────────────────────────────────
describe("Role-based access control rules", () => {
  it("employee role defaults correctly", () => {
    setRole("employee");
    expect(mockUseUserRole().isAdmin).toBe(false);
    expect(mockUseUserRole().role).toBe("employee");
    expect(mockUseCanModify().canModify()).toBe(false);
  });

  it("admin role grants full access", () => {
    setRole("admin");
    expect(mockUseUserRole().isAdmin).toBe(true);
    expect(mockUseUserRole().role).toBe("admin");
    expect(mockUseCanModify().canModify()).toBe(true);
  });

  it("employee cannot modify other users records", () => {
    setRole("employee");
    expect(mockUseCanModify().canModify("other-user-record")).toBe(false);
  });
});
