// Adapted from tablecn (MIT), pinned to 1e5e6c1095ed6ad95904b2d2b40666ea3b79669b.
// See docs/third-party-notices.md. Kept on TanStack Table v8 for this revision.
import { flexRender, type Table as TanstackTable } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "./ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"

export function DataTable<T>({
  table,
  entityLabel = "templates",
  emptyMessage = "No templates match your search.",
  pagination = true
}: {
  table: TanstackTable<T>
  entityLabel?: string
  emptyMessage?: string
  pagination?: boolean
}) {
  return (
    <div className="min-w-0 space-y-3">
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : "none"
                    }
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length} className="h-32 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {table.getFilteredRowModel().rows.length} {entityLabel}
          </span>
          <div className="flex items-center gap-3">
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
            </span>
            <Button
              aria-label="Previous page"
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft />
            </Button>
            <Button
              aria-label="Next page"
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
