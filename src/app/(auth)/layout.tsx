export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 gradient-mesh">
      {/* Glow effects */}
      <div className="absolute -top-[40%] -left-[20%] h-[80%] w-[60%] rounded-full bg-primary/10 blur-[120px] animate-pulse-soft" />
      <div className="absolute -bottom-[40%] -right-[20%] h-[80%] w-[60%] rounded-full bg-primary/5 blur-[120px] animate-pulse-soft" style={{ animationDelay: '1s' }} />
      
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
