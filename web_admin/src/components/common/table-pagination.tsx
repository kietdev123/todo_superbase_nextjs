"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { useAppSettings } from "@/components/providers/app-settings-provider";
import { Button } from "@/components/ui/button";

type TablePaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
}: TablePaginationProps) {
  const { locale, t } = useAppSettings();
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const firstItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastItem = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <p>
        {locale === "vi"
          ? `Hiển thị ${firstItem}-${lastItem} / ${totalItems}`
          : `Showing ${firstItem}-${lastItem} of ${totalItems}`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span>{t("pagination.rowsPerPage")}</span>
          <select
            aria-label={t("pagination.rowsPerPage")}
            className="h-8 rounded-md border border-input bg-background px-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pageSize}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <span className="min-w-24 text-center">
          {t("pagination.page")} {safePage} / {pageCount}
        </span>

        <div className="flex items-center gap-1">
          <Button
            aria-label={t("pagination.previous")}
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronLeft />
          </Button>
          <Button
            aria-label={t("pagination.next")}
            disabled={safePage >= pageCount}
            onClick={() => onPageChange(safePage + 1)}
            size="icon"
            type="button"
            variant="outline"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
