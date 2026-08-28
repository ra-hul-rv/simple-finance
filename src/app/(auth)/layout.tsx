export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Left side — Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      {/* Right side — Illustration panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-[#F6FAFF] dark:bg-[#1D1E24] p-20 relative overflow-hidden">
        <div className="text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" fill="currentColor" className="text-primary" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Simple Finance
          </h2>
          <p className="text-muted-foreground text-base max-w-xs mx-auto">
            Track your finances, manage budgets, and stay on top of your money — all in one place.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-primary/5" />
        <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-primary/5" />
        <div className="absolute top-1/4 right-10 h-3 w-3 rounded-full bg-primary/20" />
        <div className="absolute bottom-1/3 left-16 h-2 w-2 rounded-full bg-primary/30" />
      </div>
    </div>
  );
}
