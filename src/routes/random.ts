import type { APIEvent } from "@solidjs/start/server";
import { readFileSync } from "node:fs";

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

export function GET(_event: APIEvent) {
  const list = getPhotos();
  const photo = list[Math.floor(Math.random() * list.length)]!;
  const path = photo.medium ?? photo.small ?? photo.original ?? photo.thumb;
  return new Response(null, {
    status: 302,
    headers: { Location: path ? `/uploads/${path}` : "/" },
  });
}
