"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Plus, Minus } from "lucide-react";

export function AddBookModal({ isOpen = true, onClose, onSaved }) {
    const [form, setForm] = useState({
        title: "",
        authors: "",
        publisher: "",
        edition: "",
        isbn: "",
        replacementCost: "",
        initialCopies: "1",
        shelfLocation: ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/v1/library/books", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    authors: form.authors.split(",").map((a) => a.trim()).filter(Boolean),
                    replacementCost: form.replacementCost ? parseFloat(form.replacementCost) : undefined,
                    initialCopies: form.initialCopies ? parseInt(form.initialCopies) : 1
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onSaved(data.book);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Book" className="max-w-lg">
            <form onSubmit={submit} className="space-y-4">
                <Input
                    label="Title"
                    required
                    value={form.title}
                    onChange={set("title")}
                    placeholder="e.g. Clean Code, Introduction to Algorithms"
                />

                <Input
                    label="Author(s)"
                    value={form.authors}
                    onChange={set("authors")}
                    placeholder="e.g. Robert C. Martin, Martin Fowler"
                    helperText="Comma-separated for multiple authors"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                        label="Publisher"
                        value={form.publisher}
                        onChange={set("publisher")}
                        placeholder="e.g. Pearson, O'Reilly"
                    />
                    <Input
                        label="Edition"
                        value={form.edition}
                        onChange={set("edition")}
                        placeholder="e.g. 3rd Edition"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                        label="ISBN"
                        value={form.isbn}
                        onChange={set("isbn")}
                        placeholder="978-..."
                        helperText="Fetches cover art automatically if found"
                    />
                    <Input
                        label="Replacement Cost (₹)"
                        type="number"
                        min="0"
                        value={form.replacementCost}
                        onChange={set("replacementCost")}
                        placeholder="500"
                        helperText="Charged if marked lost"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                        label="Initial Physical Copies"
                        type="number"
                        min="1"
                        max="50"
                        value={form.initialCopies}
                        onChange={set("initialCopies")}
                        helperText="Copies added to shelf immediately"
                    />
                    <Input
                        label="Shelf Location"
                        value={form.shelfLocation}
                        onChange={set("shelfLocation")}
                        placeholder="e.g. Shelf A-3, Rack 2"
                        helperText="Optional physical placement"
                    />
                </div>

                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600 font-medium">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading}>
                        Add Book
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export function AddCopyModal({ isOpen = true, book, onClose, onSaved }) {
    const [count, setCount] = useState(1);
    const [shelfLocation, setShelfLocation] = useState("");
    const [condition, setCondition] = useState("good");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/v1/library/books/${book._id}/copies`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count, shelfLocation, condition })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onSaved(data.copies);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add Copies — ${book?.title || ""}`} className="max-w-lg">
            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Number of Copies
                    </label>
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setCount((c) => Math.max(1, c - 1))}
                            className="w-9 h-9 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <Minus size={14} />
                        </button>
                        <span className="text-base font-bold w-10 text-center font-mono text-slate-800">
                            {count}
                        </span>
                        <button
                            type="button"
                            onClick={() => setCount((c) => Math.min(50, c + 1))}
                            className="w-9 h-9 border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                        Accession numbers will be auto-generated sequentially (e.g. <code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">LIB-2026-000001</code>).
                    </p>
                </div>

                <Input
                    label="Shelf Location"
                    value={shelfLocation}
                    onChange={(e) => setShelfLocation(e.target.value)}
                    placeholder="e.g. Rack 3-B, Row 2"
                />

                <Select
                    label="Physical Condition"
                    value={condition}
                    onChange={(val) => setCondition(val)}
                    options={[
                        { label: "Good (New / Intact)", value: "good" },
                        { label: "Fair (Minor wear)", value: "fair" },
                        { label: "Poor (Needs repair)", value: "poor" }
                    ]}
                />

                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600 font-medium">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading}>
                        Add {count} {count === 1 ? "Copy" : "Copies"}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}

export function EditBookModal({ isOpen = true, book, onClose, onSaved }) {
    const [form, setForm] = useState({
        title: book?.title || "",
        authors: (book?.authors || []).join(", "),
        publisher: book?.publisher || "",
        edition: book?.edition || "",
        replacementCost: book?.replacementCost ?? ""
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/v1/library/books/${book._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    authors: form.authors.split(",").map((a) => a.trim()).filter(Boolean),
                    replacementCost: form.replacementCost !== "" ? parseFloat(form.replacementCost) : undefined
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onSaved(data.book);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Book" className="max-w-lg">
            <form onSubmit={submit} className="space-y-4">
                <Input
                    label="Title"
                    required
                    value={form.title}
                    onChange={set("title")}
                />

                <Input
                    label="Author(s)"
                    value={form.authors}
                    onChange={set("authors")}
                    helperText="Comma-separated"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                        label="Publisher"
                        value={form.publisher}
                        onChange={set("publisher")}
                    />
                    <Input
                        label="Edition"
                        value={form.edition}
                        onChange={set("edition")}
                    />
                </div>

                <Input
                    label="Replacement Cost (₹)"
                    type="number"
                    min="0"
                    value={form.replacementCost}
                    onChange={set("replacementCost")}
                    helperText="Charged if marked lost"
                />

                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600 font-medium">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" loading={loading}>
                        Save Changes
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
