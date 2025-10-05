type DemoControlsProps = {
  onReset: () => void;
  onSpeedChange: (factor: number) => void;
  jumpToNextAction: () => void;
};

export default function DemoControls({
  onReset,
  onSpeedChange,
  jumpToNextAction,
}: DemoControlsProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center bg-red-50 border border-red-300 p-3 rounded-lg">
      <span className="font-bold text-red-600">MODE DEMO</span>
      <button className="px-3 py-1 border rounded" onClick={onReset}>
        Reset
      </button>
      <button
        className="px-3 py-1 border rounded"
        onClick={() => onSpeedChange(2)}
      >
        x2
      </button>
      <button
        className="px-3 py-1 border rounded"
        onClick={() => onSpeedChange(5)}
      >
        x5
      </button>
      <button
        className="px-3 py-1 border rounded bg-gray-400 text-white"
        onClick={jumpToNextAction}
      >
        Jump to next action (15sec before)
      </button>
    </div>
  );
}
