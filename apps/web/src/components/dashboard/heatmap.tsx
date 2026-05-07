'use client';

interface HeatmapCell { hour: number; dayOfWeek: number; count: number }
interface Props { data: HeatmapCell[] }

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (h === 0)  return '12a';
  if (h < 12)   return `${h}a`;
  if (h === 12) return '12p';
  return `${h - 12}p`;
}

export function Heatmap({ data }: Props) {
  const cellMap = new Map<string, number>();
  let max = 1;
  for (const cell of data) {
    cellMap.set(`${cell.dayOfWeek}-${cell.hour}`, cell.count);
    if (cell.count > max) max = cell.count;
  }
  const intensity = (dow: number, h: number) => (cellMap.get(`${dow}-${h}`) ?? 0) / max;

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Activity Heatmap</p>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">When customers message — spot your peak hours</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-medium">Less</span>
          {[0.08, 0.25, 0.45, 0.7, 1].map((a) => (
            <div
              key={a}
              className="w-3 h-3 rounded-sm"
              style={{ background: `rgba(34,197,94,${a})` }}
            />
          ))}
          <span className="text-[10px] text-slate-400 font-medium">More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 560 }}>
          {/* Hour labels */}
          <div className="flex mb-1 pl-10">
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-center" style={{ fontSize: 9, color: '#94a3b8' }}>
                {h % 3 === 0 ? formatHour(h) : ''}
              </div>
            ))}
          </div>

          {/* Grid */}
          {DAYS.map((day, dow) => (
            <div key={day} className="flex items-center mb-[3px]">
              <span className="w-10 text-[10px] font-semibold text-slate-400 shrink-0">{day}</span>
              {HOURS.map((hour) => {
                const alpha = intensity(dow, hour);
                const count = cellMap.get(`${dow}-${hour}`) ?? 0;
                return (
                  <div
                    key={hour}
                    className="flex-1 mx-px rounded-sm"
                    style={{
                      height: 15,
                      background: alpha > 0 ? `rgba(34,197,94,${0.08 + alpha * 0.92})` : '#f8fafc',
                      outline: alpha > 0.75 ? '1px solid rgba(34,197,94,0.3)' : 'none',
                    }}
                    title={`${day} ${formatHour(hour)}: ${count} messages`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
