import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-surface-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap py-2 pr-4 text-[12px] font-medium text-ink-400 ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-surface-border last:border-0"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap py-2.5 pr-4 text-ink-900 ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
