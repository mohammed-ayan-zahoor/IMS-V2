import { cn } from "@/lib/utils";

export default function ReceiptTemplateOption({
    id,
    title,
    description,
    type = "a4",
    selected = false,
    onSelect,
    name = "receipt-template"
}) {
    return (
        <label
            htmlFor={`receipt-opt-${id}`}
            onClick={(e) => {
                e.preventDefault();
                onSelect(id);
            }}
            className={cn(
                "relative flex items-start gap-4 p-4 rounded-lg border text-left transition-colors cursor-pointer select-none",
                "focus-within:ring-2 focus-within:ring-slate-900 focus-within:outline-none",
                selected
                    ? "border-slate-900 bg-slate-50/70"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/30"
            )}
        >
            {/* Real Accessible Radio Input */}
            <input
                id={`receipt-opt-${id}`}
                type="radio"
                name={name}
                value={id}
                checked={selected}
                onChange={() => onSelect(id)}
                className="mt-0.5 h-4 w-4 text-slate-900 border-slate-300 focus:ring-slate-900 accent-slate-900 shrink-0 cursor-pointer"
            />

            {/* Consistent Preview Thumbnail */}
            <div className="w-16 h-20 bg-slate-50 border border-slate-200 rounded-md shrink-0 p-1.5 flex flex-col justify-between overflow-hidden">
                {type === "a4" ? (
                    <>
                        <div>
                            <div className="h-1.5 w-7 bg-slate-300 rounded-xs mb-1" />
                            <div className="h-1 w-full bg-slate-200 rounded-xs mb-1" />
                        </div>
                        <div className="space-y-1 my-auto">
                            <div className="h-1 w-full bg-slate-200/60 rounded-xs" />
                            <div className="h-1 w-5/6 bg-slate-200/60 rounded-xs" />
                            <div className="h-1 w-4/6 bg-slate-200/60 rounded-xs" />
                        </div>
                        <div className="h-3.5 w-full bg-white rounded-xs border border-slate-200 flex items-center justify-end px-1">
                            <div className="h-1 w-4 bg-slate-300 rounded-xs" />
                        </div>
                    </>
                ) : (
                    <>
                        <div className="border-b border-dashed border-slate-200 pb-0.5 opacity-50">
                            <div className="h-1 w-6 bg-slate-200 rounded-xs" />
                        </div>
                        <div className="h-10 w-full bg-white rounded-xs border border-slate-200 p-1 flex flex-col justify-between shadow-2xs my-auto">
                            <div className="h-1.5 w-6 bg-slate-300 rounded-xs" />
                            <div className="space-y-0.5">
                                <div className="h-1 w-full bg-slate-200 rounded-xs" />
                                <div className="h-1 w-4/5 bg-slate-200 rounded-xs" />
                            </div>
                            <div className="h-1 w-3 bg-slate-300 rounded-xs self-end" />
                        </div>
                        <div className="border-t border-dashed border-slate-200 pt-0.5 opacity-50" />
                    </>
                )}
            </div>

            {/* Content Info */}
            <div className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900">
                    {title}
                </span>
                <span className="block text-xs text-slate-500 mt-1 leading-relaxed">
                    {description}
                </span>
            </div>
        </label>
    );
}
