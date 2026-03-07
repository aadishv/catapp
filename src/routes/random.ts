import type { APIEvent } from "@solidjs/start/server";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { Readable } from "node:stream";

type Photo = { small?: string; medium?: string; original?: string; thumb?: string };

let photos: Photo[] | null = null;

function getPhotos(): Photo[] {
  if (!photos) {
    photos = JSON.parse(
      readFileSync("/srv/catapp/public/index.json", "utf-8"),
    ) as Photo[];
  }
  return photos;
}

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export function GET(_event: APIEvent) {
  const list = getPhotos();
  const photo = list[Math.floor(Math.random() * list.length)]!;
  const rel = photo.medium ?? photo.small ?? photo.original ?? photo.thumb;
  if (!rel) return new Response("not found", { status: 404 });

  const filePath = `/srv/lychee/public/uploads/${rel}`;
  if (!existsSync(filePath)) return new Response("not found", { status: 404 });

  const contentType = MIME[extname(filePath).toLowerCase()] ?? "application/octet-stream";
  const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;

  return new Response(stream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
