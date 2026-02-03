"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { 
  Filter, 
  Calendar as CalendarIcon, 
  PoundSterling, 
  Search, 
  X,
  RotateCcw,
  Plus,
  Settings,
  Edit2,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FilterCriteria } from "@/types/categories";
import { useData } from "@/contexts/DataContext";
import { useCurrency } from "@/hooks/useCurrency";

interface FilterPanelProps {
  filters: FilterCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
  totalEntries: number;
  filteredEntries: number;
}

const PRESET_COLORS = [
  "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#f97316",
  "#06b6d4", "#eab308", "#ef4444", "#6b7280", "#8b5cf6",
];

export const FilterPanel = ({ 
  filters, 
  onFiltersChange, 
  totalEntries, 
  filteredEntries 
}: FilterPanelProps) => {
  const { symbol: currencySymbol } = useCurrency();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(PRESET_COLORS[0]);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryColor, setEditCategoryColor] = useState("");
  const { categories, addCategory, updateCategory, deleteCategory } = useData();

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    await addCategory(newCategoryName.trim(), newCategoryColor);
    setIsAddDialogOpen(false);
    setNewCategoryName("");
    setNewCategoryColor(PRESET_COLORS[0]);
  };

  const handleEditCategory = async () => {
    if (!selectedCategory || !editCategoryName.trim()) return;
    
    await updateCategory(selectedCategory.id, editCategoryName.trim(), editCategoryColor);
    setIsEditDialogOpen(false);
    setSelectedCategory(null);
    setEditCategoryName("");
    setEditCategoryColor("");
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    
    await deleteCategory(selectedCategory.id);
    setIsDeleteDialogOpen(false);
    setSelectedCategory(null);
  };

  const openEditDialog = (category: any) => {
    setSelectedCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryColor(category.color);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (category: any) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };

  const handleDateRangeChange = (field: 'from' | 'to', date: Date | undefined) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: date
      }
    });
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter(id => id !== categoryId)
      : [...filters.categories, categoryId];
    
    onFiltersChange({
      ...filters,
      categories: newCategories
    });
  };

  const handleAmountRangeChange = (field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    onFiltersChange({
      ...filters,
      amountRange: {
        ...filters.amountRange,
        [field]: numValue
      }
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      searchTerm: value === '' ? undefined : value
    });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: {},
      categories: [],
      eventTypeIds: [],
      bookingIds: [],
      amountRange: {},
      searchTerm: undefined
    });
  };

  const hasActiveFilters = 
    filters.dateRange.from || 
    filters.dateRange.to || 
    filters.categories.length > 0 || 
    filters.amountRange.min !== undefined || 
    filters.amountRange.max !== undefined || 
    filters.searchTerm;

  return (
    <>
    <Card className="card-smooth rounded-3xl">
      <CardHeader
        className={cn(
          "px-6",
          isExpanded ? "py-4" : "py-3"
        )}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-responsive">
            <Filter className="w-5 h-5" />
            Advanced Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2">
                {filteredEntries} of {totalEntries}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="button-smooth gap-1"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="button-smooth"
            >
              {isExpanded ? <X className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="space-y-6 px-6 pb-6 pt-0">
          {/* Search */}
          <div className="space-y-2">
            <Label className="text-responsive">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search descriptions..."
                value={filters.searchTerm || ''}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-3">
            <Label className="text-responsive">Date Range</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start button-smooth"
                    >
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.dateRange.from ? format(filters.dateRange.from, "PPP") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 bg-background border shadow-lg rounded-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from}
                      onSelect={(date) => handleDateRangeChange('from', date)}
                      className="p-2"
                      classNames={{
                        months: "rounded-xl bg-card p-3",
                        caption: "relative flex items-center justify-center pb-2",
                        caption_label: "text-base font-semibold",
                        nav: "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1",
                        nav_button: "h-6 w-6 p-0 opacity-80 hover:opacity-100",
                        nav_button_previous: "",
                        nav_button_next: "",
                        table: "w-full",
                        head_row: "grid grid-cols-7",
                        head_cell: "text-muted-foreground text-xs text-center",
                        row: "grid grid-cols-7 w-full mt-2",
                        cell: "p-0 h-9",
                        day: "h-9 w-9 mx-auto rounded-md hover:bg-accent",
                        day_selected: "bg-primary text-primary-foreground",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start button-smooth"
                    >
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.dateRange.to ? format(filters.dateRange.to, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 bg-background border shadow-lg rounded-xl" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to}
                      onSelect={(date) => handleDateRangeChange('to', date)}
                      className="p-2"
                      classNames={{
                        months: "rounded-xl bg-card p-3",
                        caption: "relative flex items-center justify-center pb-2",
                        caption_label: "text-base font-semibold",
                        nav: "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1",
                        nav_button: "h-6 w-6 p-0 opacity-80 hover:opacity-100",
                        nav_button_previous: "",
                        nav_button_next: "",
                        table: "w-full",
                        head_row: "grid grid-cols-7",
                        head_cell: "text-muted-foreground text-xs text-center",
                        row: "grid grid-cols-7 w-full mt-2",
                        cell: "p-0 h-9",
                        day: "h-9 w-9 mx-auto rounded-md hover:bg-accent",
                        day_selected: "bg-primary text-primary-foreground",
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Amount Range */}
          <div className="space-y-3">
            <Label className="text-responsive">Amount Range ({currencySymbol})</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Minimum</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={filters.amountRange.min || ''}
                    onChange={(e) => handleAmountRangeChange('min', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Maximum</Label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="No limit"
                    step="0.01"
                    min="0"
                    value={filters.amountRange.max || ''}
                    onChange={(e) => handleAmountRangeChange('max', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

        </CardContent>
        </div>
      </div>
    </Card>

    {/* Add Category Dialog */}
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="add-category-name">Category Name</Label>
            <Input
              id="add-category-name"
              placeholder="e.g., Affiliate Sales"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    newCategoryColor === color ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewCategoryColor(color)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
            Add Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Edit Category Dialog */}
    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-category-name">Category Name</Label>
            <Input
              id="edit-category-name"
              value={editCategoryName}
              onChange={(e) => setEditCategoryName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    editCategoryColor === color ? 'border-primary scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setEditCategoryColor(color)}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleEditCategory} disabled={!editCategoryName.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Category Dialog */}
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete the category "{selectedCategory?.name}"?
          </p>
          <p className="text-sm text-destructive mt-2">
            This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteCategory}>
            Delete Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};