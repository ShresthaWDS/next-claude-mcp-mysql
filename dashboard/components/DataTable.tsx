"use client";

export default function DataTable({ data }: { data: any[] }) {
  if (!data?.length) return null;

  const columns = Object.keys(data[0]);

  return (
    <div className="bg-gray-600 rounded-2xl shadow-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800">
          <tr>
            {columns.map((col) => (
              <th key={col} className="text-left p-3 font-semibold">
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t">
              {columns.map((col) => (
                <td key={col} className="p-3">
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
