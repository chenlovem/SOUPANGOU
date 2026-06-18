import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-background border-t py-12">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="font-bold text-foreground">
              {process.env.SITE_NAME}
            </h3>
            <p className="text-sm text-muted-foreground">
              {process.env.SITE_NAME}
              致力于打造一站式网盘资源搜索平台。我们仅提供搜索服务，不存储、上传或分发任何网盘内容。所有资源均来自第三方网盘，请用户自行判断资源的真实性与安全性。本站秉承非营利原则运营，完全免费使用。如发现任何侵权内容，请发送邮件至
              cnx000003@gmail.com，我们将及时处理。
            </p>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-4">快速链接</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  title="首页"
                  className="text-sm text-muted-foreground hover:text-blue-500"
                >
                  首页
                </Link>
              </li>
              <li>
                <Link
                  href="/resource"
                  title="资源列表"
                  className="text-sm text-muted-foreground hover:text-blue-500"
                >
                  资源列表
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-4">热门网盘</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="https://pan.quark.cn"
                  title="夸克网盘"
                  className="text-sm text-muted-foreground hover:text-blue-500"
                >
                  夸克网盘
                </Link>
              </li>
              <li>
                <Link
                  href="https://pan.baidu.com"
                  title="百度网盘"
                  className="text-sm text-muted-foreground hover:text-blue-500"
                >
                  百度网盘
                </Link>
              </li>
              <li>
                <Link
                  href="https://www.alipan.com"
                  title="阿里云盘"
                  className="text-sm text-muted-foreground hover:text-blue-500"
                >
                  阿里云盘
                </Link>
              </li>
              <li>
                <Link
                  href="https://pan.xunlei.com"
                  title="迅雷网盘"
                  className="text-sm text-muted-foreground hover:text-blue-500"
                >
                  迅雷网盘
                </Link>
              </li>
              <li>
                <Link
                  href="https://drive.uc.cn"
                  title="UC网盘"
                  className="text-sm text-muted-foreground hover:text-blue-500"
                >
                  UC网盘
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} {process.env.SITE_NAME}. 保留所有权利.
          </p>
        </div>
      </div>
    </footer>
  );
}
