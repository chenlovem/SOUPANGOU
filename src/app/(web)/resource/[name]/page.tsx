import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Download,
  AlertTriangle,
  ChevronRight,
  TriangleAlert,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getRelatedResources,
  getResourceByPinyin,
} from "@/lib/db/queries/resource";
import { ClientLink } from "@/components/client-link";
import ClickboardButton from "@/components/clickboard-button";
import type { Metadata } from "next";
import { formatDate } from "@/utils";
import type { Resource } from "@/lib/db/schema";
import Image from "next/image";
import { ImagePreview } from "@/components/image-preview";
import { getCategoryByKey } from "@/lib/db/queries/category";
import { cn } from "@/lib/utils";
import { WechatQRModal } from "@/components/wechat-qr-modal";

/**
 * 根据磁盘类型返回对应的图标
 */
const getDiskTypeIcon = (diskType: string) => {
  switch (diskType?.toLowerCase()) {
    case "百度":
      return (
        <Image
          src="/baidu_icon.svg"
          alt="百度"
          width={40}
          height={40}
          className="inline-block"
        />
      );
    case "夸克":
      return (
        <Image
          src="/quark_icon.svg"
          alt="夸克"
          width={80}
          height={80}
          className="inline-block"
        />
      );
    default:
      return null;
  }
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const name = (await params).name;
  const resource = await getResourceByPinyin(name);
  return {
    title: `${resource?.title || ""}${
      resource?.diskType || ""
    }网盘资源下载 - ${process.env.SITE_NAME}`,
    description:
      resource?.desc ||
      `${process.env.SITE_NAME}是一个一站式网盘资源搜索引擎，支持夸克网盘、百度网盘、阿里云盘等多平台，快速精准搜索，一键直达`,
  };
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const name = (await params).name;
  const resource = await getResourceByPinyin(name);
  let relatedResources: Resource[] = [];
  if (resource?.title) {
    relatedResources = await getRelatedResources(
      resource.title,
      resource.categoryKey,
      resource.id,
    );
  }

  if (!resource) {
    return (
      <div className="container flex justify-center items-center mt-60">
        资源不存在
      </div>
    );
  }
  const category = await getCategoryByKey(resource.categoryKey);

  return (
    <div className="container mx-auto py-6 text-base">
      <div className="flex items-center text-sm text-muted-foreground mb-4 overflow-hidden flex-nowrap">
        <Link href="/" className="hover:underline whitespace-nowrap shrink-0">
          首页
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link
          href="/resource"
          className="hover:underline whitespace-nowrap shrink-0"
        >
          资源
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link
          href={`/resource?category=${resource.categoryKey}`}
          className="hover:underline whitespace-nowrap shrink-0"
        >
          {category?.name}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-foreground truncate min-w-0 flex-1">
          {resource.title}
        </span>
      </div>

      <div className="rounded-lg mb-6 flex flex-col items-center md:flex-row md:items-start gap-6 p-1">
        {resource.cover && (
          <div className="min-w-[160px]">
            <ImagePreview
              src={resource.cover}
              alt={resource.title}
              className="w-[160px] h-auto object-cover rounded-md"
            />
          </div>
        )}
        <div className="flex-1">
          <h1
            className={cn(
              "text-2xl font-bold mb-6",
              resource.cover ? "text-left" : " text-center",
            )}
          >
            {resource.title}
          </h1>

          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="font-medium mb-2">资源描述:</span>
              <p className="text-muted-foreground break-all md:break-words whitespace-pre-line">
                {resource.desc}
              </p>
            </div>

            <div className="flex items-center">
              <span className="font-medium mr-2">更新时间:</span>
              <span className="text-muted-foreground">
                {resource.updatedAt ? formatDate(resource.updatedAt) : "未知"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Alert className="mb-6 bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-700">
          <p>
            资源一定要转到夸克网盘方可观看全部，否则只能观看2分钟的试片，夸克还可以投屏！资源不对的话关注微信公众号
            「小辰软件库」，私信我免费帮找!
          </p>
          <p className="mt-4 text-lg">二维码点击可放大查看</p>
          <p>
            <WechatQRModal src="/wechat.jpg" alt="小付说工具" />
          </p>
        </AlertDescription>
      </Alert>

      <div className="bg-card rounded-lg p-1 md:p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start mb-4">
          <span className="text-base md:mr-2 my-2">资源地址:</span>
          <div className="flex flex-col gap-2">
            {resource.diskList.map((item) => {
              const itemDiskIcon = getDiskTypeIcon(item.diskType);
              return (
                <div
                  key={item.id}
                  className="flex items-center flex-wrap gap-1"
                >
                  <span className="text-sm mr-2 flex items-center">
                    {itemDiskIcon}
                    {/* {item.diskType} */}
                  </span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline break-all max-w-[400px] truncate"
                      title={item.url}
                    >
                      {item.url}
                    </a>
                  )}
                  <ClientLink
                    id={item.id}
                    title={resource.title}
                    categoryKey={resource.categoryKey}
                    url={item.url}
                    externalUrl={item.externalUrl}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-blue-600"
                  >
                    <Download className="h-4 w-4" />
                    点击获取
                  </ClientLink>
                  {item.url && (
                    <ClickboardButton
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      text={item.url}
                    >
                      <Copy className="h-4 w-4" />
                      复制
                    </ClickboardButton>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-red-500"
                  >
                    <TriangleAlert className="h-4 w-4" />
                    失效
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">同类资源</h2>
          <Link
            href={`/resource?q=${resource.title}`}
            className="text-sm text-muted-foreground hover:underline flex items-center"
          >
            更多 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {relatedResources.map((item, index) => (
            <div key={item.id} className="flex items-center">
              <span className="text-primary font-medium mr-2">{index + 1}</span>
              <Link
                href={`/resource/${item.pinyin}`}
                className="hover:text-primary hover:underline truncate"
              >
                {item.title}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
