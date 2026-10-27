import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Building2, GraduationCap, LayoutGrid, Moon, Sun, UserCheck } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/features/companies/Hooks/companies.hooks";
import { APP_NAME, COLLEGE_SHORT } from "@/lib/college";
import { cn } from "@/lib/utils";

const NAV = [
  { title: "Company Intelligence", url: "/company/intelligence", icon: Building2 },
  { title: "Skill Intelligence", url: "/company/skills", icon: GraduationCap },
  { title: "Talent Check", url: "/talent-check", icon: UserCheck },
] as const;

// `.dark` drives the Tailwind/shadcn palette, `.light-theme` drives the SCSS tokens in src/styles.
function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light-theme", !dark);
}

function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkStored =
      localStorage.getItem("theme") === "dark" ||
      (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setIsDark(isDarkStored);
    applyTheme(isDarkStored);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    applyTheme(nextDark);
    localStorage.setItem("theme", nextDark ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="h-8 w-8 rounded-lg text-muted-foreground transition-colors hover:text-foreground"
    >
      {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { selected } = useCompany();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border/80 px-4 py-3.5">
        <Link to="/" className="flex items-center gap-2.5 overflow-hidden focus:outline-none">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 font-heading text-xs font-bold text-zinc-100 shadow-sm">
            PI
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-heading text-sm font-bold tracking-tight text-sidebar-foreground">
              {APP_NAME}
            </p>
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {COLLEGE_SHORT} Placement Hub
            </p>
          </div>
        </Link>
      </SidebarHeader>

      {/* Current Selected Company Quick Glance */}
      {selected && (
        <div className="border-b border-sidebar-border/60 p-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center gap-2.5 rounded-xl border border-sidebar-border/70 bg-card/60 p-2.5 shadow-2xs">
            <CompanyLogo
              name={selected.companyName}
              logoUrl={selected.logoUrl}
              className="h-8 w-8"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">
                {selected.companyName}
              </p>
              <Link
                to="/"
                className="inline-flex items-center text-[10px] font-medium text-primary hover:underline"
              >
                Change Company
              </Link>
            </div>
          </div>
        </div>
      )}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
            Intelligence Modules
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const isActive = path === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        "rounded-xl py-2 font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/80 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="All Companies Directory"
              className="rounded-xl py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Link to="/">
                <LayoutGrid className="h-4 w-4" />
                <span>All Companies</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AppLayout() {
  const { selected } = useCompany();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isSkillsPage = path.endsWith("/skills");
  const isTalentCheck = path.startsWith("/talent-check");

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top layout navigation bar */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/80 bg-background/95 px-4 backdrop-blur-md">
            <div className="flex items-center gap-3 overflow-hidden">
              <SidebarTrigger />
              <Breadcrumb className="hidden sm:block">
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/"
                        className="text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        Companies Directory
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {selected && (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem className="max-w-[200px] truncate text-xs font-semibold text-foreground">
                        {selected.companyName}
                      </BreadcrumbItem>
                    </>
                  )}
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="text-xs font-semibold text-primary">
                      {isTalentCheck
                        ? "Talent Check & Readiness"
                        : isSkillsPage
                          ? "Skill Intelligence"
                          : "Company Intelligence"}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Quick nav switcher pills and theme toggle */}
            <div className="flex items-center gap-2">
              <div className="hidden rounded-xl border border-border/70 bg-secondary/60 p-0.5 sm:flex">
                <Link
                  to="/company/intelligence"
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-all",
                    !isSkillsPage && !isTalentCheck
                      ? "bg-card text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Company Intel</span>
                </Link>
                <Link
                  to="/company/skills"
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-all",
                    isSkillsPage
                      ? "bg-card text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Skill Roadmap</span>
                </Link>
                <Link
                  to="/talent-check"
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-all",
                    isTalentCheck
                      ? "bg-card text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Talent Check</span>
                </Link>
              </div>

              <Link to="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden h-8 rounded-lg text-xs md:inline-flex"
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Directory
                </Button>
              </Link>

              <ThemeToggle />
            </div>
          </header>

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
