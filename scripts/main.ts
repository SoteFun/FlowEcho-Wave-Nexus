import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { extname, join } from "https://deno.land/std@0.208.0/path/mod.ts";

// 获取当前文件所在的目录
const __dirname = new URL(".", import.meta.url).pathname;

// 端口号
const port = 8000;

// MIME 类型映射表
const mimeTypes: { [key: string]: string } = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
  // 添加更多你需要的 MIME 类型
};

console.log(`Serving files from ${__dirname} on http://localhost:${port}`);

serve(async (req: Request) => {
  const url = new URL(req.url);
  let filePath = decodeURIComponent(url.pathname);

  // 处理根路径 "/" 的情况，默认提供 index.html
  if (filePath === "/") {
    filePath = "/index.html";
  }

  // 构建完整的文件路径
  const fullPath = join(__dirname, filePath);

  try {
    // 尝试获取文件信息
    const stat = await Deno.stat(fullPath);

    if (stat.isDirectory) {
      // 如果请求的是一个目录，尝试提供目录下的 index.html
      const indexPath = join(fullPath, "index.html");
      try {
        const indexStat = await Deno.stat(indexPath);
        if (indexStat.isFile) {
          const file = await Deno.open(indexPath, { read: true });
          const headers = new Headers({
            "content-type": "text/html",
          });
          return new Response(file.readable, { headers });
        } else {
          // 如果目录中没有 index.html，返回 404
          return new Response("Directory Listing Not Supported", { status: 404 });
        }
      } catch (e) {
        // 如果获取 index.html 失败，返回 404
        if (e instanceof Deno.errors.NotFound) {
           return new Response("Directory Listing Not Supported", { status: 404 });
        }
        // 其他错误则返回 500
        console.error("Error serving directory index:", e);
        return new Response("Internal Server Error", { status: 500 });
      }

    } else if (stat.isFile) {
      // 如果请求的是一个文件
      const ext = extname(fullPath).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream"; // 默认为二进制流

      const file = await Deno.open(fullPath, { read: true });
      const headers = new Headers({
        "content-type": contentType,
      });
      return new Response(file.readable, { headers });
    } else {
      // 如果既不是文件也不是目录（例如 symlink 但目标不存在）
      return new Response("Not Found", { status: 404 });
    }

  } catch (e) {
    // 捕获文件未找到的错误
    if (e instanceof Deno.errors.NotFound) {
      return new Response("Not Found", { status: 404 });
    }
    // 捕获其他可能的错误 (例如权限问题)
    console.error("Error serving file:", e);
    return new Response("Internal Server Error", { status: 500 });
  }
}, { port });
