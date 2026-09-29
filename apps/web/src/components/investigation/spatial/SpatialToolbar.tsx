'use client';

import { ZoomIn, ZoomOut, Maximize2, Focus } from 'lucide-react';

interface SpatialToolbarProps {
  onFitView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onRecenter?: () => void;
}

// Design spec colors
const GLASS_SURFACE = '#151C25';
const MUTED_TEXT = '#A8B4C2';
const PRIMARY_TEXT = '#EAF0F6';

export default function SpatialToolbar({
  onFitView,
  onZoomIn,
  onZoomOut,
  onRecenter,
}: SpatialToolbarProps) {
  return (
    <div 
      className="absolute top-6 right-6 z-10 flex items-center gap-1.5 rounded-xl p-1.5 shadow-2xl"
      style={{
        backgroundColor: GLASS_SURFACE + 'E6',
        border: `1px solid ${MUTED_TEXT}30`,
        backdropFilter: 'blur(12px)',
      }}
    >
      <ToolbarButton
        icon={<Focus className="w-4 h-4" />}
        label="Recenter"
        onClick={onRecenter}
      />
      <div 
        className="w-px h-6"
        style={{ backgroundColor: MUTED_TEXT + '30' }}
      />
      <ToolbarButton
        icon={<Maximize2 className="w-4 h-4" />}
        label="Fit View"
        onClick={onFitView}
      />
      <ToolbarButton
        icon={<ZoomIn className="w-4 h-4" />}
        label="Zoom In"
        onClick={onZoomIn}
      />
      <ToolbarButton
        icon={<ZoomOut className="w-4 h-4" />}
        label="Zoom Out"
        onClick={onZoomOut}
      />
    </div>
  );
}

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function ToolbarButton({ icon, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="p-2 rounded-lg transition-all duration-150 active:scale-95"
      style={{
        backgroundColor: GLASS_SURFACE + '80',
        border: `1px solid ${MUTED_TEXT}20`,
        color: MUTED_TEXT,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = GLASS_SURFACE + 'CC';
        e.currentTarget.style.borderColor = MUTED_TEXT + '40';
        e.currentTarget.style.color = PRIMARY_TEXT;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = GLASS_SURFACE + '80';
        e.currentTarget.style.borderColor = MUTED_TEXT + '20';
        e.currentTarget.style.color = MUTED_TEXT;
      }}
    >
      {icon}
    </button>
  );
}
