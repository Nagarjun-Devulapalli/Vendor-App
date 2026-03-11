export default function Pagination({ currentPage, totalItems, pageSize, onPageChange }) {
  const totalPages = Math.ceil(totalItems / pageSize)
  if (totalPages <= 1) return null

  const pages = []
  for (let i = 1; i <= totalPages; i++) pages.push(i)

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#e4e8ed]">
      <span className="text-[12px] text-[#6b7280]">
        Showing {start}–{end} of {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-[#e4e8ed] text-[#6b7280] hover:bg-[#f6f7f9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ‹ Prev
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 text-[12px] font-semibold rounded-lg border transition-colors ${
              p === currentPage
                ? 'bg-orchid text-white border-orchid'
                : 'border-[#e4e8ed] text-[#6b7280] hover:bg-[#f6f7f9]'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 text-[12px] font-medium rounded-lg border border-[#e4e8ed] text-[#6b7280] hover:bg-[#f6f7f9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next ›
        </button>
      </div>
    </div>
  )
}
