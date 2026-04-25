export const metadata = {
  title: "Eduvanta | School Management Software",
  description: "All-in-one minimal, fast, and smart school management software.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function EduvantaLayout({ children }) {
  return (
    <div className="bg-white min-h-screen text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {children}
    </div>
  );
}
