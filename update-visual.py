import sys

with open('src/components/accounts/credit-card-visual.tsx', 'r') as f:
    content = f.read()

# 1. Add `forceFlat` to props
if "forceFlat?:" not in content:
    content = content.replace("size?: 'sm' | 'md' | 'lg' | 'full';", "size?: 'sm' | 'md' | 'lg' | 'full';\n  forceFlat?: boolean;")
    content = content.replace("className,\n}: CreditCardVisualProps) {", "className,\n  forceFlat = false,\n}: CreditCardVisualProps) {")

# 2. Increase fonts
# logoText: font-semibold text-lg -> text-xl
content = content.replace('className="font-semibold text-lg"', 'className="font-bold text-xl md:text-2xl"')
# cardTitle: text-xs -> text-sm
content = content.replace('className="text-xs opacity-75 font-medium', 'className="text-sm opacity-90 font-semibold')
# cardNumber: text-xl md:text-2xl -> text-2xl md:text-3xl
content = content.replace('className="font-mono text-xl md:text-2xl tracking-widest pt-2"', 'className="font-mono text-2xl md:text-3xl tracking-widest pt-3 pb-1 drop-shadow-md"')
# cardHolderName label: text-[10px] -> text-xs
content = content.replace('className="text-[10px] opacity-70 uppercase tracking-widest mb-1"', 'className="text-xs opacity-80 uppercase tracking-widest mb-1"')
# cardHolderName value: text-sm -> text-base
content = content.replace('className="font-semibold text-sm uppercase truncate max-w-[150px]"', 'className="font-bold text-base uppercase truncate max-w-[180px]"')
# Valid Thru label: text-[8px] -> text-[10px]
content = content.replace('className="text-[8px] opacity-70 uppercase tracking-wider mb-1"', 'className="text-[10px] opacity-80 uppercase tracking-wider mb-1"')
# Valid Thru value: text-sm -> text-base
content = content.replace('className="font-mono text-sm"', 'className="font-mono text-base font-semibold"')

# 3. Change rendering for forceFlat
# Instead of rendering motion.div with preserve-3d and both faces, if forceFlat, render just front face flat.
# We'll just replace the return statement manually with a regex or string replacement.

front_face_start = """        {/* Front Face */}
        <div 
          className="absolute inset-0 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 backface-hidden"
          style={{ background: template.gradient, backfaceVisibility: 'hidden' }}
        >"""
        
# Actually, the easiest way to fix the clipping bug with preserve-3d in Safari is to NOT use preserve-3d when not needed.
new_return = """  if (forceFlat) {
    return (
      <div className={cn("relative cursor-pointer", sizeClasses[size], className)} onClick={handleCardClick}>
        <div 
          className="absolute inset-0 overflow-hidden"
          style={{ background: template.gradient }}
        >
          <PatternOverlay />
          <div className={cn("relative z-10 w-full h-full p-5 md:p-6 flex flex-col justify-between", template.textColor)}>
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="font-bold text-xl md:text-2xl">{template.logoText}</span>
                <span className="text-sm opacity-90 font-semibold tracking-wider mt-1">{template.cardTitle}</span>
              </div>
              <div className="flex-shrink-0 scale-110">
                {getNetworkLogo(template.brand)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className={cn(
                  "w-12 h-9 rounded-md relative overflow-hidden flex flex-col justify-evenly",
                  template.chipStyle === 'gold' 
                    ? "bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600"
                    : "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400"
                )}
              >
                <div className="w-full h-[1px] bg-black/20" />
                <div className="w-full h-[1px] bg-black/20" />
                <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black/20 transform -translate-x-1/2" />
                <div className="absolute w-[60%] h-[50%] border border-black/20 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-[2px]" />
              </div>
              <Wifi className="w-6 h-6 opacity-70 rotate-90" />
            </div>
            <div className="font-mono text-2xl md:text-3xl tracking-widest pt-3 pb-1 drop-shadow-md">
              {formattedCardNumber()}
            </div>
            <div className="flex justify-between items-end pb-1">
              <div className="flex flex-col">
                <span className="text-xs opacity-80 uppercase tracking-widest mb-1">Card Holder</span>
                <span className="font-bold text-base uppercase truncate max-w-[180px]">
                  {cardHolderName || 'YOUR NAME'}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] opacity-80 uppercase tracking-wider mb-1">Valid Thru</span>
                <span className="font-mono text-base font-semibold">{expiryDate || 'MM/YY'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return ("""

if "if (forceFlat) {" not in content:
    content = content.replace("return (\n    <div \n      className={cn(", new_return + "\n    <div \n      className={cn(")

with open('src/components/accounts/credit-card-visual.tsx', 'w') as f:
    f.write(content)
