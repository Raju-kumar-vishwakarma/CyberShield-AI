import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background cyber-grid">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen">
        <div className="pt-16 px-4 pb-4 lg:pt-8 lg:px-8 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
};
