"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}
export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.get("name"),
        slug: values.get("slug"),
        description: values.get("description") || null,
      }),
    });
    const result = await response.json();
    setMessage(result.message);
    setIsError(!result.success);
    if (result.success) {
      form.reset();
      router.refresh();
    }
  }
  async function update(event: React.FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const response = await fetch(`/api/admin/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.get("name"),
        slug: values.get("slug"),
        description: values.get("description") || null,
      }),
    });
    const result = await response.json();
    setMessage(result.message);
    setIsError(!result.success);
    if (result.success) router.refresh();
  }
  async function remove() {
    if (!deleteTarget) return;
    setDeletePending(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/admin/categories/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      setMessage(result.message);
      setIsError(!result.success);
      if (!response.ok || !result.success) {
        setDeleteError(result.message ?? "Kategori belum dapat dihapus.");
        return;
      }
      setDeleteTarget(null);
      router.refresh();
    } catch {
      setDeleteError("Koneksi terputus. Coba lagi.");
    } finally {
      setDeletePending(false);
    }
  }
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[.7fr_1.3fr]">
        <form onSubmit={create} className="panel h-fit p-6">
          <h2 className="font-bold">Kategori baru</h2>
          <div className="mt-5 space-y-4">
            <label>
              <span className="label">Nama</span>
              <input name="name" className="field" required />
            </label>
            <label>
              <span className="label">Slug</span>
              <input
                name="slug"
                className="field font-mono"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
            </label>
            <label>
              <span className="label">Deskripsi</span>
              <textarea
                name="description"
                className="field min-h-24"
                maxLength={240}
              />
            </label>
          </div>
          <Button type="submit" className="mt-5 w-full">
            Tambah kategori
          </Button>
          {message && (
            <p role="status" className="mt-3 text-sm text-muted">
              {message}
            </p>
          )}
        </form>
        <section className="panel overflow-hidden">
          <div className="border-b border-line p-5">
            <h2 className="font-bold">Kategori aktif</h2>
          </div>
          {categories.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_auto] gap-4 border-b border-line p-5 last:border-0"
            >
              <details>
                <summary className="cursor-pointer font-bold">
                  {item.name}
                  <span className="ml-2 font-mono text-xs font-normal text-accent">
                    /{item.slug}
                  </span>
                </summary>
                <form
                  onSubmit={(event) => update(event, item.id)}
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                >
                  <label>
                    <span className="label">Nama</span>
                    <input
                      name="name"
                      className="field"
                      defaultValue={item.name}
                      required
                    />
                  </label>
                  <label>
                    <span className="label">Slug</span>
                    <input
                      name="slug"
                      className="field font-mono"
                      defaultValue={item.slug}
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      required
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="label">Deskripsi</span>
                    <textarea
                      name="description"
                      className="field min-h-20"
                      defaultValue={item.description ?? ""}
                      maxLength={240}
                    />
                  </label>
                  <Button type="submit" variant="quiet">
                    Simpan perubahan
                  </Button>
                </form>
              </details>
              <button
                type="button"
                onClick={() => {
                  setDeleteError("");
                  setDeleteTarget(item);
                }}
                className="h-fit text-sm font-bold text-danger hover:underline"
              >
                Hapus
              </button>
            </div>
          ))}
        </section>
        <ActionToast message={message} tone={isError ? "error" : "success"} />
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus kategori ini?"
        description={`Kategori “${deleteTarget?.name ?? ""}” akan dihapus. Jika masih digunakan oleh teks, server akan menolak tindakan ini.`}
        confirmLabel="Ya, hapus kategori"
        pending={deletePending}
        error={deleteError}
        onClose={() => {
          if (deletePending) return;
          setDeleteTarget(null);
          setDeleteError("");
        }}
        onConfirm={remove}
      />
    </>
  );
}
