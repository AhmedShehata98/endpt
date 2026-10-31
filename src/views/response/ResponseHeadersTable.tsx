import type { ResponseHeader } from "@modules/response";

interface ResponseHeadersTableProps {
  headers: ResponseHeader[];
}

export function ResponseHeadersTable({ headers }: ResponseHeadersTableProps) {
  if (headers.length === 0) {
    return (
      <p className="p-3 text-[0.8125rem] text-text-muted">This response has no headers.</p>
    );
  }

  return (
    <table className="w-full text-left text-[0.8125rem]">
      <thead className="bg-bg-subtle text-text-muted">
        <tr>
          <th className="px-3 py-1.5 font-medium">Key</th>
          <th className="px-3 py-1.5 font-medium">Value</th>
        </tr>
      </thead>
      <tbody>
        {headers.map((header) => (
          <tr key={`${header.key}-${header.value}`} className="border-t border-border-subtle">
            <td className="px-3 py-1.5 font-mono text-accent">{header.key}</td>
            <td className="px-3 py-1.5 font-mono text-text-secondary">{header.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
