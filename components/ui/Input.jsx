import { cn } from "@/lib/utils";

export default function Input({ className, label, error, helperText, id, suffix, ...props }) {
    return (
        <div className="w-full space-y-2">
            {label && (
                <label
                    htmlFor={id}
                    className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500/80 ml-1"
                >
                    {label}
                </label>
            )}
            <div className="relative group">
                <input
                    id={id}
                    className={cn(
                        "w-full bg-[#f9fafb] border border-slate-100 rounded-2xl px-5 py-3.5 outline-none transition-all duration-300 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 placeholder:text-slate-400 text-[15px] font-medium text-slate-900",
                        error && "bg-red-50 border-red-100 focus:border-red-200 focus:ring-red-500/5",
                        suffix && "pr-12",
                        className
                    )}
                    {...props}
                    value={props.value ?? ""}
                />
                {suffix && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        {suffix}
                    </div>
                )}
            </div>
            {helperText && <p className="text-[10px] text-slate-500 ml-1">{helperText}</p>}
            {error && <p className="text-[10px] text-red-500 ml-1 font-medium">{error}</p>}
        </div>
    );
}
