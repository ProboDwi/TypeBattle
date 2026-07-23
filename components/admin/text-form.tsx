"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface TextValues {
  id?: string;
  title: string;
  content: string;
  categoryId: string;
  difficulty: string;
  status: string;
  sourceLabel: string;
}
export function TextForm({
  categories,
  initial,
}: {
  categories: { id: string; name: string }[];
  initial?: TextValues;
}) {
  const router = useRouter();
  const [content, setContent] = useState(initial?.content ?? "");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const values = new FormData(event.currentTarget);
    const endpoint = initial?.id
      ? `/api/admin/texts/${initial.id}`
      : "/api/admin/texts";
    const response = await fetch(endpoint, {
      method: initial?.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.get("title"),
        content,
        categoryId: values.get("categoryId"),
        difficulty: values.get("difficulty"),
        status: values.get("status"),
        sourceLabel: values.get("sourceLabel") || null,
      }),
    });
    const result = await response.json();
    setPending(false);
    setMessage(result.message);
    if (result.success) {
      router.push("/admin/texts");
      router.refresh();
    }
  }
  return (
    <form onSubmit={submit} className="panel p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="label">Judul</span>
          <input
            name="title"
            className="field"
            defaultValue={initial?.title}
            required
            minLength={3}
            maxLength={100}
          />
        </label>
        <label>
          <span className="label">Kategori</span>
          <select
            name="categoryId"
            className="field"
            defaultValue={initial?.categoryId}
            required
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Kesulitan</span>
          <select
            name="difficulty"
            className="field"
            defaultValue={initial?.difficulty ?? "medium"}
          >
            <option value="easy">Mudah</option>
            <option value="medium">Menengah</option>
            <option value="hard">Sulit</option>
          </select>
        </label>
        <label>
          <span className="label">Status</span>
          <select
            name="status"
            className="field"
            defaultValue={initial?.status ?? "draft"}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          <span className="label">Label sumber</span>
          <input
            name="sourceLabel"
            className="field"
            defaultValue={initial?.sourceLabel}
            maxLength={100}
            placeholder="Original Keylane"
          />
        </label>
        <label className="sm:col-span-2">
          <span className="label">Isi teks</span>
          <textarea
            className="field min-h-56 resize-y font-mono leading-7"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            minLength={120}
            maxLength={450}
            required
          />
          <span
            className={`mt-2 block font-mono text-xs ${content.length < 120 || content.length > 450 ? "text-danger" : "text-muted"}`}
          >
            {content.length}/450 karakter ·{" "}
            {content.trim() ? content.trim().split(/\s+/).length : 0} kata
          </span>
        </label>
      </div>
      <div className="mt-7 rounded-[7px] border border-line bg-paper p-5">
        <p className="font-mono text-[10px] uppercase tracking-[.12em] text-muted">
          Preview
        </p>
        <p className="mt-4 font-mono text-lg leading-8">
          {content || "Isi teks akan tampil di sini."}
        </p>
      </div>
      {message && (
        <p role="status" className="mt-4 text-sm text-muted">
          {message}
        </p>
      )}
      <Button
        type="submit"
        className="mt-6"
        disabled={pending || content.length < 120 || content.length > 450}
      >
        {pending ? "Menyimpan…" : "Simpan teks"}
      </Button>
    </form>
  );
}
