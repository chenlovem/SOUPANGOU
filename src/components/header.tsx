"use client";

import Link from "next/link";
import { Logo } from "./logo";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { label: "首页", href: "/" },
  { label: "资源", href: "/resource" },
  { label: "进阶搜索", href: "https://chenlovem.github.io/TG-SEARCH/", external: true },
];

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" title="搜盘狗" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-xl font-bold text-blue-500">搜盘狗</span>
          </Link>
          <nav className="hidden md:flex">
            <ul className="flex gap-5">
              {navItems.map((item) => {
                const isActive =
                  !item.external &&
                  (pathname === item.href ||
                    (item.href !== "/" && pathname?.startsWith(item.href)));

                return (
                  <li key={item.href}>
                    {item.external ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={item.label}
                        className="text-sm font-medium text-gray-600 hover:text-blue-500 dark:text-gray-300 dark:hover:text-blue-400"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        title={item.label}
                        className={`text-sm font-medium ${
                          isActive
                            ? "text-blue-500 font-semibold"
                            : "text-gray-600 hover:text-blue-500 dark:text-gray-300 dark:hover:text-blue-400"
                        }`}
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {/* 主题切换：右侧按钮 */}
          <ThemeToggle />
          {/* <Button variant="outline" size="sm" className="hidden md:flex">
            登录/注册
          </Button>
          <div className="rounded-full bg-gray-100 p-1">
            <span className="text-xs">用户</span>
          </div> */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={toggleMobileMenu}
            aria-label="切换菜单"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </Button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4">
            <nav>
              <ul className="space-y-3">
                {navItems.map((item) => {
                  const isActive =
                    !item.external &&
                    (pathname === item.href ||
                      (item.href !== "/" && pathname?.startsWith(item.href)));

                  return (
                    <li key={item.href}>
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-base font-medium py-2 text-gray-600 hover:text-blue-500 dark:text-gray-300 dark:hover:text-blue-400"
                          onClick={closeMobileMenu}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className={`block text-base font-medium py-2 ${
                            isActive
                              ? "text-blue-500 font-semibold"
                              : "text-gray-600 hover:text-blue-500 dark:text-gray-300 dark:hover:text-blue-400"
                          }`}
                          onClick={closeMobileMenu}
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
