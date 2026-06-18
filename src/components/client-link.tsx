"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Loader2, ExternalLink, QrCode } from "lucide-react";
import dynamic from "next/dynamic";

// 动态导入QRCode组件，避免SSR问题
const QRCode = dynamic(() => import("react-qr-code"), {
  ssr: false,
  loading: () => <Loader2 className="h-8 w-8 animate-spin text-primary" />,
});

interface ClientLinkProps {
  id: number;
  title: string;
  categoryKey: string;
  url: string;
  externalUrl: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

export function ClientLink({
  id,
  title,
  categoryKey,
  url,
  externalUrl,
  children,
  ...restProps
}: ClientLinkProps): JSX.Element {
  const [loading, setLoading] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [successUrl, setSuccessUrl] = useState("");

  // 已有 URL → 直接跳转，不需要弹窗
  const finalUrl = url || successUrl;

  const handleClick = async () => {
    // 如果已有URL，直接打开
    if (url) {
      window.open(url, "_blank");
      return;
    }

    // 没有URL时调用API获取转存链接
    setLoading(true);
    try {
      const response = await fetch("/api/resource-disk/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, categoryKey, externalUrl }),
      });
      const data = await response.json();
      if (data.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("获取链接失败:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button onClick={handleClick} {...restProps} disabled={loading}>
          {loading ? "获取中..." : children}
        </Button>
        {finalUrl && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(finalUrl, "_blank")}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              打开链接
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQrOpen(true)}
              className="flex items-center gap-1"
            >
              <QrCode className="h-4 w-4" />
              二维码
            </Button>
          </>
        )}
      </div>

      {/* 扫码弹窗（备选，默认不再弹出） */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>扫描二维码</DialogTitle>
            <DialogDescription>
              手机扫码直接访问资源链接
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="bg-white p-4 rounded-md">
              {finalUrl && <QRCode value={finalUrl} size={200} />}
            </div>
            <p className="text-sm text-muted-foreground break-all text-center max-w-full">
              <a href={finalUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {finalUrl}
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
