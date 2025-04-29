
import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

// EditableCell component for inline editing
interface EditableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  isEditing: boolean;
  onSave: (value: string) => void;
  initialValue: string;
  inputType?: "text" | "number" | "date";
  placeholder?: string;
}

const EditableCell = React.forwardRef<HTMLTableCellElement, EditableCellProps>(
  ({ className, isEditing, onSave, initialValue, inputType = "text", placeholder = "Enter value...", ...props }, ref) => {
    const [value, setValue] = React.useState(initialValue);
    
    React.useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    };
    
    const handleBlur = () => {
      if (onSave && value !== initialValue) {
        onSave(value);
      }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && onSave) {
        onSave(value);
      }
    };
    
    return (
      <TableCell ref={ref} className={cn(className)} {...props}>
        {isEditing ? (
          <input
            type={inputType}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-background border-border border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder={placeholder}
            autoFocus
          />
        ) : (
          <div className="cursor-pointer hover:bg-muted/30 px-2 py-1 rounded truncate">
            {initialValue || <span className="text-muted-foreground text-sm italic">Empty</span>}
          </div>
        )}
      </TableCell>
    );
  }
);
EditableCell.displayName = "EditableCell";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  EditableCell
}
