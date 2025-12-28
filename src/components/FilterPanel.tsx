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
import { 
  Filter, 
  Calendar as CalendarIcon, 
  PoundSterling, 
  Search, 
  X,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FilterCriteria, DEFAULT_REVENUE_CATEGORIES } from "@/types/categories";

interface FilterPanelProps {
  filters: FilterCriteria;
  onFiltersChange: (filters: FilterCriteria) => void;
  totalEntries: number;
  filteredEntries: number;
}

export const FilterPanel = ({ 
  filters, 
  onFiltersChange, 
  totalEntries, 
  filteredEntries 
}: FilterPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

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
            <Label className="text-responsive">Amount Range (£)</Label>
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

          {/* Categories */}
          <div className="space-y-3">
            <Label className="text-responsive">Categories</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DEFAULT_REVENUE_CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    id={category.id}
                    checked={filters.categories.includes(category.id)}
                    onCheckedChange={() => handleCategoryToggle(category.id)}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <Label 
                      htmlFor={category.id} 
                      className="text-sm cursor-pointer text-responsive"
                    >
                      {category.name}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        </div>
      </div>
    </Card>
  );
};