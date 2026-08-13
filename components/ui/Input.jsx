import { cn } from "@/lib/utils";

export default function Input({ className, label, error, helperText, id, suffix, ...props }) {
    return (
        <div className="w-full space-y-1">
            {label && (
                <label
                    htmlFor={id}
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    id={id}
                    className={cn(
                        "w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-slate-400 placeholder:text-slate-400 transition-colors",
                        error && "border-rose-300 focus:border-rose-400 bg-rose-50/20",
                        suffix && "pr-9",
                        className
                    )}
                    {...props}
                    value={props.value ?? ""}
                />
                {suffix && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400">
                        {suffix}
                    </div>
                )}
            </div>
            {helperText && <p className="text-[10px] text-slate-500">{helperText}</p>}
            {error && <p className="text-[10px] text-rose-500 font-medium">{error}</p>}
        </div>
    );
}
