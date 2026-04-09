function Drawer({ open, onClose, side = 'left', children }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose}>
      <div
        className={`absolute top-0 h-full w-[280px] ${
          side === 'left' ? 'left-0' : 'right-0'
        } bg-bg-panel`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export default function MobileDrawers({
  leftOpen,
  rightOpen,
  closeLeft,
  closeRight,
  leftContent,
  rightContent
}) {
  return (
    <>
      <div className="md:hidden">
        <Drawer open={leftOpen} onClose={closeLeft} side="left">
          {leftContent}
        </Drawer>
      </div>
      <div className="lg:hidden">
        <Drawer open={rightOpen} onClose={closeRight} side="right">
          {rightContent}
        </Drawer>
      </div>
    </>
  )
}
