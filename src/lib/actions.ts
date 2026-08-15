"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { ReleaseType } from "@/generated/prisma/enums";

export async function createArtist(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.artist.create({
    data: { name, imageUrl, notes },
  });

  revalidatePath("/");
}

export async function setArtistStatus(artistId: string, status: "ACTIVE" | "PAUSED") {
  await prisma.artist.update({
    where: { id: artistId },
    data: {
      status,
      pausedAt: status === "PAUSED" ? new Date() : null,
    },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${artistId}`);
}

export async function addRelease(formData: FormData) {
  const artistId = String(formData.get("artistId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const releaseDateRaw = String(formData.get("releaseDate") ?? "");
  const type = String(formData.get("type") ?? "OTHER") as ReleaseType;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!artistId || !title || !releaseDateRaw) return;

  await prisma.release.create({
    data: {
      artistId,
      title,
      type,
      releaseDate: new Date(releaseDateRaw),
      notes,
    },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${artistId}`);
}

export async function setReleaseListened(releaseId: string, listened: boolean) {
  const release = await prisma.release.update({
    where: { id: releaseId },
    data: { listenedAt: listened ? new Date() : null },
    select: { artistId: true },
  });

  revalidatePath("/");
  revalidatePath(`/artists/${release.artistId}`);
}

export async function deleteArtist(artistId: string) {
  await prisma.artist.delete({ where: { id: artistId } });
  revalidatePath("/");
  redirect("/");
}
